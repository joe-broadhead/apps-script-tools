function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  const startedAtMs = Date.now();
  const schema = cookbookBuildSchema_(ASTX);
  const runtimeSummary = cookbookConfigureRuntime_(ASTX, config, 'memory');
  const bound = ASTX.Config.bind(schema, {
    request: {
      CONFIG_CACHE_PATTERNS_ENV: 'dev',
      CONFIG_CACHE_PATTERNS_TIMEOUT_MS: 15000
    },
    runtime: {
      CONFIG_CACHE_PATTERNS_ENABLE_BATCH: 'true'
    },
    scriptProperties: cookbookScriptProperties_(),
    includeMeta: true
  });
  const smokeCacheOptions = cookbookCacheOptions_(config, 'smoke', 'memory');
  ASTX.Cache.clear(smokeCacheOptions);

  const resolvedSecret = ASTX.Secrets.resolveValue(bound.values.CONFIG_CACHE_PATTERNS_SECRET_REF);
  const directSecret = ASTX.Secrets.get({
    provider: 'script_properties',
    key: 'CONFIG_CACHE_PATTERNS_API_TOKEN'
  });

  let resolverCount = 0;
  const firstFetch = ASTX.Cache.fetch('cfg:summary', function () {
    resolverCount += 1;
    return {
      env: bound.values.CONFIG_CACHE_PATTERNS_ENV,
      timeoutMs: bound.values.CONFIG_CACHE_PATTERNS_TIMEOUT_MS,
      generatedAt: '2026-03-13T00:00:00Z'
    };
  }, Object.assign({}, smokeCacheOptions, {
    tags: ['config', 'summary']
  }));
  const secondFetch = ASTX.Cache.fetch('cfg:summary', function () {
    resolverCount += 1;
    return {
      env: 'should-not-run'
    };
  }, Object.assign({}, smokeCacheOptions, {
    tags: ['config', 'summary']
  }));
  const fetchMany = ASTX.Cache.fetchMany(
    ['cfg:summary', 'cfg:details', 'cfg:health'],
    function (payload) {
      resolverCount += 1;
      return {
        requestedKey: payload.requestedKey,
        env: bound.values.CONFIG_CACHE_PATTERNS_ENV
      };
    },
    Object.assign({}, smokeCacheOptions, {
      tags: ['config', 'batch']
    })
  );
  const statsBeforeClear = ASTX.Cache.stats(smokeCacheOptions);
  const cleared = ASTX.Cache.clear(smokeCacheOptions);

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.CONFIG_CACHE_PATTERNS_APP_NAME,
    durationMs: Date.now() - startedAtMs,
    runtime: {
      configuredModules: runtimeSummary.configuredModules,
      failedModules: runtimeSummary.failedModules
    },
    boundConfig: {
      env: bound.values.CONFIG_CACHE_PATTERNS_ENV,
      timeoutMs: bound.values.CONFIG_CACHE_PATTERNS_TIMEOUT_MS,
      enableBatch: bound.values.CONFIG_CACHE_PATTERNS_ENABLE_BATCH,
      cacheBackend: 'memory'
    },
    sources: bound.sourceByKey,
    secret: {
      resolved: true,
      sameValue: resolvedSecret === directSecret.value,
      masked: cookbookMaskSecret_(resolvedSecret)
    },
    cache: {
      backend: smokeCacheOptions.backend,
      namespace: smokeCacheOptions.namespace,
      firstFetchHit: firstFetch.cacheHit,
      secondFetchHit: secondFetch.cacheHit,
      fetchMany: fetchMany.stats,
      resolverCount: resolverCount,
      statsBeforeClear: statsBeforeClear,
      cleared: cleared
    }
  };
}
