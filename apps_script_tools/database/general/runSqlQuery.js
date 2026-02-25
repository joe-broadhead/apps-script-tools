const AST_SQL_PREPARED_STATEMENTS = {};
const AST_SQL_PREPARED_ORDER = [];
let AST_SQL_PREPARED_ORDER_HEAD = 0;
const AST_SQL_PREPARED_STATEMENT_MAX = 500;
const AST_SQL_ALLOWED_PARAM_TYPES = Object.freeze([
  'string',
  'number',
  'integer',
  'boolean',
  'date',
  'timestamp',
  'json',
  'raw'
]);

function astSqlBuildRuntimeError(name, message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = name;
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function astSqlIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astSqlNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astSqlEscapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function astSqlDigestHex(value) {
  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.computeDigest === 'function' &&
    Utilities.DigestAlgorithm &&
    Utilities.DigestAlgorithm.SHA_256
  ) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value));
    return digest
      .map(byte => {
        const normalized = byte < 0 ? byte + 256 : byte;
        return normalized.toString(16).padStart(2, '0');
      })
      .join('');
  }

  const random = Math.random().toString(16).slice(2);
  const timestamp = Date.now().toString(16);
  return `${timestamp}${random}`.padEnd(64, '0').slice(0, 64);
}

function astSqlExtractTemplateParams(sqlTemplate) {
  const parameterNames = [];
  const pattern = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

  let match;
  while ((match = pattern.exec(sqlTemplate)) !== null) {
    const key = match[1];
    if (!parameterNames.includes(key)) {
      parameterNames.push(key);
    }
  }

  return parameterNames;
}

function astSqlNormalizeSchemaEntry(key, rawEntry) {
  let entry;
  if (typeof rawEntry === 'string') {
    entry = { type: rawEntry };
  } else if (astSqlIsPlainObject(rawEntry)) {
    entry = Object.assign({}, rawEntry);
  } else {
    entry = {};
  }

  const normalizedType = astSqlNormalizeString(entry.type, 'string').toLowerCase();
  if (!AST_SQL_ALLOWED_PARAM_TYPES.includes(normalizedType)) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      `Unsupported type '${normalizedType}' for parameter '${key}'`,
      {
        key,
        type: normalizedType,
        supportedTypes: AST_SQL_ALLOWED_PARAM_TYPES.slice()
      }
    );
  }

  const hasDefault = Object.prototype.hasOwnProperty.call(entry, 'default');
  return {
    type: normalizedType,
    required: typeof entry.required === 'boolean' ? entry.required : true,
    nullable: Boolean(entry.nullable),
    hasDefault,
    defaultValue: hasDefault ? entry.default : undefined
  };
}

function astSqlNormalizeParamSchema(rawSchema, templateParams) {
  if (typeof rawSchema === 'undefined' || rawSchema === null) {
    rawSchema = {};
  }

  if (!astSqlIsPlainObject(rawSchema)) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      'paramsSchema must be an object when provided'
    );
  }

  const schema = {};

  templateParams.forEach(param => {
    schema[param] = astSqlNormalizeSchemaEntry(param, rawSchema[param]);
  });

  Object.keys(rawSchema).forEach(key => {
    if (!schema[key]) {
      schema[key] = astSqlNormalizeSchemaEntry(key, rawSchema[key]);
    }
  });

  return schema;
}

function astSqlQuoteString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function astSqlToBoolean(value, key) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 1 || value === '1' || value === 'true' || value === 'TRUE') {
    return true;
  }
  if (value === 0 || value === '0' || value === 'false' || value === 'FALSE') {
    return false;
  }

  throw astSqlBuildRuntimeError(
    'SqlPreparedStatementError',
    `Parameter '${key}' must be coercible to boolean`
  );
}

function astSqlToDate(value, key) {
  const resolved = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(resolved.getTime())) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      `Parameter '${key}' must be coercible to a valid date`
    );
  }
  return resolved;
}

