/**
 * @function validateSqlRequest
 * @description Validates and normalizes a SQL request object used by `runSqlQuery`.
 *              Placeholder interpolation is disabled by default for security.
 * @param {Object} request - SQL execution request.
 * @param {String} request.provider - One of: databricks, bigquery.
 * @param {String} request.sql - SQL statement to execute.
 * @param {Object} request.parameters - Provider-specific connection parameters.
 * @param {Object} [request.placeholders={}] - Placeholder values for interpolation.
 * @param {Object} [request.options={}] - Extra options.
 * @param {Boolean} [request.options.allowUnsafePlaceholders=false] - Enables unsafe placeholder interpolation.
 * @param {Number} [request.options.maxWaitMs=120000] - Maximum polling wait for providers that support it.
 * @param {Number} [request.options.pollIntervalMs=500] - Poll interval for providers that support it.
 * @returns {Object} Normalized SQL request.
 */
function validateSqlRequest(request = {}) {
  if (request == null || typeof request !== 'object' || Array.isArray(request)) {
    throw new Error('SQL request must be an object');
  }

  const {
    provider,
    sql,
    parameters = {},
    placeholders = {},
    options = {}
  } = request;

  if (!['databricks', 'bigquery'].includes(provider)) {
    throw new Error('Provider must be one of: databricks, bigquery');
  }

  if (typeof sql !== 'string' || sql.trim().length === 0) {
    throw new Error('SQL request must include a non-empty sql string');
  }

  if (parameters == null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new Error('SQL request parameters must be an object');
  }

  if (placeholders == null || typeof placeholders !== 'object' || Array.isArray(placeholders)) {
    throw new Error('SQL request placeholders must be an object');
  }

  if (options == null || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('SQL request options must be an object');
  }

  function normalizeOptionalPositiveInteger(value, fieldName, defaultValue) {
    if (value == null) {
      return defaultValue;
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${fieldName} must be a positive integer when provided`);
    }

    return value;
  }

  const normalizedOptions = {
    allowUnsafePlaceholders: Boolean(options.allowUnsafePlaceholders),
    maxWaitMs: normalizeOptionalPositiveInteger(options.maxWaitMs, 'options.maxWaitMs', 120000),
    pollIntervalMs: normalizeOptionalPositiveInteger(options.pollIntervalMs, 'options.pollIntervalMs', 500)
  };

  if (normalizedOptions.pollIntervalMs > normalizedOptions.maxWaitMs) {
    throw new Error('options.pollIntervalMs cannot be greater than options.maxWaitMs');
  }

  if (Object.keys(placeholders).length > 0 && !normalizedOptions.allowUnsafePlaceholders) {
    throw new Error(
      'Unsafe placeholder interpolation is disabled by default. ' +
      'Pass options.allowUnsafePlaceholders=true to enable it.'
    );
  }

  if (provider === 'bigquery') {
    const projectId = parameters.projectId;
    if (typeof projectId !== 'string' || projectId.trim().length === 0) {
      throw new Error('BigQuery requests require parameters.projectId as a non-empty string');
    }
  }

  if (provider === 'databricks') {
    const requiredDatabricksParameters = ['host', 'sqlWarehouseId', 'schema', 'token'];
    const missingDatabricksParameters = requiredDatabricksParameters.filter(key => {
      const value = parameters[key];
      return typeof value !== 'string' || value.trim().length === 0;
    });

    if (missingDatabricksParameters.length > 0) {
      throw new Error(
        `Databricks requests require parameters.${missingDatabricksParameters.join(', parameters.')}`
      );
    }
  }

  return {
    provider,
    sql: sql.trim(),
    parameters,
    placeholders,
    options: normalizedOptions
  };
};
