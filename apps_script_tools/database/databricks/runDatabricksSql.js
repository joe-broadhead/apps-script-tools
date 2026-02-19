/**
 * @function runDatabricksSql
 * @description Executes a SQL query on Databricks using the provided connection parameters and returns the 
 *              resulting data as a concatenated DataFrame. Handles large datasets by fetching data in chunks.
 * @param {String} query - The SQL query to execute.
 * @param {Object} parameters - Databricks connection parameters.
 * @param {String} parameters.host - The Databricks host URL.
 * @param {String} parameters.sqlWarehouseId - The ID of the SQL warehouse.
 * @param {String} parameters.schema - The target schema for the query.
 * @param {String} parameters.token - The access token for authentication.
 * @param {Object} [placeholders={}] - Optional placeholders to replace in the query before execution.
 * @returns {DataFrame} A DataFrame containing the query results.
 * 
 * @example
 * const params = {
 *   host: 'databricks-instance.cloud.databricks.com',
 *   sqlWarehouseId: '1234567890',
 *   schema: 'sales',
 *   token: 'abcdef123456'
 * };
 * 
 * const query = "SELECT * FROM sales_data WHERE region = :region";
 * const placeholders = { region: 'North' };
 * 
 * const result = runDatabricksSql(query, params, placeholders);
 * console.log(result);
 * 
 * @note
 * - Behavior:
 *   - Executes the query using the Databricks SQL API.
 *   - Fetches data in chunks and concatenates them into a single DataFrame.
 *   - Throws provider-specific errors when execution fails.
 *   - Implements a retry mechanism for pending or running queries with a 5-second interval.
 * - Time Complexity: O(n), where `n` is the number of chunks fetched.
 * - Space Complexity: O(n), as the entire dataset is stored in memory as a DataFrame.
 * 
 * @see fetchStatementStatus - Fetches the status of a running query.
 * @see downloadAllChunks - Downloads all result chunks and concatenates them.
 */
function buildDatabricksSqlError(message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'DatabricksSqlError';
  error.provider = 'databricks';
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function runDatabricksSql(query, parameters, placeholders = {}) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw buildDatabricksSqlError('Databricks SQL query must be a non-empty string');
  }

  if (parameters == null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw buildDatabricksSqlError('Databricks parameters must be an object');
  }

  const { host, sqlWarehouseId, schema, token } = parameters;
  const missingFields = [
    ['host', host],
    ['sqlWarehouseId', sqlWarehouseId],
    ['schema', schema],
    ['token', token]
  ]
    .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw buildDatabricksSqlError(
      `Missing required Databricks parameters: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }

  const apiBaseUrl = `https://${host}/api/2.0/sql/statements/`;

  try {
    const response = UrlFetchApp.fetch(apiBaseUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      payload: JSON.stringify({
        warehouse_id: sqlWarehouseId,
        schema: schema,
        statement: replacePlaceHoldersInQuery(query, placeholders),
        disposition: 'EXTERNAL_LINKS',
        format: 'JSON_ARRAY'
      })
    });
    
    const responseData = JSON.parse(response.getContentText());
    const statementId = responseData?.statement_id;

    if (!statementId) {
      throw buildDatabricksSqlError(
        'Databricks SQL API response did not include statement_id',
        { response: responseData }
      );
    }

    while (true) {
      const resultData = fetchStatementStatus(apiBaseUrl, statementId, token);
      const state = resultData?.status?.state;

      switch (state) {
        case 'SUCCEEDED':
          return downloadAllChunks(resultData, host, token);
        case 'FAILED':
        case 'CANCELED':
        case 'CLOSED':
          throw buildDatabricksSqlError(
            `Databricks SQL statement ${String(state).toLowerCase()}`,
            { state, error: resultData?.status?.error, statementId }
          );
        case 'PENDING':
        case 'RUNNING':
          Utilities.sleep(5000);
          break;
        default:
          throw buildDatabricksSqlError(
            `Unknown Databricks SQL statement state: ${state}`,
            { state, statementId, status: resultData?.status }
          );
      }
    }

  } catch (error) {
    if (error && error.name === 'DatabricksSqlError') {
      throw error;
    }

    throw buildDatabricksSqlError(
      'Databricks SQL execution failed',
      { host, sqlWarehouseId, schema },
      error
    );
  }
};

/**
 * @function fetchStatementStatus
 * @description Retrieves the status of a Databricks SQL statement using the statement ID. Used to check the 
 *              current state of a query (e.g., `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`).
 * @param {String} apiBaseUrl - The base URL for the Databricks SQL API (e.g., `https://<host>/api/2.0/sql/statements/`).
 * @param {String} statementId - The unique identifier of the SQL statement.
 * @param {String} token - The Databricks access token for authentication.
 * @returns {Object} An object representing the current status of the SQL statement, including the state 
 *                   and any error information if the query has failed.
 * 
 * @example
 * const apiBaseUrl = 'https://databricks-instance.cloud.databricks.com/api/2.0/sql/statements/';
 * const statementId = '1234567890';
 * const token = 'abcdef123456';
 * 
 * const status = fetchStatementStatus(apiBaseUrl, statementId, token);
 * console.log(status);
 * 
 * // Output:
 * // {
 * //   status: {
 * //     state: "SUCCEEDED",
 * //     error: null
 * //   },
 * //   result: { ... }
 * // }
 * 
 * @note
 * - Behavior:
 *   - Performs a GET request to the specified Databricks endpoint.
 *   - Returns the query status as an object with `state` and `error` fields.
 * - Time Complexity: O(1), as a single API request is made.
 * - Space Complexity: O(1), as the response is parsed and returned as an object.
 */
