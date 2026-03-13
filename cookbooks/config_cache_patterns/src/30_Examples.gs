function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  const startedAtMs = Date.now();
  const backend = config.CONFIG_CACHE_PATTERNS_CACHE_BACKEND;
  const runtimeSummary = cookbookConfigureRuntime_(ASTX, config, backend);
  const cacheOptions = cookbookCacheOptions_(config, 'demo', backend);
  ASTX.Cache.clear(cacheOptions);
  const output = {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.CONFIG_CACHE_PATTERNS_APP_NAME
  };

  const originalSecret = ASTX.Secrets.get({
    provider: 'script_properties',
    key: 'CONFIG_CACHE_PATTERNS_ROTATABLE_SECRET'
  });
  const rotateResult = ASTX.Secrets.rotate({
    provider: 'script_properties',
    key: 'CONFIG_CACHE_PATTERNS_ROTATABLE_SECRET',
    value: 'rotate-me-demo-token-v2'
  });
  const rotatedSecret = ASTX.Secrets.get({
    provider: 'script_properties',
    key: 'CONFIG_CACHE_PATTERNS_ROTATABLE_SECRET'
  });

  try {
    const setMany = ASTX.Cache.setMany([
      { key: 'runtime:alpha', value: { id: 'alpha' } },
      { key: 'runtime:beta', value: { id: 'beta' } },
      { key: 'stale:gamma', value: { id: 'gamma', stale: true } }
    ], Object.assign({}, cacheOptions, {
      tags: ['config']
    }));

    const fetchMany = ASTX.Cache.fetchMany(
      ['runtime:alpha', 'runtime:delta', 'runtime:epsilon'],
      function (payload) {
        return {
          id: payload.requestedKey,
          createdBy: 'resolver'
        };
      },
      Object.assign({}, cacheOptions, {
        tags: ['runtime']
      })
    );

    const invalidateByTag = ASTX.Cache.invalidateByTag('config', cacheOptions);

    ASTX.Cache.setMany([
      { key: 'pref:one', value: { id: 1 } },
      { key: 'pref:two', value: { id: 2 } },
      { key: 'other:three', value: { id: 3 } }
    ], Object.assign({}, cacheOptions, {
      tags: ['prefix']
    }));
    const invalidateByPrefix = ASTX.Cache.invalidateByPrefix('pref:', cacheOptions);

    ASTX.Cache.setMany([
      { key: 'pred:one', value: { score: 10 } },
      { key: 'pred:two', value: { score: 20 } },
      { key: 'pred:three', value: { score: 30 } }
    ], Object.assign({}, cacheOptions, {
      tags: ['predicate', 'stale']
    }));
    const invalidateByPredicate = ASTX.Cache.invalidateByPredicate(function (entry) {
      return entry.value.score >= 20;
    }, cacheOptions);

    const statsBeforeClear = ASTX.Cache.stats(cacheOptions);
    const cleared = ASTX.Cache.clear(cacheOptions);

    output.durationMs = Date.now() - startedAtMs;
    output.runtime = {
      configuredModules: runtimeSummary.configuredModules,
      failedModules: runtimeSummary.failedModules
    };
    output.secrets = {
      provider: 'script_properties',
      rotated: rotateResult.rotated === true,
      previousExists: Boolean(rotateResult.metadata && rotateResult.metadata.previousExists),
      before: cookbookMaskSecret_(originalSecret.value),
      afterRotate: cookbookMaskSecret_(rotatedSecret.value),
      restored: false
    };
    output.cache = {
      backend: backend,
      namespace: cacheOptions.namespace,
      setManyCount: setMany.count,
      fetchMany: fetchMany.stats,
      invalidateByTag: invalidateByTag,
      invalidateByPrefix: {
        deleted: invalidateByPrefix.deleted,
        failed: invalidateByPrefix.failed
      },
      invalidateByPredicate: {
        deleted: invalidateByPredicate.deleted,
        failed: invalidateByPredicate.failed
      },
      statsBeforeClear: statsBeforeClear,
      cleared: cleared
    };
    return output;
  } finally {
    ASTX.Secrets.set({
      provider: 'script_properties',
      key: 'CONFIG_CACHE_PATTERNS_ROTATABLE_SECRET',
      value: originalSecret.value
    });
    if (output.secrets) {
      output.secrets.restored = true;
    }
    ASTX.Cache.clear(cacheOptions);
  }
}