function astSqlSerializeParamValue(key, spec, value) {
  if (value == null) {
    if (spec.nullable || spec.required === false || spec.hasDefault) {
      return 'NULL';
    }
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      `Parameter '${key}' is required and cannot be null`
    );
  }

  switch (spec.type) {
    case 'raw':
      return String(value);
    case 'string':
      return astSqlQuoteString(value);
    case 'number': {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num)) {
        throw astSqlBuildRuntimeError(
          'SqlPreparedStatementError',
          `Parameter '${key}' must be a finite number`
        );
      }
      return String(num);
    }
    case 'integer': {
      const intVal = typeof value === 'number' ? value : Number(value);
      if (!Number.isInteger(intVal)) {
        throw astSqlBuildRuntimeError(
          'SqlPreparedStatementError',
          `Parameter '${key}' must be an integer`
        );
      }
      return String(intVal);
    }
    case 'boolean':
      return astSqlToBoolean(value, key) ? 'TRUE' : 'FALSE';
    case 'date': {
      const date = astSqlToDate(value, key);
      return astSqlQuoteString(date.toISOString().slice(0, 10));
    }
    case 'timestamp': {
      const date = astSqlToDate(value, key);
      return astSqlQuoteString(date.toISOString());
    }
    case 'json':
      return astSqlQuoteString(JSON.stringify(value));
    default:
      throw astSqlBuildRuntimeError(
        'SqlPreparedStatementError',
        `Unsupported parameter type '${spec.type}' for '${key}'`
      );
  }
}

function astSqlResolvePreparedParams(prepared, rawParams) {
  const params = rawParams == null ? {} : rawParams;
  if (!astSqlIsPlainObject(params)) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      'executePrepared params must be an object when provided'
    );
  }

  const allowed = new Set(Object.keys(prepared.paramSchema));
  Object.keys(params).forEach(key => {
    if (!allowed.has(key)) {
      throw astSqlBuildRuntimeError(
        'SqlPreparedStatementError',
        `Unknown prepared parameter '${key}'`,
        { key, allowed: Array.from(allowed) }
      );
    }
  });

  const resolved = {};

  prepared.templateParams.forEach(key => {
    const spec = prepared.paramSchema[key] || {
      type: 'string',
      required: true,
      nullable: false,
      hasDefault: false
    };

    if (Object.prototype.hasOwnProperty.call(params, key)) {
      resolved[key] = params[key];
      return;
    }

    if (spec.hasDefault) {
      resolved[key] = spec.defaultValue;
      return;
    }

    if (spec.required === false) {
      resolved[key] = null;
      return;
    }

    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      `Missing required prepared parameter '${key}'`,
      { key }
    );
  });

  return resolved;
}

function astSqlRenderPreparedSql(prepared, resolvedParams) {
  let rendered = prepared.sqlTemplate;

  prepared.templateParams.forEach(key => {
    const spec = prepared.paramSchema[key];
    const replacement = astSqlSerializeParamValue(key, spec, resolvedParams[key]);
    const pattern = new RegExp(`\\{\\{\\s*${astSqlEscapeRegExp(key)}\\s*\\}\\}`, 'g');
    rendered = rendered.replace(pattern, replacement);
  });

  return rendered;
}

function astSqlPrunePreparedStatements() {
  while ((AST_SQL_PREPARED_ORDER.length - AST_SQL_PREPARED_ORDER_HEAD) > AST_SQL_PREPARED_STATEMENT_MAX) {
    const oldestId = AST_SQL_PREPARED_ORDER[AST_SQL_PREPARED_ORDER_HEAD];
    AST_SQL_PREPARED_ORDER[AST_SQL_PREPARED_ORDER_HEAD] = undefined;
    AST_SQL_PREPARED_ORDER_HEAD += 1;
    if (oldestId && AST_SQL_PREPARED_STATEMENTS[oldestId]) {
      delete AST_SQL_PREPARED_STATEMENTS[oldestId];
    }
  }

  if (
    AST_SQL_PREPARED_ORDER_HEAD > 64 &&
    AST_SQL_PREPARED_ORDER_HEAD * 2 >= AST_SQL_PREPARED_ORDER.length
  ) {
    AST_SQL_PREPARED_ORDER.splice(0, AST_SQL_PREPARED_ORDER_HEAD);
    AST_SQL_PREPARED_ORDER_HEAD = 0;
  }
}

function astSqlNormalizeProvider(provider) {
  const normalized = astSqlNormalizeString(provider, '').toLowerCase();
  if (!normalized) {
    throw astSqlBuildRuntimeError('SqlPreparedStatementError', 'provider must be a non-empty string');
  }
  return normalized;
}

