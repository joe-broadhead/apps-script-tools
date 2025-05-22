/**
 * @function runBigQuerySql
 * @description Executes a SQL query in BigQuery and returns the results as a DataFrame. Handles pagination 
 *              for large result sets and supports query parameter placeholders.
 * @param {String} query - The SQL query to execute.
 * @param {Object} parameters - BigQuery connection parameters.
 * @param {String} parameters.projectId - The GCP project ID where the query will be executed.
 * @param {Object} [placeholders={}] - Optional placeholders to replace in the query before execution.
 * @returns {DataFrame} A DataFrame containing the query results. If no rows are returned, a DataFrame 
 *                      with only column headers is returned.
 * 
 * @example
 * const parameters = {
 *   projectId: 'my-gcp-project'
 * };
 * 
 * const query = "SELECT id, name FROM dataset.users WHERE region = @region";
 * const placeholders = { region: 'North' };
 * 
 * const dataFrame = runBigQuerySql(query, parameters, placeholders);
 * console.log(dataFrame);
 * 
 * @note
 * - Behavior:
 *   - Replaces placeholders in the query before execution.
 *   - Handles pagination for large result sets using the `pageToken`.
 *   - Waits for the query job to complete with exponential backoff.
 * - Time Complexity: O(n), where `n` is the number of rows in the result set.
 * - Space Complexity: O(n), as all rows are stored in memory as records before being converted to a DataFrame.
 */
function runBigQuerySql(query, parameters, placeholders = {}) {
    
  const { projectId } = parameters;
  
  const request = {
    query: replacePlaceHoldersInQuery(query, placeholders),
    useLegacySql: false
  };

  let queryResults = BigQuery.Jobs.query(request, projectId);
  const { jobId } = queryResults.jobReference;

  let sleepTimeMs = 500;
  while (!queryResults.jobComplete) {
    Utilities.sleep(sleepTimeMs);
    sleepTimeMs *= 2;
    queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId);
  };

  let rows = queryResults.rows;
  while (queryResults.pageToken) {
    queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId, {
      pageToken: queryResults.pageToken
    });
    rows = [...rows, ...queryResults.rows];
  };

  const headers = queryResults.schema.fields.map(field => field.name);

  if (!rows) {
    Logger.log('No rows returned.');
    return [headers];
  };

  const records = rows.map(row => {
    return row.f.reduce((record, col, index) => {
      record[headers[index]] = col.v;
      return record;
    }, {});
  });

  return DataFrame.fromRecords(records);
};
