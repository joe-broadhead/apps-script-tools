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
      return astRunBigQuerySql(
        request.sql,
        request.parameters,
        request.placeholders,
        request.options
      );
    },
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
      return astRunDatabricksSql(
        request.sql,
        request.parameters,
        request.placeholders,
        request.options
      );
    },
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

const AST_SQL_PROVIDER_ADAPTERS = {
  bigquery: astCreateBigQuerySqlAdapter(),
  databricks: astCreateDatabricksSqlAdapter()
};

function astGetSqlProviderAdapter(provider) {
  const adapter = AST_SQL_PROVIDER_ADAPTERS[provider];

  if (!adapter) {
    throw astBuildSqlProviderValidationError(
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
