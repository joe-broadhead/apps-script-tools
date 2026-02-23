/**
 * @function runDatabricksSql
 * @description Executes SQL on Databricks and returns a DataFrame.
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

function normalizeDatabricksSqlOptions(options = {}) {
  const raw = options && typeof options === 'object' && !Array.isArray(options) ? options : {};

  const maxWaitMs = Number.isInteger(raw.maxWaitMs) && raw.maxWaitMs > 0
    ? raw.maxWaitMs
    : 120000;

  const pollIntervalMs = Number.isInteger(raw.pollIntervalMs) && raw.pollIntervalMs > 0
    ? raw.pollIntervalMs
    : 500;

  if (pollIntervalMs > maxWaitMs) {
    throw buildDatabricksSqlError('options.pollIntervalMs cannot be greater than options.maxWaitMs', {
      options: raw
    });
  }

  return {
    maxWaitMs,
    pollIntervalMs
  };
}

function astNormalizeDatabricksHost(rawHost) {
  const host = typeof rawHost === 'string' ? rawHost.trim() : '';
  return host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function astAssertDatabricksExecutionParameters(parameters, mode = 'execute') {
  if (parameters == null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw buildDatabricksSqlError('Databricks parameters must be an object');
  }

  const host = astNormalizeDatabricksHost(parameters.host);
  const token = typeof parameters.token === 'string' ? parameters.token.trim() : '';
  const sqlWarehouseId = typeof parameters.sqlWarehouseId === 'string' ? parameters.sqlWarehouseId.trim() : '';
  const schema = typeof parameters.schema === 'string' ? parameters.schema.trim() : '';

  if (mode === 'execute') {
    const missing = [];
    if (!host) missing.push('host');
    if (!sqlWarehouseId) missing.push('sqlWarehouseId');
    if (!schema) missing.push('schema');
    if (!token) missing.push('token');

    if (missing.length > 0) {
      throw buildDatabricksSqlError(
        `Missing required Databricks parameters: ${missing.join(', ')}`,
        { missingFields: missing }
      );
    }
  } else if (!host || !token) {
    throw buildDatabricksSqlError('Databricks parameters require non-empty host and token');
  }

  return {
    host,
    token,
    sqlWarehouseId,
    schema
  };
}

function astDatabricksBuildStatementsApiBase(host) {
  return `https://${host}/api/2.0/sql/statements/`;
}

function astDatabricksGetHttpStatus(response) {
  if (!response || typeof response.getResponseCode !== 'function') {
    return 200;
  }

  const statusCode = Number(response.getResponseCode());
  return Number.isFinite(statusCode) ? statusCode : 200;
}

function astDatabricksParseResponseBody(response) {
  if (!response || typeof response.getContentText !== 'function') {
    return null;
  }

  const responseBody = response.getContentText();
  if (typeof responseBody !== 'string' || responseBody.trim() === '') {
    return null;
  }

  try {
    return JSON.parse(responseBody);
  } catch (_error) {
    return responseBody;
  }
}

function astDatabricksSubmitStatement(apiBaseUrl, token, payload) {
  const response = UrlFetchApp.fetch(apiBaseUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${token}`
    },
    payload: JSON.stringify(payload)
  });

  return JSON.parse(response.getContentText());
}

function executeDatabricksSqlDetailed(query, parameters, placeholders = {}, options = {}) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw buildDatabricksSqlError('Databricks SQL query must be a non-empty string');
  }

  const normalizedParameters = astAssertDatabricksExecutionParameters(parameters, 'execute');
  const normalizedOptions = normalizeDatabricksSqlOptions(options);
  const apiBaseUrl = astDatabricksBuildStatementsApiBase(normalizedParameters.host);

  try {
    const submitPayload = {
      warehouse_id: normalizedParameters.sqlWarehouseId,
      schema: normalizedParameters.schema,
      statement: replacePlaceHoldersInQuery(query, placeholders),
      disposition: 'EXTERNAL_LINKS',
      format: 'JSON_ARRAY'
    };

    const responseData = astDatabricksSubmitStatement(
      apiBaseUrl,
      normalizedParameters.token,
      submitPayload
    );

    const statementId = responseData && responseData.statement_id ? String(responseData.statement_id) : '';
    if (!statementId) {
      throw buildDatabricksSqlError(
        'Databricks SQL API response did not include statement_id',
        { response: responseData }
      );
    }

    const pollStartedAt = Date.now();
    let pollCount = 0;

    while (true) {
      const resultData = fetchStatementStatus(apiBaseUrl, statementId, normalizedParameters.token);
      const state = resultData && resultData.status && resultData.status.state;

      switch (state) {
        case 'SUCCEEDED': {
          const elapsedMs = Date.now() - pollStartedAt;
          return {
            dataFrame: downloadAllChunks(resultData, normalizedParameters.host, normalizedParameters.token),
            execution: {
              provider: 'databricks',
              executionId: statementId,
              statementId,
              state: 'SUCCEEDED',
              complete: true,
              pollCount,
              elapsedMs,
              maxWaitMs: normalizedOptions.maxWaitMs,
              pollIntervalMs: normalizedOptions.pollIntervalMs
            }
          };
        }
        case 'FAILED':
        case 'CANCELED':
        case 'CLOSED':
          throw buildDatabricksSqlError(
            `Databricks SQL statement ${String(state).toLowerCase()}`,
            { state, error: resultData && resultData.status ? resultData.status.error : null, statementId }
          );
        case 'PENDING':
        case 'RUNNING': {
          const elapsedMs = Date.now() - pollStartedAt;
          const remainingMs = normalizedOptions.maxWaitMs - elapsedMs;

          if (remainingMs <= 0) {
            throw buildDatabricksSqlError(
              `Databricks SQL query timed out after ${normalizedOptions.maxWaitMs}ms`,
              {
                state,
                statementId,
                pollCount,
                elapsedMs,
                maxWaitMs: normalizedOptions.maxWaitMs,
                pollIntervalMs: normalizedOptions.pollIntervalMs
              }
            );
          }

          Utilities.sleep(Math.min(normalizedOptions.pollIntervalMs, remainingMs));
          pollCount += 1;
          break;
        }
        default:
          throw buildDatabricksSqlError(
            `Unknown Databricks SQL statement state: ${state}`,
            { state, statementId, status: resultData ? resultData.status : null }
          );
      }
    }
  } catch (error) {
    if (error && error.name === 'DatabricksSqlError') {
      throw error;
    }

    throw buildDatabricksSqlError(
      'Databricks SQL execution failed',
      {
        host: normalizedParameters.host,
        sqlWarehouseId: normalizedParameters.sqlWarehouseId,
        schema: normalizedParameters.schema
      },
      error
    );
  }
}

function runDatabricksSql(query, parameters, placeholders = {}, options = {}) {
  return executeDatabricksSqlDetailed(query, parameters, placeholders, options).dataFrame;
}

function getDatabricksSqlStatus(parameters, statementId) {
  const normalizedParameters = astAssertDatabricksExecutionParameters(parameters, 'control');
  const normalizedStatementId = typeof statementId === 'string' ? statementId.trim() : '';

  if (!normalizedStatementId) {
    throw buildDatabricksSqlError('Databricks status requires a non-empty statementId');
  }

  try {
    const apiBaseUrl = astDatabricksBuildStatementsApiBase(normalizedParameters.host);
    const resultData = fetchStatementStatus(apiBaseUrl, normalizedStatementId, normalizedParameters.token);
    const state = resultData && resultData.status && resultData.status.state
      ? String(resultData.status.state)
      : 'UNKNOWN';
    const completeStates = ['SUCCEEDED', 'FAILED', 'CANCELED', 'CLOSED'];

    return {
      provider: 'databricks',
      executionId: normalizedStatementId,
      statementId: normalizedStatementId,
      state,
      complete: completeStates.includes(state),
      error: resultData && resultData.status ? resultData.status.error || null : null
    };
  } catch (error) {
    if (error && error.name === 'DatabricksSqlError') {
      throw error;
    }

    throw buildDatabricksSqlError(
      'Databricks status lookup failed',
      { host: normalizedParameters.host, statementId: normalizedStatementId },
      error
    );
  }
}

function cancelDatabricksSql(parameters, statementId) {
  const normalizedParameters = astAssertDatabricksExecutionParameters(parameters, 'control');
  const normalizedStatementId = typeof statementId === 'string' ? statementId.trim() : '';

  if (!normalizedStatementId) {
    throw buildDatabricksSqlError('Databricks cancel requires a non-empty statementId');
  }

  try {
    const apiBaseUrl = astDatabricksBuildStatementsApiBase(normalizedParameters.host);
    const cancelResponse = UrlFetchApp.fetch(`${apiBaseUrl}${normalizedStatementId}/cancel`, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${normalizedParameters.token}`
      },
      muteHttpExceptions: true
    });
    const statusCode = astDatabricksGetHttpStatus(cancelResponse);

    if (statusCode < 200 || statusCode >= 300) {
      throw buildDatabricksSqlError(
        'Databricks cancel request failed',
        {
          host: normalizedParameters.host,
          statementId: normalizedStatementId,
          statusCode,
          response: astDatabricksParseResponseBody(cancelResponse)
        }
      );
    }

    const latest = getDatabricksSqlStatus(normalizedParameters, normalizedStatementId);
    const latestState = typeof latest.state === 'string' ? latest.state.toUpperCase() : '';
    const isCanceled = latestState === 'CANCELED' || latestState === 'CLOSED';
    const response = Object.assign({}, latest, { canceled: isCanceled });

    if (!isCanceled) {
      response.cancelRequested = true;
    }

    return response;
  } catch (error) {
    if (error && error.name === 'DatabricksSqlError') {
      throw error;
    }

    throw buildDatabricksSqlError(
      'Databricks cancel failed',
      { host: normalizedParameters.host, statementId: normalizedStatementId },
      error
    );
  }
}

function fetchStatementStatus(apiBaseUrl, statementId, token) {
  const response = UrlFetchApp.fetch(`${apiBaseUrl}${statementId}`, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return JSON.parse(response.getContentText());
}

function fetchChunk(chunkLink, host, token) {
  const chunkUrl = `https://${host}${chunkLink}`;
  const chunkResponse = UrlFetchApp.fetch(chunkUrl, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return JSON.parse(chunkResponse.getContentText());
}

function downloadAllChunks(results, host, token) {
  const manifest = results && results.manifest ? results.manifest : {};
  const result = results && results.result ? results.result : {};
  const schema = manifest && manifest.schema ? manifest.schema : {};
  const columns = Array.isArray(schema.columns) ? schema.columns.map(col => col.name) : [];

  if (Number(manifest.total_byte_count || 0) === 0) {
    const emptyColumns = columns.reduce((acc, column) => {
      acc[column] = [];
      return acc;
    }, {});
    return DataFrame.fromColumns(emptyColumns, { copy: false });
  }

  const firstResult = Array.isArray(result.external_links) ? result.external_links[0] : null;
  let nextChunkInternalLink = firstResult && firstResult.next_chunk_internal_link
    ? firstResult.next_chunk_internal_link
    : null;
  let nextChunkExternalLink = firstResult && firstResult.external_link
    ? firstResult.external_link
    : null;

  const dataframes = [];

  if (nextChunkExternalLink) {
    const baseDataFrame = JSON.parse(UrlFetchApp.fetch(nextChunkExternalLink).getContentText());
    baseDataFrame.unshift(columns);
    dataframes.push(DataFrame.fromArrays(baseDataFrame));
  }

  while (nextChunkInternalLink) {
    const currentChunk = fetchChunk(nextChunkInternalLink, host, token);
    const links = Array.isArray(currentChunk && currentChunk.external_links)
      ? currentChunk.external_links
      : [];
    const firstLink = links[0] || {};
    nextChunkInternalLink = firstLink.next_chunk_internal_link || null;
    nextChunkExternalLink = firstLink.external_link || null;

    if (nextChunkExternalLink) {
      const nextDataFrame = JSON.parse(UrlFetchApp.fetch(nextChunkExternalLink).getContentText());
      nextDataFrame.unshift(columns);
      dataframes.push(DataFrame.fromArrays(nextDataFrame));
    }
  }

  return DataFrame.concat(dataframes);
}
