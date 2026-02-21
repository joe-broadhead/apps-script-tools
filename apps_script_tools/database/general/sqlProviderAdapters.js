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
      supportsTableLoad: true
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
    classifyError: error => error
  };
}

function astCreateDatabricksSqlAdapter() {
  return {
    provider: 'databricks',
    capabilities: {
      supportsPlaceholders: true,
      supportsTimeoutOptions: true,
      supportsTableLoad: true
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