function astSqlValidateControlRequest(request, provider) {
  const parameters = astSqlIsPlainObject(request.parameters) ? request.parameters : null;
  if (!parameters) {
    throw astSqlBuildRuntimeError(
      'SqlExecutionControlError',
      'parameters must be an object for status/cancel requests'
    );
  }

  if (provider === 'bigquery') {
    const projectId = astSqlNormalizeString(parameters.projectId, '');
    if (!projectId) {
      throw astSqlBuildRuntimeError(
        'SqlExecutionControlError',
        'BigQuery status/cancel requires parameters.projectId'
      );
    }
  }

  if (provider === 'databricks') {
    const host = astSqlNormalizeString(parameters.host, '');
    const token = astSqlNormalizeString(parameters.token, '');
    if (!host || !token) {
      throw astSqlBuildRuntimeError(
        'SqlExecutionControlError',
        'Databricks status/cancel requires parameters.host and parameters.token'
      );
    }
  }
}

function astSqlPrepare(request = {}) {
  if (!astSqlIsPlainObject(request)) {
    throw astSqlBuildRuntimeError('SqlPreparedStatementError', 'prepare request must be an object');
  }

  const provider = astSqlNormalizeProvider(request.provider);
  astGetSqlProviderAdapter(provider);

  const sqlTemplate = astSqlNormalizeString(request.sql, '');
  if (!sqlTemplate) {
    throw astSqlBuildRuntimeError('SqlPreparedStatementError', 'prepare request requires a non-empty sql string');
  }

  if (typeof request.parameters !== 'undefined' && !astSqlIsPlainObject(request.parameters)) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      'prepare request.parameters must be an object when provided'
    );
  }

  if (typeof request.options !== 'undefined' && !astSqlIsPlainObject(request.options)) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      'prepare request.options must be an object when provided'
    );
  }

  const templateParams = astSqlExtractTemplateParams(sqlTemplate);
  const paramSchema = astSqlNormalizeParamSchema(request.paramsSchema || {}, templateParams);
  const createdAt = new Date().toISOString();
  const statementId = `sqlprep_${astSqlDigestHex(
    `${provider}|${sqlTemplate}|${JSON.stringify(paramSchema)}|${createdAt}|${Math.random()}`
  ).slice(0, 24)}`;

  AST_SQL_PREPARED_STATEMENTS[statementId] = {
    statementId,
    provider,
    sqlTemplate,
    templateParams: templateParams.slice(),
    paramSchema,
    defaultParameters: astSqlIsPlainObject(request.parameters) ? Object.assign({}, request.parameters) : {},
    defaultOptions: astSqlIsPlainObject(request.options) ? Object.assign({}, request.options) : {},
    createdAt
  };
  AST_SQL_PREPARED_ORDER.push(statementId);
  astSqlPrunePreparedStatements();

  return {
    statementId,
    provider,
    templateParams: templateParams.slice(),
    createdAt,
    paramSchema: JSON.parse(JSON.stringify(paramSchema))
  };
}

