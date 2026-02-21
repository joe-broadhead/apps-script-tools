/**
 * @function loadDatabricksTable
 * @description Loads data into a Databricks table using specified modes (`insert`, `overwrite`, `merge`). 
 *              Creates the table if it does not exist, appends a `last_updated_at` column, and processes data 
 *              in batches to handle large datasets efficiently.
 * @param {Object} config - Configuration object for the table load.
 * @param {Array<Array<any>>} config.arrays - 2D array where the first row contains column headers and subsequent rows contain data.
 * @param {String} config.tableName - The name of the Databricks table.
 * @param {Object} config.tableSchema - The schema of the table as a key-value pair of column names and data types.
 * @param {String} [config.mode='insert'] - The mode of the operation. Can be `"insert"`, `"overwrite"`, or `"merge"`.
 * @param {String} [config.mergeKey=null] - The key column to use for `merge` mode. Required if `mode` is `"merge"`.
 * @param {Number} [config.batchSize=500] - The number of rows to process per batch.
 * @param {Object} config.databricks_parameters - Connection parameters for Databricks SQL execution.
 * @param {Object} [config.options={}] - SQL polling controls forwarded to Databricks statements.
 * @param {Number} [config.options.maxWaitMs=120000] - Maximum wait time while polling Databricks statements.
 * @param {Number} [config.options.pollIntervalMs=500] - Poll interval while Databricks statements are pending/running.
 * 
 * @returns {void}
 * 
 * @example
 * // Example data
 * const data = [
 *   ["id", "name", "amount"],
 *   [1, "Alice", 100],
 *   [2, "Bob", 200]
 * ];
 * 
 * const tableSchema = {
 *   id: "INT",
 *   name: "STRING",
 *   amount: "FLOAT"
 * };
 * 
 * loadDatabricksTable({
 *   arrays: data,
 *   tableName: "sales_data",
 *   tableSchema: tableSchema,
 *   mode: "insert",
 *   databricks_parameters: { ... }
 * });
 * 
 * @note
 * - Behavior:
 *   - `"insert"` mode appends data to the table.
 *   - `"overwrite"` mode truncates the table before inserting data.
 *   - `"merge"` mode updates existing rows based on the `mergeKey` and inserts new rows.
 *   - All modes add a `last_updated_at` column to track the update timestamp.
 * - Time Complexity: O(n), where `n` is the number of rows.
 * - Space Complexity: O(batchSize), as data is processed in chunks.
 * 
 * @see sqlLiteral - Converts data values to SQL-safe literals.
 */
function loadDatabricksTable(config) {
  const {
    arrays,
    tableName,
    tableSchema,
    mode = 'insert',
    mergeKey,
    batchSize = 500,
    databricks_parameters,
    options = {}
  } = config;

  const headers = arrays[0].map(h => String(h).trim());
  const rows = arrays.slice(1);

  const defs = (
    Object.entries(tableSchema)
    .map(([col, type]) => `  ${col} ${type}`)
    .concat('last_updated_at TIMESTAMP')
    .join(',')
  );

  runDatabricksSql(`
    create table if not exists ${tableName} (
      ${defs}
    )`,
    databricks_parameters,
    {},
    options
  );

  const colList = headers.join(', ');
  const chunks = arrayChunk(rows, batchSize);

  if(mode === 'overwrite') {
    runDatabricksSql(`truncate table ${tableName}`, databricks_parameters, {}, options);
  };

  chunks.forEach(chunkRows => {
    const vals = (
      chunkRows
      .map(row => `(${row.map(sqlLiteral).join(', ')})`)
      .join(',')
    );

    let sql;

    switch (mode) {
      case 'insert':
        sql = `
        insert into ${tableName} (${colList}, last_updated_at)
        values
        ${vals.split(')').join(', current_timestamp())')};`;
        break;

      case 'overwrite':
        sql = `
        insert into ${tableName} (${colList}, last_updated_at)
        values
        ${vals.split(')').join(', current_timestamp())')};`;
        break;

      case 'merge':
        if (!mergeKey) throw new Error('mergeKey is required for merge mode');
        const colAliases = (
          headers
          .map((h, i) => `col${i+1} AS ${h}`)
          .join(',')
        );

        const updateSet = (
          headers
          .filter(h => h !== mergeKey)
          .map(h => `target.${h} = source.${h}`)
          .concat(`target.last_updated_at = current_timestamp()`)
          .join(', ')
        );

        const updatedHeaders = [...headers, 'last_updated_at'];
        const updatedColList = updatedHeaders.join(', ');

        sql = `
        merge into ${tableName} as target
        using (
          select
            ${colAliases}
          from values
            ${vals}
        ) AS source
        on target.${mergeKey} = source.${mergeKey}
        when matched then
          update set ${updateSet}
        when not matched then
          insert (${updatedColList})
          values (${headers.map(h => 'source.' + h).join(', ')}, current_timestamp());
        `;
        break;

      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }

    runDatabricksSql(sql, databricks_parameters, {}, options);
  });

};

/**
 * @function sqlLiteral
 * @description Converts a given value to a SQL-safe literal. Handles `NULL`, booleans, numbers, dates, 
 *              and strings, escaping single quotes in strings and formatting dates in `"yyyy-MM-dd"` format.
 * @param {*} value - The value to be converted to a SQL-safe literal.
 * @returns {String} The SQL-safe representation of the value as a string.
 * 
 * @example
 * console.log(sqlLiteral(null));      // Outputs: 'NULL'
 * console.log(sqlLiteral(true));      // Outputs: 'true'
 * console.log(sqlLiteral(123));       // Outputs: '123'
 * console.log(sqlLiteral(new Date("2025-01-01"))); // Outputs: '2025-01-01'
 * console.log(sqlLiteral("O'Reilly")); // Outputs: `'O''Reilly'`
 * 
 * @note
 * - Behavior:
 *   - Converts empty strings and `null` values to `'NULL'`.
 *   - Boolean and numeric values are returned as strings.
 *   - Date objects are formatted as `'yyyy-MM-dd'`.
 *   - String values are escaped to handle single quotes.
 * - Time Complexity: O(n), where `n` is the length of the string (for escaping).
 * - Space Complexity: O(n), as a new string is created for the SQL-safe representation.
 */
function sqlLiteral(value) {
  switch (true) {
    case value === '' || value == null:
      return 'NULL';
    case typeof value === 'boolean' || typeof value === 'number':
      return String(value);
    case value instanceof Date:
      const iso = Utilities.formatDate(value, 'UTC', 'yyyy-MM-dd');
      return `'${iso}'`;
    default:
      const escaped = String(value).replace(/'/g, "''");
      return `'${escaped}'`;
  };
};
