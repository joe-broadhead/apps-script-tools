/**
 * @function runBigQuerySql
 * @description Executes a SQL query in BigQuery and returns the results as a DataFrame. Handles pagination 
 *              for large result sets and supports query parameter placeholders.
 * @param {String} query - The SQL query to execute.
 * @param {Object} parameters - BigQuery connection parameters.
 * @param {String} parameters.projectId - The GCP project ID where the query will be executed.
 * @param {Object} [placeholders={}] - Optional placeholders to replace in the query before execution.
 * @param {Object} [options={}] - Optional polling controls.
 * @param {Number} [options.maxWaitMs=120000] - Maximum wait time while polling for query completion.
 * @param {Number} [options.pollIntervalMs=500] - Poll interval while waiting for query completion.
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
 *   - Waits for the query job to complete with bounded polling.
 * - Time Complexity: O(n), where `n` is the number of rows in the result set.
 * - Space Complexity: O(n), as all rows are stored in memory as records before being converted to a DataFrame.
 */
function buildBigQuerySqlError(message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'BigQuerySqlError';
  error.provider = 'bigquery';
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function normalizeBigQueryQueryOptions(options = {}) {
  const raw = options && typeof options === 'object' ? options : {};

  const maxWaitMs = Number.isInteger(raw.maxWaitMs) && raw.maxWaitMs > 0
    ? raw.maxWaitMs
    : 120000;

  const pollIntervalMs = Number.isInteger(raw.pollIntervalMs) && raw.pollIntervalMs > 0
    ? raw.pollIntervalMs
    : 500;

  if (pollIntervalMs > maxWaitMs) {
    throw buildBigQuerySqlError('options.pollIntervalMs cannot be greater than options.maxWaitMs', {
      options: raw
    });
  }

  return {
    maxWaitMs,
    pollIntervalMs
  };
}

function runBigQuerySql(query, parameters, placeholders = {}, options = {}) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw buildBigQuerySqlError('BigQuery SQL query must be a non-empty string');
  }

  if (parameters == null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw buildBigQuerySqlError('BigQuery parameters must be an object');
  }

  const { projectId } = parameters;
  if (typeof projectId !== 'string' || projectId.trim().length === 0) {
    throw buildBigQuerySqlError('BigQuery parameters.projectId must be a non-empty string');
  }

  const normalizedOptions = normalizeBigQueryQueryOptions(options);

  const request = {
    query: replacePlaceHoldersInQuery(query, placeholders),
    useLegacySql: false
  };

  try {
    let queryResults = BigQuery.Jobs.query(request, projectId);
    const jobReference = queryResults && queryResults.jobReference ? queryResults.jobReference : {};
    const { jobId } = jobReference;

    if (typeof jobId !== 'string' || jobId.trim().length === 0) {
      throw buildBigQuerySqlError('BigQuery query response did not include a valid jobId', {
        response: queryResults
      });
    }

    const pollStartedAt = Date.now();
    let pollCount = 0;
    while (!queryResults.jobComplete) {
      const elapsedMs = Date.now() - pollStartedAt;
      const remainingMs = normalizedOptions.maxWaitMs - elapsedMs;

      if (remainingMs <= 0) {
        throw buildBigQuerySqlError(
          `BigQuery query timed out after ${normalizedOptions.maxWaitMs}ms`,
          {
            jobId,
            pollCount,
            elapsedMs,
            maxWaitMs: normalizedOptions.maxWaitMs,
            pollIntervalMs: normalizedOptions.pollIntervalMs
          }
        );
      }

      Utilities.sleep(Math.min(normalizedOptions.pollIntervalMs, remainingMs));
      pollCount += 1;
      queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId);
    }

    const schemaFields = queryResults && queryResults.schema && Array.isArray(queryResults.schema.fields)
      ? queryResults.schema.fields
      : [];

    const headers = schemaFields.map(field => field.name);
    const rows = Array.isArray(queryResults.rows) ? [...queryResults.rows] : [];

    while (queryResults.pageToken) {
      queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId, {
        pageToken: queryResults.pageToken
      });

      if (Array.isArray(queryResults.rows) && queryResults.rows.length > 0) {
        rows.push(...queryResults.rows);
      }
    }

    if (rows.length === 0) {
      const emptyFrame = headers.reduce((acc, header) => {
        acc[header] = new Series([], header);
        return acc;
      }, {});
      return new DataFrame(emptyFrame);
    }

    const records = rows.map(row => {
      return row.f.reduce((record, col, index) => {
        record[headers[index]] = col.v;
        return record;
      }, {});
    });

    return DataFrame.fromRecords(records);
  } catch (error) {
    if (error && error.name === 'BigQuerySqlError') {
      throw error;
    }

    throw buildBigQuerySqlError(
      'BigQuery SQL execution failed',
      { projectId },
      error
    );
  }
}
