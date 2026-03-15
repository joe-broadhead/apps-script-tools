function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  const provider = config.SQL_COOKBOOK_DEFAULT_PROVIDER;
  const capabilities = {};
  const providers = ASTX.Sql.providers();

  for (let idx = 0; idx < providers.length; idx += 1) {
    capabilities[providers[idx]] = ASTX.Sql.capabilities(providers[idx]);
  }

  const prepared = ASTX.Sql.prepare({
    provider,
    sql: cookbookPreparedQueryTemplate_(),
    paramsSchema: cookbookPreparedParamsSchema_(),
    parameters: cookbookBuildSqlParameters_(config, provider),
    options: cookbookBuildSqlOptions_(config)
  });

  const smoke = {
    status: 'ok',
    entrypoint: 'runCookbookSmoke',
    cookbook: cookbookName_(),
    templateVersion: cookbookTemplateVersion_(),
    appName: config.SQL_COOKBOOK_APP_NAME,
    astVersion: ASTX.VERSION,
    provider,
    providers,
    capabilities,
    liveEnabled: config.SQL_COOKBOOK_ENABLE_LIVE,
    prepared: {
      provider: prepared.provider,
      templateParams: prepared.templateParams,
      paramTypes: Object.keys(prepared.paramSchema).reduce((acc, key) => {
        const field = prepared.paramSchema[key];
        acc[key] = field && field.type ? field.type : field;
        return acc;
      }, {})
    },
    requestPreview: {
      directRun: {
        provider,
        sql: cookbookDirectQuerySql_(provider),
        parameters: cookbookBuildSafeParameterPreview_(config, provider),
        options: cookbookBuildSqlOptions_(config)
      },
      preparedExecution: {
        statementId: '<statement-id from prepare()>',
        params: {
          sample_id: 7,
          sample_label: `${provider}_prepared`
        }
      },
      statusCheck: {
        provider,
        executionId: '<execution-id>',
        parameters: cookbookBuildSafeParameterPreview_(config, provider)
      },
      cancelRequest: {
        provider,
        executionId: '<execution-id>',
        parameters: cookbookBuildSafeParameterPreview_(config, provider)
      }
    },
    live: {
      executed: false,
      skipped: !config.SQL_COOKBOOK_ENABLE_LIVE,
      reason: config.SQL_COOKBOOK_ENABLE_LIVE ? '' : 'Set SQL_COOKBOOK_ENABLE_LIVE=true to run provider-backed SQL examples.'
    },
    generatedAt: new Date().toISOString()
  };

  if (!config.SQL_COOKBOOK_ENABLE_LIVE) {
    return smoke;
  }

  const directResult = ASTX.Sql.run({
    provider,
    sql: cookbookDirectQuerySql_(provider),
    parameters: cookbookBuildSqlParameters_(config, provider),
    options: cookbookBuildSqlOptions_(config)
  });

  smoke.live = {
    executed: true,
    provider,
    directResult: cookbookSummarizeDataFrame_(directResult)
  };

  return smoke;
}
