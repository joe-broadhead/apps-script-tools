/**
 * @function runBigQuerySql
 * @description Executes SQL against BigQuery and returns a DataFrame.
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

function astAssertBigQueryProjectId(parameters) {
  if (parameters == null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw buildBigQuerySqlError('BigQuery parameters must be an object');
  }

  const projectId = typeof parameters.projectId === 'string'
    ? parameters.projectId.trim()
    : '';

  if (!projectId) {
    throw buildBigQuerySqlError('BigQuery parameters.projectId must be a non-empty string');
  }

  return projectId;
}

function astBigQueryRowsToDataFrame(schemaFields, rows) {
  const headers = schemaFields.map(field => field.name);
  const dataRows = Array.isArray(rows) ? rows : [];

  if (dataRows.length === 0) {
    const emptyFrame = headers.reduce((acc, header) => {
      acc[header] = new Series([], header);
      return acc;
    }, {});
    return new DataFrame(emptyFrame);
  }

  const records = dataRows.map(row => {
    const fields = Array.isArray(row && row.f) ? row.f : [];
    return fields.reduce((record, col, index) => {
      record[headers[index]] = col && Object.prototype.hasOwnProperty.call(col, 'v') ? col.v : null;
      return record;
    }, {});
  });

  return DataFrame.fromRecords(records);
}

function executeBigQuerySqlDetailed(query, parameters, placeholders = {}, options = {}) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw buildBigQuerySqlError('BigQuery SQL query must be a non-empty string');
  }

  const projectId = astAssertBigQueryProjectId(parameters);
  const normalizedOptions = normalizeBigQueryQueryOptions(options);

  const request = {
    query: replacePlaceHoldersInQuery(query, placeholders),
    useLegacySql: false
  };

  try {
    let queryResults = BigQuery.Jobs.query(request, projectId);
    const jobReference = queryResults && queryResults.jobReference ? queryResults.jobReference : {};
    const jobId = typeof jobReference.jobId === 'string' ? jobReference.jobId.trim() : '';

    if (!jobId) {
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
    const rows = Array.isArray(queryResults.rows) ? queryResults.rows.slice() : [];

    while (queryResults.pageToken) {
      queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId, {
        pageToken: queryResults.pageToken
      });

      if (Array.isArray(queryResults.rows) && queryResults.rows.length > 0) {
        rows.push(...queryResults.rows);
      }
    }

    const elapsedMs = Date.now() - pollStartedAt;
    return {
      dataFrame: astBigQueryRowsToDataFrame(schemaFields, rows),
      execution: {
        provider: 'bigquery',
        executionId: jobId,
        jobId,
        state: 'SUCCEEDED',
        complete: true,
        pollCount,
        elapsedMs,
        maxWaitMs: normalizedOptions.maxWaitMs,
        pollIntervalMs: normalizedOptions.pollIntervalMs
      }
    };
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

function runBigQuerySql(query, parameters, placeholders = {}, options = {}) {
  return executeBigQuerySqlDetailed(query, parameters, placeholders, options).dataFrame;
}

function astIsBigQueryCanceledError(errorResult) {
  if (!errorResult || typeof errorResult !== 'object') {
    return false;
  }

  const reason = typeof errorResult.reason === 'string'
    ? errorResult.reason.toLowerCase()
    : '';
  const message = typeof errorResult.message === 'string'
    ? errorResult.message.toLowerCase()
    : '';

  return reason === 'stopped'
    || reason === 'canceled'
    || reason === 'cancelled'
    || message.includes('stopped')
    || message.includes('cancel');
}

function getBigQuerySqlStatus(parameters, jobId) {
  const projectId = astAssertBigQueryProjectId(parameters);
  const normalizedJobId = typeof jobId === 'string' ? jobId.trim() : '';

  if (!normalizedJobId) {
    throw buildBigQuerySqlError('BigQuery status requires a non-empty jobId');
  }

  try {
    const response = BigQuery.Jobs.get(projectId, normalizedJobId);
    const status = response && response.status ? response.status : {};
    const rawState = typeof status.state === 'string' ? status.state.toUpperCase() : 'UNKNOWN';
    const isComplete = rawState === 'DONE';
    const mappedState = isComplete
      ? (status.errorResult
        ? (astIsBigQueryCanceledError(status.errorResult) ? 'CANCELED' : 'FAILED')
        : 'SUCCEEDED')
      : rawState;

    return {
      provider: 'bigquery',
      executionId: normalizedJobId,
      jobId: normalizedJobId,
      state: mappedState,
      complete: isComplete,
      error: status.errorResult || null,
      errors: Array.isArray(status.errors) ? status.errors : []
    };
  } catch (error) {
    if (error && error.name === 'BigQuerySqlError') {
      throw error;
    }

    throw buildBigQuerySqlError(
      'BigQuery status lookup failed',
      { projectId, jobId: normalizedJobId },
      error
    );
  }
}

function cancelBigQuerySql(parameters, jobId) {
  const projectId = astAssertBigQueryProjectId(parameters);
  const normalizedJobId = typeof jobId === 'string' ? jobId.trim() : '';

  if (!normalizedJobId) {
    throw buildBigQuerySqlError('BigQuery cancel requires a non-empty jobId');
  }

  try {
    if (!BigQuery.Jobs || typeof BigQuery.Jobs.cancel !== 'function') {
      throw buildBigQuerySqlError('BigQuery.Jobs.cancel is not available in this runtime');
    }

    const response = BigQuery.Jobs.cancel(projectId, normalizedJobId);
    const job = response && response.job ? response.job : response;
    const status = job && job.status ? job.status : {};
    const rawState = typeof status.state === 'string' ? status.state.toUpperCase() : 'UNKNOWN';

    return {
      provider: 'bigquery',
      executionId: normalizedJobId,
      jobId: normalizedJobId,
      canceled: true,
      state: rawState === 'DONE' ? 'CANCELED' : (rawState || 'CANCEL_REQUESTED'),
      complete: rawState === 'DONE',
      error: status.errorResult || null
    };
  } catch (error) {
    if (error && error.name === 'BigQuerySqlError') {
      throw error;
    }

    throw buildBigQuerySqlError(
      'BigQuery cancel failed',
      { projectId, jobId: normalizedJobId },
      error
    );
  }
}
