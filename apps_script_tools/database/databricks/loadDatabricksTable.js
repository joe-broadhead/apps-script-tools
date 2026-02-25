/**
 * @function astLoadDatabricksTable
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
 * astLoadDatabricksTable({
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
 * @see astSqlLiteral - Converts data values to SQL-safe literals.
 */
function astBuildDatabricksLoadError(message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'DatabricksLoadError';
  error.provider = 'databricks';
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function astNormalizeDatabricksLoadConfig(config = {}) {
  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable requires a config object');
  }

  const {
    arrays,
    tableName,
    tableSchema,
    mode = 'insert',
    mergeKey = null,
    batchSize = 500,
    databricks_parameters = {},
    options = {}
  } = config;

  if (!Array.isArray(arrays) || arrays.length === 0 || !Array.isArray(arrays[0])) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable requires non-empty arrays with a header row');
  }

  const headers = arrays[0].map(header => String(header).trim());
  if (headers.length === 0) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable header row must include at least one column');
  }

  if (headers.some(header => header.length === 0)) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable header values must be non-empty strings');
  }

  const uniqueHeaders = new Set(headers);
  if (uniqueHeaders.size !== headers.length) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable header values must be unique');
  }

  const rows = arrays.slice(1);
  rows.forEach((row, rowIdx) => {
    if (!Array.isArray(row)) {
      throw astBuildDatabricksLoadError(`Data row at index ${rowIdx + 1} must be an array`);
    }

    if (row.length !== headers.length) {
      throw astBuildDatabricksLoadError(
        `Data row at index ${rowIdx + 1} has length ${row.length}, expected ${headers.length}`
      );
    }
  });

  if (typeof tableName !== 'string' || tableName.trim().length === 0) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable requires a non-empty tableName');
  }

  if (tableSchema == null || typeof tableSchema !== 'object' || Array.isArray(tableSchema)) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable requires a tableSchema object');
  }

  const schemaEntries = Object.entries(tableSchema);
  if (schemaEntries.length === 0) {
    throw astBuildDatabricksLoadError('astLoadDatabricksTable requires tableSchema with at least one column');
  }

  schemaEntries.forEach(([columnName, columnType]) => {
    if (typeof columnName !== 'string' || columnName.trim().length === 0) {
      throw astBuildDatabricksLoadError('tableSchema column names must be non-empty strings');
    }
    if (typeof columnType !== 'string' || columnType.trim().length === 0) {
      throw astBuildDatabricksLoadError(`tableSchema.${columnName} must be a non-empty string type`);
    }
  });

  const schemaColumnNames = Object.keys(tableSchema);
  const missingSchemaColumns = headers.filter(header => !schemaColumnNames.includes(header));
  if (missingSchemaColumns.length > 0) {
    throw astBuildDatabricksLoadError(
      `tableSchema is missing definitions for columns: ${missingSchemaColumns.join(', ')}`
    );
  }

  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw astBuildDatabricksLoadError('batchSize must be a positive integer');
  }

  const allowedModes = ['insert', 'overwrite', 'merge'];
  if (!allowedModes.includes(mode)) {
    throw astBuildDatabricksLoadError(`Unsupported mode: ${mode}`);
  }

  if (databricks_parameters == null || typeof databricks_parameters !== 'object' || Array.isArray(databricks_parameters)) {
    throw astBuildDatabricksLoadError('databricks_parameters must be an object');
  }

  const requiredDatabricksFields = ['host', 'sqlWarehouseId', 'schema', 'token'];
  const missingDatabricksFields = requiredDatabricksFields.filter(field => {
    const value = databricks_parameters[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingDatabricksFields.length > 0) {
    throw astBuildDatabricksLoadError(
      `Missing required Databricks parameters: ${missingDatabricksFields.join(', ')}`
    );
  }

  if (options == null || typeof options !== 'object' || Array.isArray(options)) {
    throw astBuildDatabricksLoadError('options must be an object when provided');
  }

  const maxWaitMs = options.maxWaitMs;
  const pollIntervalMs = options.pollIntervalMs;

  if (maxWaitMs != null && (!Number.isInteger(maxWaitMs) || maxWaitMs < 1)) {
    throw astBuildDatabricksLoadError('options.maxWaitMs must be a positive integer when provided');
  }

  if (pollIntervalMs != null && (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1)) {
    throw astBuildDatabricksLoadError('options.pollIntervalMs must be a positive integer when provided');
  }

  if (
    Number.isInteger(maxWaitMs) &&
    Number.isInteger(pollIntervalMs) &&
    pollIntervalMs > maxWaitMs
  ) {
    throw astBuildDatabricksLoadError('options.pollIntervalMs cannot be greater than options.maxWaitMs');
  }

  const normalizedMergeKey = typeof mergeKey === 'string' ? mergeKey.trim() : mergeKey;

  if (mode === 'merge') {
    if (typeof normalizedMergeKey !== 'string' || normalizedMergeKey.length === 0) {
      throw astBuildDatabricksLoadError('mergeKey is required for merge mode');
    }

    if (!headers.includes(normalizedMergeKey)) {
      throw astBuildDatabricksLoadError(`mergeKey '${normalizedMergeKey}' must exist in header columns`);
    }
  }

  return {
    arrays,
    headers,
    rows,
    tableName: tableName.trim(),
    tableSchema,
    mode,
    mergeKey: normalizedMergeKey,
    batchSize,
    databricks_parameters,
    options
  };
}

function astExecuteDatabricksLoadStatement(sql, databricks_parameters, options, details = {}) {
  try {
    return astRunDatabricksSql(sql, databricks_parameters, {}, options);
  } catch (error) {
    if (error && error.name === 'DatabricksLoadError') {
      throw error;
    }

    throw astBuildDatabricksLoadError(
      `Databricks load failed during ${details.phase || 'statement execution'}`,
      details,
      error
    );
  }
}

function astLoadDatabricksTable(config) {
  const normalizedConfig = astNormalizeDatabricksLoadConfig(config);

  const {
    headers,
    rows,
    tableName,
    tableSchema,
    mode,
    mergeKey,
    batchSize,
    databricks_parameters,
    options
  } = normalizedConfig;

  const defs = (
    Object.entries(tableSchema)
    .map(([col, type]) => `  ${col} ${type}`)
    .concat('last_updated_at TIMESTAMP')
    .join(',')
  );

  astExecuteDatabricksLoadStatement(`
    create table if not exists ${tableName} (
      ${defs}
    )`,
    databricks_parameters,
    options,
    { phase: 'create table', tableName, mode }
  );

  const colList = headers.join(', ');
  const chunks = arrayChunk(rows, batchSize);

  if(mode === 'overwrite') {
    astExecuteDatabricksLoadStatement(
      `truncate table ${tableName}`,
      databricks_parameters,
      options,
      { phase: 'truncate', tableName, mode }
    );
  };

  chunks.forEach((chunkRows, chunkIndex) => {
    const vals = (
      chunkRows
      .map(row => `(${row.map(astSqlLiteral).join(', ')})`)
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
        if (!mergeKey) throw astBuildDatabricksLoadError('mergeKey is required for merge mode');
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
        throw astBuildDatabricksLoadError(`Unsupported mode: ${mode}`);
    }

    astExecuteDatabricksLoadStatement(
      sql,
      databricks_parameters,
      options,
      { phase: `write_${mode}`, tableName, mode, chunkIndex }
    );
  });

};

/**
 * @function astSqlLiteral
 * @description Converts a given value to a SQL-safe literal. Handles `NULL`, booleans, numbers, dates, 
 *              and strings, escaping single quotes in strings and formatting dates in `"yyyy-MM-dd"` format.
 * @param {*} value - The value to be converted to a SQL-safe literal.
 * @returns {String} The SQL-safe representation of the value as a string.
 * 
 * @example
 * console.log(astSqlLiteral(null));      // Outputs: 'NULL'
 * console.log(astSqlLiteral(true));      // Outputs: 'true'
 * console.log(astSqlLiteral(123));       // Outputs: '123'
 * console.log(astSqlLiteral(new Date("2025-01-01"))); // Outputs: '2025-01-01'
 * console.log(astSqlLiteral("O'Reilly")); // Outputs: `'O''Reilly'`
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
function astSqlLiteral(value) {
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