function astSqlExecutePrepared(request = {}) {
  if (!astSqlIsPlainObject(request)) {
    throw astSqlBuildRuntimeError('SqlPreparedStatementError', 'executePrepared request must be an object');
  }

  const statementId = astSqlNormalizeString(request.statementId, '');
  if (!statementId) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      'executePrepared request requires a non-empty statementId'
    );
  }

  const prepared = AST_SQL_PREPARED_STATEMENTS[statementId];
  if (!prepared) {
    throw astSqlBuildRuntimeError(
      'SqlPreparedStatementError',
      `Prepared statement '${statementId}' was not found in runtime cache`
    );
  }

  const resolvedParams = astSqlResolvePreparedParams(prepared, request.params || {});
  const renderedSql = astSqlRenderPreparedSql(prepared, resolvedParams);
  const mergedParameters = Object.assign(
    {},
    prepared.defaultParameters || {},
    astSqlIsPlainObject(request.parameters) ? request.parameters : {}
  );
  const mergedOptions = Object.assign(
    {},
    prepared.defaultOptions || {},
    astSqlIsPlainObject(request.options) ? request.options : {}
  );

  const normalizedRequest = astValidateSqlRequest({
    provider: prepared.provider,
    sql: renderedSql,
    parameters: mergedParameters,
    placeholders: {},
    options: Object.assign({}, mergedOptions, {
      allowUnsafePlaceholders: false
    })
  });

  const adapter = astGetSqlProviderAdapter(prepared.provider);

  try {
    const validatedRequest = adapter.validateRequest(normalizedRequest);
    const adapterResult = typeof adapter.executePrepared === 'function'
      ? adapter.executePrepared(validatedRequest)
      : adapter.executeQuery(validatedRequest);

    const dataFrame = adapterResult && astSqlIsPlainObject(adapterResult) && Object.prototype.hasOwnProperty.call(adapterResult, 'dataFrame')
      ? adapterResult.dataFrame
      : adapterResult;
    const execution = adapterResult && astSqlIsPlainObject(adapterResult) && Object.prototype.hasOwnProperty.call(adapterResult, 'execution')
      ? adapterResult.execution
      : null;

    return {
      provider: prepared.provider,
      statementId,
      sql: renderedSql,
      dataFrame,
      execution
    };
  } catch (error) {
    throw adapter.classifyError(error, normalizedRequest);
  }
}

function astSqlStatus(request = {}) {
  if (!astSqlIsPlainObject(request)) {
    throw astSqlBuildRuntimeError('SqlExecutionControlError', 'status request must be an object');
  }

  const provider = astSqlNormalizeProvider(request.provider);
  astSqlValidateControlRequest(request, provider);

  const executionId = astSqlNormalizeString(
    provider === 'databricks' ? (request.statementId || request.executionId) : (request.jobId || request.executionId),
    ''
  );
  if (!executionId) {
    throw astSqlBuildRuntimeError(
      'SqlExecutionControlError',
      `status request requires ${provider === 'databricks' ? 'statementId' : 'jobId'}`
    );
  }

  const adapter = astGetSqlProviderAdapter(provider);
  if (typeof adapter.getStatus !== 'function') {
    throw astSqlBuildRuntimeError(
      'SqlExecutionControlError',
      `Provider '${provider}' does not support status`
    );
  }

  const normalized = {
    provider,
    executionId,
    statementId: provider === 'databricks' ? executionId : undefined,
    jobId: provider === 'bigquery' ? executionId : undefined,
    parameters: request.parameters
  };

  try {
    return adapter.getStatus(normalized);
  } catch (error) {
    throw adapter.classifyError(error, normalized);
  }
}

function astSqlCancel(request = {}) {
  if (!astSqlIsPlainObject(request)) {
    throw astSqlBuildRuntimeError('SqlExecutionControlError', 'cancel request must be an object');
  }

  const provider = astSqlNormalizeProvider(request.provider);
  astSqlValidateControlRequest(request, provider);

  const executionId = astSqlNormalizeString(
    provider === 'databricks' ? (request.statementId || request.executionId) : (request.jobId || request.executionId),
    ''
  );
  if (!executionId) {
    throw astSqlBuildRuntimeError(
      'SqlExecutionControlError',
      `cancel request requires ${provider === 'databricks' ? 'statementId' : 'jobId'}`
    );
  }

  const adapter = astGetSqlProviderAdapter(provider);
  if (typeof adapter.cancelExecution !== 'function') {
    throw astSqlBuildRuntimeError(
      'SqlExecutionControlError',
      `Provider '${provider}' does not support cancel`
    );
  }

  const normalized = {
    provider,
    executionId,
    statementId: provider === 'databricks' ? executionId : undefined,
    jobId: provider === 'bigquery' ? executionId : undefined,
    parameters: request.parameters
  };

  try {
    return adapter.cancelExecution(normalized);
  } catch (error) {
    throw adapter.classifyError(error, normalized);
  }
}

function runSqlQuery(request = {}) {
  const normalizedRequest = astValidateSqlRequest(request);
  const adapter = astGetSqlProviderAdapter(normalizedRequest.provider);

  try {
    const validatedRequest = adapter.validateRequest(normalizedRequest);
    return adapter.executeQuery(validatedRequest);
  } catch (error) {
    throw adapter.classifyError(error, normalizedRequest);
  }
}