function fetchStatementStatus(apiBaseUrl, statementId, token) {
  const response = UrlFetchApp.fetch(`${apiBaseUrl}${statementId}`, {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return JSON.parse(response.getContentText());
};

/**
 * @function fetchChunk
 * @description Fetches a data chunk from a specified Databricks endpoint. This function is used to retrieve 
 *              portions of query results when the data is too large to be returned in a single response.
 * @param {String} chunkLink - The relative link to the data chunk as provided in the query result manifest.
 * @param {String} host - The Databricks host URL (e.g., `databricks-instance.cloud.databricks.com`).
 * @param {String} token - The Databricks access token for authentication.
 * @returns {Object} The data chunk as a parsed JSON object.
 * 
 * @example
 * const host = 'databricks-instance.cloud.databricks.com';
 * const token = 'abcdef123456';
 * const chunkLink = '/api/2.0/sql/chunks/12345';
 * 
 * const chunkData = fetchChunk(chunkLink, host, token);
 * console.log(chunkData);
 * 
 * @note
 * - Behavior:
 *   - Performs a GET request to the specified chunk link.
 *   - Returns the chunk data as a parsed JSON object.
 *   - If the chunk link is invalid or the request fails, an error is thrown.
 * - Time Complexity: O(1), as a single request is made.
 * - Space Complexity: O(c), where `c` is the size of the data chunk returned.
 */
function fetchChunk(chunkLink, host, token) {
  const chunkUrl = `https://${host}${chunkLink}`;
  const chunkOptions = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  const chunkResponse = UrlFetchApp.fetch(chunkUrl, chunkOptions);
  return JSON.parse(chunkResponse.getContentText());
};

/**
 * @function downloadAllChunks
 * @description Downloads all data chunks from a Databricks query result and concatenates them into a single 
 *              DataFrame. Handles large datasets by fetching data in multiple chunks and merging them sequentially.
 * @param {Object} results - The initial query result object containing the manifest and first chunk information.
 * @param {String} host - The Databricks host URL (e.g., `databricks-instance.cloud.databricks.com`).
 * @param {String} token - The Databricks access token for authentication.
 * @returns {DataFrame} A DataFrame containing all the fetched data.
 * 
 * @example
 * const host = 'databricks-instance.cloud.databricks.com';
 * const token = 'abcdef123456';
 * const results = {
 *   manifest: {
 *     total_byte_count: 1024,
 *     schema: {
 *       columns: [{ name: "id" }, { name: "name" }]
 *     }
 *   },
 *   result: {
 *     external_links: [
 *       { external_link: "/api/2.0/sql/chunks/123", next_chunk_internal_link: "/api/2.0/sql/chunks/124" }
 *     ]
 *   }
 * };
 * 
 * const dataFrame = downloadAllChunks(results, host, token);
 * console.log(dataFrame);
 * 
 * @note
 * - Behavior:
 *   - Fetches the first chunk using the external link.
 *   - Iteratively fetches subsequent chunks using internal links until no more chunks are available.
 *   - Each chunk's data is transformed into a DataFrame and concatenated into a single DataFrame.
 * - Time Complexity: O(n), where `n` is the number of chunks.
 * - Space Complexity: O(n), as all fetched chunks are stored in memory before being concatenated.
 * 
 * @see fetchChunk - Fetches individual chunks of data.
 */
function downloadAllChunks(results, host, token) {
  const { manifest, result } = results;
  const columns = manifest.schema.columns.map(col => col.name);

  if (manifest.total_byte_count === 0) {
    const emptyColumns = columns.reduce((acc, column) => {
      acc[column] = [];
      return acc;
    }, {});
    return DataFrame.fromColumns(emptyColumns, { copy: false });
  }

  const firstResult = result.external_links[0];

  let nextChunkInternalLink = firstResult?.next_chunk_internal_link || null;
  let nextChunkExternalLink = firstResult?.external_link || null;

  const dataframes = [];

  if (nextChunkExternalLink) {
    const baseDataFrame = JSON.parse(UrlFetchApp.fetch(nextChunkExternalLink).getContentText());
    baseDataFrame.unshift(columns);
    dataframes.push(DataFrame.fromArrays(baseDataFrame));
  };

  while (nextChunkInternalLink) {
    const currentChunk = fetchChunk(nextChunkInternalLink, host, token);
    nextChunkInternalLink = currentChunk.external_links[0]?.next_chunk_internal_link || null;
    nextChunkExternalLink = currentChunk.external_links[0]?.external_link || null;

    if (nextChunkExternalLink) {
      const nextDataFrame = JSON.parse(UrlFetchApp.fetch(nextChunkExternalLink).getContentText());
      nextDataFrame.unshift(columns);
      dataframes.push(DataFrame.fromArrays(nextDataFrame));
    };
  };

  return DataFrame.concat(dataframes);
};
