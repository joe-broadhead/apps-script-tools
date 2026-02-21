/**
 * @function runSqlQuery
 * @description Executes a SQL query on the specified data provider (`databricks` or `bigquery`). 
 *              Delegates query execution to the appropriate provider function and handles query 
 *              parameter replacements.
 * @param {Object} request - SQL request.
 * @param {String} request.provider - The data provider to execute the query on. Must be `"databricks"` or `"bigquery"`.
 * @param {String} request.sql - The SQL query to execute.
 * @param {Object} request.parameters - Connection parameters specific to the selected provider.
 * @param {Object} [request.placeholders={}] - Optional placeholders to replace in the query before execution.
 * @param {Object} [request.options={}] - Extra options.
 * @param {Number} [request.options.maxWaitMs=120000] - Maximum polling wait for providers that support it.
 * @param {Number} [request.options.pollIntervalMs=500] - Poll interval for providers that support it.
 * @returns {DataFrame} A DataFrame containing the query results.
 * 
 * @example
 * const request = {
 *   provider: 'databricks',
 *   sql: "SELECT * FROM users WHERE region = {{region}}",
 *   parameters: {
 *   host: 'databricks-instance.cloud.databricks.com',
 *   sqlWarehouseId: '12345',
 *   schema: 'sales',
 *   token: 'abcdef123456'
 *   },
 *   placeholders: { region: 'North' },
 *   options: { allowUnsafePlaceholders: true }
 * };
 * 
 * const dataFrame = runSqlQuery(request);
 * console.log(dataFrame);
 * 
 * @note
 * - Behavior:
 *   - Routes the query to the appropriate provider function based on the `provider` argument.
 *   - Supports parameterized queries via the `placeholders` argument.
 *   - Throws provider validation and execution errors.
 * - Time Complexity: O(n), where `n` is the number of rows in the result set.
 * - Space Complexity: O(n), as the entire result set is stored in memory as a DataFrame.
 * 
 * @see runDatabricksSql - Executes the query on Databricks.
 * @see runBigQuerySql - Executes the query on BigQuery.
 */
function runSqlQuery(request = {}) {
  const normalizedRequest = validateSqlRequest(request);
  const { provider, sql, parameters, placeholders, options } = normalizedRequest;

  switch (provider) {
    case 'databricks':
      return runDatabricksSql(sql, parameters, placeholders, options);
    case 'bigquery':
      return runBigQuerySql(sql, parameters, placeholders, options);
    default:
      throw new Error('Provider must be one of: databricks, bigquery');
  };
};
