function astBuildSqlProviderValidationError(message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'SqlProviderValidationError';
  error.provider = details.provider || 'sql_router';
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function astSqlBuildPreparedLifecycleCapabilities() {
  return {
    storage: 'runtime_memory',
    durable: false,
    crossExecution: false,
    scope: 'invocation_local',
    cleanup: 'ttl_or_max_entries',
    defaultTtlSec: 900,
    maxTtlSec: 3600,
    maxEntries: 500
  };
}

function astCreateBigQuerySqlAdapter() {
  return {
    provider: 'bigquery',
    displayName: 'BigQuery',
    requiredParameters: ['projectId'],
    executionIdField: 'jobId',
    capabilities: {
      supportsPlaceholders: true,
      supportsTimeoutOptions: true,
      supportsTableLoad: true,
      supportsPreparedStatements: true,
      preparedStatementLifecycle: astSqlBuildPreparedLifecycleCapabilities(),
      supportsStatus: true,
      supportsCancel: true
    },
    validateRequest: request => request,
    executeQuery: request => {
      return astRunBigQuerySql(
        request.sql,
        request.parameters,
        request.placeholders,
        request.options
      );
    },
    loadTable: config => astLoadBigQueryTable(config),
    executePrepared: request => {
      if (typeof astExecuteBigQuerySqlDetailed === 'function') {
        return astExecuteBigQuerySqlDetailed(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        );
      }

      return {
        dataFrame: astRunBigQuerySql(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        ),
        execution: null
      };
    },
    getStatus: request => {
      if (typeof astGetBigQuerySqlStatus !== 'function') {
        throw astBuildSqlProviderValidationError('BigQuery status helper is not available', {
          provider: 'bigquery'
        });
      }

      return astGetBigQuerySqlStatus(
        request.parameters,
        request.jobId || request.executionId
      );
    },
    cancelExecution: request => {
      if (typeof astCancelBigQuerySql !== 'function') {
        throw astBuildSqlProviderValidationError('BigQuery cancel helper is not available', {
          provider: 'bigquery'
        });
      }

      return astCancelBigQuerySql(
        request.parameters,
        request.jobId || request.executionId
      );
    },
    classifyError: error => error
  };
}

function astCreateDatabricksSqlAdapter() {
  return {
    provider: 'databricks',
    displayName: 'Databricks',
    requiredParameters: ['host', 'sqlWarehouseId', 'schema', 'token'],
    executionIdField: 'statementId',
    capabilities: {
      supportsPlaceholders: true,
      supportsTimeoutOptions: true,
      supportsTableLoad: true,
      supportsPreparedStatements: true,
      preparedStatementLifecycle: astSqlBuildPreparedLifecycleCapabilities(),
      supportsStatus: true,
      supportsCancel: true
    },
    validateRequest: request => request,
    executeQuery: request => {
      return astRunDatabricksSql(
        request.sql,
        request.parameters,
        request.placeholders,
        request.options
      );
    },
    loadTable: config => astLoadDatabricksTable(config),
    executePrepared: request => {
      if (typeof astExecuteDatabricksSqlDetailed === 'function') {
        return astExecuteDatabricksSqlDetailed(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        );
      }

      return {
        dataFrame: astRunDatabricksSql(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        ),
        execution: null
      };
    },
    getStatus: request => {
      if (typeof astGetDatabricksSqlStatus !== 'function') {
        throw astBuildSqlProviderValidationError('Databricks status helper is not available', {
          provider: 'databricks'
        });
      }

      return astGetDatabricksSqlStatus(
        request.parameters,
        request.statementId || request.executionId
      );
    },
    cancelExecution: request => {
      if (typeof astCancelDatabricksSql !== 'function') {
        throw astBuildSqlProviderValidationError('Databricks cancel helper is not available', {
          provider: 'databricks'
        });
      }

      return astCancelDatabricksSql(
        request.parameters,
        request.statementId || request.executionId
      );
    },
    classifyError: error => error
  };
}

// Single source for SQL provider dispatch, validation metadata, and capability metadata.
const AST_SQL_PROVIDER_ADAPTERS = {
  bigquery: astCreateBigQuerySqlAdapter(),
  databricks: astCreateDatabricksSqlAdapter()
};

function astGetSqlProviderAdapter(provider) {
  const adapter = Object.prototype.hasOwnProperty.call(AST_SQL_PROVIDER_ADAPTERS, provider)
    ? AST_SQL_PROVIDER_ADAPTERS[provider]
    : null;

  if (!adapter) {
    const supportedProviders = Object.keys(AST_SQL_PROVIDER_ADAPTERS);
    throw astBuildSqlProviderValidationError(
      `Provider must be one of: ${supportedProviders.join(', ')}`,
      {
        provider,
        supportedProviders
      }
    );
  }

  return adapter;
}

function astListSqlProviders() {
  return Object.keys(AST_SQL_PROVIDER_ADAPTERS);
}

function astGetSqlProviderValidationSpec(provider) {
  const adapter = astGetSqlProviderAdapter(provider);
  return {
    provider: adapter.provider,
    displayName: adapter.displayName || adapter.provider,
    requiredParameters: Array.isArray(adapter.requiredParameters) ? adapter.requiredParameters.slice() : [],
    executionIdField: adapter.executionIdField || null
  };
}

function astSqlCloneProviderCapabilities(capabilities = {}) {
  return JSON.parse(JSON.stringify(capabilities || {}));
}

function astGetSqlProviderCapabilities(provider) {
  const adapter = astGetSqlProviderAdapter(provider);
  const capabilities = astSqlCloneProviderCapabilities(adapter.capabilities);
  capabilities.requiredParameters = Array.isArray(adapter.requiredParameters)
    ? adapter.requiredParameters.slice()
    : [];
  capabilities.executionIdField = adapter.executionIdField || null;
  return capabilities;
}

function astLoadSqlProviderTable(provider, config) {
  const adapter = astGetSqlProviderAdapter(provider);
  if (adapter.capabilities?.supportsTableLoad !== true || typeof adapter.loadTable !== 'function') {
    throw astBuildSqlProviderValidationError(
      `Provider '${provider}' does not support table loads`,
      { provider }
    );
  }
  return adapter.loadTable(config);
}
