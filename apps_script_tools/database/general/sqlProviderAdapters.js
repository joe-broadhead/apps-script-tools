function buildSqlProviderValidationError(message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'SqlProviderValidationError';
  error.provider = details.provider || 'sql_router';
  error.details = details;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function astCreateBigQuerySqlAdapter() {
  return {
    provider: 'bigquery',
    capabilities: {
      supportsPlaceholders: true,
      supportsTimeoutOptions: true,
      supportsTableLoad: true,
      supportsPreparedStatements: true,
      supportsStatus: true,
      supportsCancel: true
    },
    validateRequest: request => request,
    executeQuery: request => {
      return runBigQuerySql(
        request.sql,
        request.parameters,
        request.placeholders,
        request.options
      );
    },
    executePrepared: request => {
      if (typeof executeBigQuerySqlDetailed === 'function') {
        return executeBigQuerySqlDetailed(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        );
      }

      return {
        dataFrame: runBigQuerySql(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        ),
        execution: null
      };
    },
    getStatus: request => {
      if (typeof getBigQuerySqlStatus !== 'function') {
        throw buildSqlProviderValidationError('BigQuery status helper is not available', {
          provider: 'bigquery'
        });
      }

      return getBigQuerySqlStatus(
        request.parameters,
        request.jobId || request.executionId
      );
    },
    cancelExecution: request => {
      if (typeof cancelBigQuerySql !== 'function') {
        throw buildSqlProviderValidationError('BigQuery cancel helper is not available', {
          provider: 'bigquery'
        });
      }

      return cancelBigQuerySql(
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
    capabilities: {
      supportsPlaceholders: true,
      supportsTimeoutOptions: true,
      supportsTableLoad: true,
      supportsPreparedStatements: true,
      supportsStatus: true,
      supportsCancel: true
    },
    validateRequest: request => request,
    executeQuery: request => {
      return runDatabricksSql(
        request.sql,
        request.parameters,
        request.placeholders,
        request.options
      );
    },
    executePrepared: request => {
      if (typeof executeDatabricksSqlDetailed === 'function') {
        return executeDatabricksSqlDetailed(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        );
      }

      return {
        dataFrame: runDatabricksSql(
          request.sql,
          request.parameters,
          request.placeholders || {},
          request.options || {}
        ),
        execution: null
      };
    },
    getStatus: request => {
      if (typeof getDatabricksSqlStatus !== 'function') {
        throw buildSqlProviderValidationError('Databricks status helper is not available', {
          provider: 'databricks'
        });
      }

      return getDatabricksSqlStatus(
        request.parameters,
        request.statementId || request.executionId
      );
    },
    cancelExecution: request => {
      if (typeof cancelDatabricksSql !== 'function') {
        throw buildSqlProviderValidationError('Databricks cancel helper is not available', {
          provider: 'databricks'
        });
      }

      return cancelDatabricksSql(
        request.parameters,
        request.statementId || request.executionId
      );
    },
    classifyError: error => error
  };
}

const AST_SQL_PROVIDER_ADAPTERS = {
  bigquery: astCreateBigQuerySqlAdapter(),
  databricks: astCreateDatabricksSqlAdapter()
};

function astGetSqlProviderAdapter(provider) {
  const adapter = AST_SQL_PROVIDER_ADAPTERS[provider];

  if (!adapter) {
    throw buildSqlProviderValidationError(
      'Provider must be one of: databricks, bigquery',
      {
        provider,
        supportedProviders: Object.keys(AST_SQL_PROVIDER_ADAPTERS)
      }
    );
  }

  return adapter;
}

function astListSqlProviders() {
  return Object.keys(AST_SQL_PROVIDER_ADAPTERS);
}

function astGetSqlProviderCapabilities(provider) {
  const adapter = astGetSqlProviderAdapter(provider);
  return Object.assign({}, adapter.capabilities);
}
