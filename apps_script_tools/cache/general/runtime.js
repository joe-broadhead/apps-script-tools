const AST_CACHE_INTERNAL_KEY_PREFIX = '__ast_cache_internal__';

let AST_CACHE_FETCH_RUNTIME_STATS = {};

function astCacheExtractConfigOverrides(options = {}) {
  if (!astCacheIsPlainObject(options)) {
    throw new AstCacheValidationError('Cache options must be an object');
  }

  const inline = {};
  const keys = [
    'backend',
    'namespace',
    'defaultTtlSec',
    'defaultStaleTtlSec',
    'maxMemoryEntries',
    'driveFolderId',
    'driveFileName',
    'storageUri',
    'lockTimeoutMs',
    'lockScope',
    'updateStatsOnGet',
    'fetchCoalesce',
    'fetchCoalesceLeaseMs',
    'fetchCoalesceWaitMs',
    'fetchPollMs',
    'fetchServeStaleOnError',
    'traceCollector',
    'traceContext'
  ];

  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    if (typeof options[key] !== 'undefined') {
      inline[key] = options[key];
    }
  }

  if (astCacheIsPlainObject(options.config)) {
    return Object.assign({}, options.config, inline);
  }

  return inline;
}

function astCacheBuildTraceContext(baseContext = {}, operation, details = {}) {
  const output = astCacheIsPlainObject(baseContext)
    ? astCacheJsonClone(baseContext)
    : {};
  output.operation = operation;

  if (astCacheIsPlainObject(details)) {
    const detailKeys = Object.keys(details);
    for (let idx = 0; idx < detailKeys.length; idx += 1) {
      const key = detailKeys[idx];
      if (typeof details[key] === 'undefined') {
        continue;
      }
      output[key] = details[key];
    }
  }

  return output;
}

function astCacheBuildOperationConfig(config, requestOptions = {}, operation, details = {}) {
  const mergedConfig = Object.assign({}, config);
  const requestTraceCollector = typeof requestOptions.traceCollector === 'function'
    ? requestOptions.traceCollector
    : null;

  if (requestTraceCollector) {
    mergedConfig.traceCollector = requestTraceCollector;
  }

  const baseTraceContext = astCacheBuildTraceContext(
    Object.assign(
      {},
      astCacheIsPlainObject(config.traceContext) ? config.traceContext : {},
      astCacheIsPlainObject(requestOptions.traceContext) ? requestOptions.traceContext : {},
      {
        backend: config.backend,
        namespace: config.namespace
      }
    ),
    operation,
    details
  );

  mergedConfig.traceContext = baseTraceContext;
  return mergedConfig;
}

function astCacheSelectBackendAdapter(config, requestOptions = {}) {
  switch (config.backend) {
    case 'memory':
      return {
        get: keyHash => astCacheMemoryGet(
          keyHash,
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'get', { keyHash }),
          requestOptions
        ),
        set: entry => astCacheMemorySet(
          entry,
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'set', { keyHash: entry && entry.keyHash || null }),
          requestOptions
        ),
        delete: keyHash => astCacheMemoryDelete(
          keyHash,
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'delete', { keyHash }),
          requestOptions
        ),
        invalidateByTag: tag => astCacheMemoryInvalidateByTag(
          tag,
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        stats: () => astCacheMemoryStats(
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'stats')
        ),
        clear: () => astCacheMemoryClearNamespace(
          astCacheBuildOperationConfig(config, requestOptions, 'clear')
        )
      };
    case 'drive_json':
      return {
        get: keyHash => astCacheDriveGet(
          keyHash,
          astCacheBuildOperationConfig(config, requestOptions, 'get', { keyHash }),
          requestOptions
        ),
        set: entry => astCacheDriveSet(
          entry,
          astCacheBuildOperationConfig(config, requestOptions, 'set', { keyHash: entry && entry.keyHash || null }),
          requestOptions
        ),
        delete: keyHash => astCacheDriveDelete(
          keyHash,
          astCacheBuildOperationConfig(config, requestOptions, 'delete', { keyHash }),
          requestOptions
        ),
        invalidateByTag: tag => astCacheDriveInvalidateByTag(
          tag,
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        stats: () => astCacheDriveStats(
          astCacheBuildOperationConfig(config, requestOptions, 'stats')
        ),
        clear: () => astCacheDriveClearNamespace(
          astCacheBuildOperationConfig(config, requestOptions, 'clear')
        )
      };
    case 'script_properties':
      return {
        get: keyHash => astCacheScriptPropertiesGet(
          keyHash,
          astCacheBuildOperationConfig(config, requestOptions, 'get', { keyHash }),
          requestOptions
        ),
        set: entry => astCacheScriptPropertiesSet(
          entry,
          astCacheBuildOperationConfig(config, requestOptions, 'set', { keyHash: entry && entry.keyHash || null }),
          requestOptions
        ),
        delete: keyHash => astCacheScriptPropertiesDelete(
          keyHash,
          astCacheBuildOperationConfig(config, requestOptions, 'delete', { keyHash }),
          requestOptions
        ),
        invalidateByTag: tag => astCacheScriptPropertiesInvalidateByTag(
          tag,
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        stats: () => astCacheScriptPropertiesStatsSnapshot(
          astCacheBuildOperationConfig(config, requestOptions, 'stats')
        ),
        clear: () => astCacheScriptPropertiesClearNamespace(
          astCacheBuildOperationConfig(config, requestOptions, 'clear')
        )
      };
    case 'storage_json':
      return {
        get: keyHash => astCacheStorageGet(
          keyHash,
          astCacheBuildOperationConfig(config, requestOptions, 'get', { keyHash }),
          requestOptions
        ),
        set: entry => astCacheStorageSet(
          entry,
          astCacheBuildOperationConfig(config, requestOptions, 'set', { keyHash: entry && entry.keyHash || null }),
          requestOptions
        ),
        delete: keyHash => astCacheStorageDelete(
          keyHash,
          astCacheBuildOperationConfig(config, requestOptions, 'delete', { keyHash }),
          requestOptions
        ),
        invalidateByTag: tag => astCacheStorageInvalidateByTag(
          tag,
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        stats: () => astCacheStorageStats(
          astCacheBuildOperationConfig(config, requestOptions, 'stats'),
          requestOptions
        ),
        clear: () => astCacheStorageClearNamespace(
          astCacheBuildOperationConfig(config, requestOptions, 'clear'),
          requestOptions
        )
      };
    default:
      throw new AstCacheValidationError(
        `Cache backend must be one of: ${AST_CACHE_BACKENDS.join(', ')}`,
        { backend: config.backend }
      );
  }
}

function astCacheGetOptions(options = {}) {
  if (!astCacheIsPlainObject(options)) {
    throw new AstCacheValidationError('Cache options must be an object');
  }

  return options;
}

function astCacheBuildResolvedContext(options = {}) {
  const safeOptions = astCacheGetOptions(options);
  const configOverrides = astCacheExtractConfigOverrides(safeOptions);
  const config = astCacheResolveConfig(configOverrides);
  const adapter = astCacheSelectBackendAdapter(config, safeOptions);

  return {
    options: safeOptions,
    config,
    adapter
  };
}

function astCacheFetchStatsKey(config) {
  return `${config.backend}::${config.namespace}`;
}

function astCacheBuildFetchStats() {
  return {
    freshHits: 0,
    staleHits: 0,
    misses: 0,
    resolverRuns: 0,
    resolverErrors: 0,
    staleServedOnError: 0,
    coalescedLeaders: 0,
    coalescedFollowers: 0,
    coalescedWaits: 0,
    coalescedTimeouts: 0
  };
}

function astCacheGetFetchStatsBucket(config) {
  const key = astCacheFetchStatsKey(config);
  if (!AST_CACHE_FETCH_RUNTIME_STATS[key]) {
    AST_CACHE_FETCH_RUNTIME_STATS[key] = astCacheBuildFetchStats();
  }
  return AST_CACHE_FETCH_RUNTIME_STATS[key];
}

function astCacheRecordFetchStat(config, key, increment = 1) {
  const bucket = astCacheGetFetchStatsBucket(config);
  bucket[key] = (bucket[key] || 0) + increment;
}

function astCacheResetFetchStats(config) {
  delete AST_CACHE_FETCH_RUNTIME_STATS[astCacheFetchStatsKey(config)];
}

function astCacheGetFetchStats(config) {
  return astCacheJsonClone(astCacheGetFetchStatsBucket(config));
}

function astCacheBuildInternalKey(normalizedKey, suffix) {
  return `${normalizedKey}::${AST_CACHE_INTERNAL_KEY_PREFIX}:${suffix}`;
}

function astCacheSleepMs(ms) {
  const sleepMs = astCacheNormalizePositiveInt(ms, 0, 0, 10000);
  if (!sleepMs) {
    return;
  }

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.sleep === 'function'
  ) {
    Utilities.sleep(sleepMs);
  }
}

function astCacheResolveFetchOptions(config, options = {}) {
  const freshTtlSec = astCacheResolveTtlSec(options.ttlSec, config.defaultTtlSec);
  const staleTtlSec = astCacheResolveTtlSec(options.staleTtlSec, config.defaultStaleTtlSec);

  const coalesce = astCacheResolveConfigBoolean([
    options.coalesce,
    options.fetchCoalesce
  ], config.fetchCoalesce);

  const coalesceLeaseMs = astCacheResolveConfigNumber([
    options.coalesceLeaseMs,
    options.fetchCoalesceLeaseMs
  ], config.fetchCoalesceLeaseMs, 250, 300000);

  const coalesceWaitMs = astCacheResolveConfigNumber([
    options.coalesceWaitMs,
    options.fetchCoalesceWaitMs
  ], config.fetchCoalesceWaitMs, 0, 300000);

  const pollMs = astCacheResolveConfigNumber([
    options.pollMs,
    options.fetchPollMs
  ], config.fetchPollMs, 0, 10000);

  const serveStaleOnError = astCacheResolveConfigBoolean([
    options.serveStaleOnError,
    options.fetchServeStaleOnError
  ], config.fetchServeStaleOnError);

  const allowStaleWhileRevalidate = staleTtlSec > 0 && astCacheResolveConfigBoolean([
    options.allowStaleWhileRevalidate,
    options.allowStale
  ], true);

  const forceRefresh = astCacheResolveConfigBoolean([
    options.forceRefresh,
    options.refresh
  ], false);

  return {
    freshTtlSec,
    staleTtlSec,
    coalesce,
    coalesceLeaseMs,
    coalesceWaitMs,
    pollMs,
    serveStaleOnError,
    allowStaleWhileRevalidate,
    forceRefresh
  };
}

function astCacheBuildFetchResult(context, keyHash, value, details = {}) {
  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    keyHash,
    cacheHit: details.cacheHit === true,
    stale: details.stale === true,
    source: astCacheNormalizeString(details.source, 'resolver'),
    refreshed: details.refreshed === true,
    coalesced: details.coalesced === true,
    waitMs: astCacheNormalizePositiveInt(details.waitMs, 0, 0, 300000),
    value: astCacheJsonClone(value)
  };
}

function astCacheFetchPersist(context, normalizedKey, keyHash, value, tags, fetchOptions) {
  const nowMs = astCacheNowMs();
  const staleNormalizedKey = astCacheBuildInternalKey(normalizedKey, 'stale');
  const staleKeyHash = astCacheHashKey(staleNormalizedKey);
  const primaryEntry = astCacheBuildEntry({
    normalizedKey,
    keyHash,
    value,
    tags,
    ttlSec: fetchOptions.freshTtlSec,
    nowMs
  });
  context.adapter.set(primaryEntry);

  if (fetchOptions.staleTtlSec > 0) {
    const staleEntry = astCacheBuildEntry({
      normalizedKey: staleNormalizedKey,
      keyHash: staleKeyHash,
      value,
      tags,
      ttlSec: fetchOptions.freshTtlSec + fetchOptions.staleTtlSec,
      nowMs
    });
    context.adapter.set(staleEntry);
    return;
  }

  astCacheTryOrFallback(() => context.adapter.delete(staleKeyHash), false);
}

function astCacheFetchReleaseLease(context, leaseKeyHash, ownerId) {
  const normalizedOwnerId = astCacheNormalizeString(ownerId, '');
  if (!normalizedOwnerId) {
    return false;
  }

  function attemptRelease() {
    const currentLease = astCacheFetchReadEntry(context, leaseKeyHash, true);
    if (!currentLease || !currentLease.value || currentLease.value.ownerId !== normalizedOwnerId) {
      return false;
    }
    return astCacheTryOrFallback(() => context.adapter.delete(leaseKeyHash), false);
  }

  try {
    return astCacheFetchRunWithAtomicLeaseLock(context, attemptRelease);
  } catch (_error) {
    return attemptRelease();
  }
}

function astCacheFetchRunWithAtomicLeaseLock(context, task) {
  const lockConfig = Object.assign({}, context.config);
  if (lockConfig.lockScope === 'none') {
    lockConfig.lockScope = 'script';
  }
  return astCacheRunWithLock(task, lockConfig);
}

function astCacheFetchGetReadAdapter(context) {
  if (context && context.__cacheFetchReadAdapter) {
    return context.__cacheFetchReadAdapter;
  }

  if (!context || context.config.updateStatsOnGet === false) {
    context.__cacheFetchReadAdapter = context.adapter;
    return context.adapter;
  }

  const readConfig = Object.assign({}, context.config, {
    updateStatsOnGet: false
  });
  const readAdapter = astCacheSelectBackendAdapter(readConfig, context.options);
  context.__cacheFetchReadAdapter = readAdapter;
  return readAdapter;
}

function astCacheFetchReadEntry(context, keyHash, readOnly) {
  if (!readOnly) {
    return context.adapter.get(keyHash);
  }

  const adapter = astCacheFetchGetReadAdapter(context);
  return adapter.get(keyHash);
}

function astCacheFetchTryAcquireLease(context, normalizedKey, leaseKeyHash, ownerId, fetchOptions) {
  function attemptLeaseWrite() {
    const existingLease = astCacheFetchReadEntry(context, leaseKeyHash, true);
    if (existingLease && existingLease.value && existingLease.value.ownerId) {
      return false;
    }

    const nowMs = astCacheNowMs();
    const leaseEntry = astCacheBuildEntry({
      normalizedKey: astCacheBuildInternalKey(normalizedKey, 'lease'),
      keyHash: leaseKeyHash,
      value: {
        ownerId,
        acquiredAtMs: nowMs
      },
      tags: [],
      ttlSec: Math.max(1, Math.ceil(fetchOptions.coalesceLeaseMs / 1000)),
      nowMs
    });

    context.adapter.set(leaseEntry);
    const confirmed = astCacheFetchReadEntry(context, leaseKeyHash, true);
    return Boolean(
      confirmed &&
      confirmed.value &&
      confirmed.value.ownerId === ownerId
    );
  }

  try {
    return astCacheFetchRunWithAtomicLeaseLock(context, attemptLeaseWrite);
  } catch (_error) {
    return attemptLeaseWrite();
  }
}

function astCacheFetchWaitForLeader(context, keyHash, leaseKeyHash, waitMs, pollMs) {
  const safeWaitMs = astCacheNormalizePositiveInt(waitMs, 0, 0, 300000);
  const safePollMs = astCacheNormalizePositiveInt(pollMs, 50, 0, 10000);
  const effectivePollMs = safePollMs > 0
    ? safePollMs
    : Math.min(50, Math.max(1, safeWaitMs));
  if (safeWaitMs <= 0) {
    return {
      entry: null,
      waitedMs: 0,
      timedOut: false
    };
  }

  const startedAtMs = astCacheNowMs();
  let iterations = 0;
  const hardMaxIterations = Math.max(
    100,
    Math.ceil((safeWaitMs + 1000) / Math.max(effectivePollMs, 1)) * 4
  );

  while (true) {
    iterations += 1;
    const freshEntry = astCacheFetchReadEntry(context, keyHash, true);
    if (freshEntry) {
      return {
        entry: freshEntry,
        waitedMs: Math.max(0, astCacheNowMs() - startedAtMs),
        timedOut: false
      };
    }

    const leaseEntry = astCacheFetchReadEntry(context, leaseKeyHash, true);
    if (!leaseEntry) {
      return {
        entry: null,
        waitedMs: Math.max(0, astCacheNowMs() - startedAtMs),
        timedOut: false
      };
    }

    const elapsedMs = Math.max(0, astCacheNowMs() - startedAtMs);
    if (elapsedMs >= safeWaitMs) {
      break;
    }
    if (iterations >= hardMaxIterations) {
      break;
    }

    astCacheSleepMs(Math.min(effectivePollMs, safeWaitMs - elapsedMs));
  }

  return {
    entry: null,
    waitedMs: Math.max(0, astCacheNowMs() - startedAtMs),
    timedOut: true
  };
}

function astCacheFetchResolveAndPersist(
  context,
  normalizedKey,
  keyHash,
  resolver,
  fetchOptions,
  staleEntry,
  details = {}
) {
  const tags = astCacheNormalizeTags(context.options.tags);
  const staleValue = staleEntry ? astCacheJsonClone(staleEntry.value) : null;

  astCacheRecordFetchStat(context.config, 'resolverRuns', 1);

  try {
    const resolvedValue = resolver({
      key: normalizedKey,
      keyHash,
      staleValue,
      backend: context.config.backend,
      namespace: context.config.namespace,
      options: astCacheJsonClone(context.options)
    });

    astCacheFetchPersist(context, normalizedKey, keyHash, resolvedValue, tags, fetchOptions);
    return astCacheBuildFetchResult(context, keyHash, resolvedValue, Object.assign({}, details, {
      cacheHit: false,
      stale: false,
      source: 'resolver',
      refreshed: true
    }));
  } catch (error) {
    astCacheRecordFetchStat(context.config, 'resolverErrors', 1);
    if (staleEntry && fetchOptions.serveStaleOnError) {
      astCacheRecordFetchStat(context.config, 'staleHits', 1);
      astCacheRecordFetchStat(context.config, 'staleServedOnError', 1);
      return astCacheBuildFetchResult(context, keyHash, staleEntry.value, Object.assign({}, details, {
        cacheHit: true,
        stale: true,
        source: 'stale',
        refreshed: false
      }));
    }
    throw error;
  }
}

function astCacheNormalizeBatchKeys(keys, fieldName = 'keys') {
  if (!Array.isArray(keys)) {
    throw new AstCacheValidationError(`Cache ${fieldName} must be an array`);
  }

  const normalized = [];
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const normalizedKey = astCacheNormalizeKey(key);
    normalized.push({
      key: astCacheJsonClone(key),
      normalizedKey,
      keyHash: astCacheHashKey(normalizedKey)
    });
  }

  return normalized;
}

function astCacheNormalizeBatchEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new AstCacheValidationError('Cache entries must be an array');
  }

  const normalized = [];
  for (let idx = 0; idx < entries.length; idx += 1) {
    const entry = entries[idx];
    if (!astCacheIsPlainObject(entry)) {
      throw new AstCacheValidationError('Cache setMany entries must be plain objects');
    }

    if (!Object.prototype.hasOwnProperty.call(entry, 'key')) {
      throw new AstCacheValidationError('Cache setMany entries require key');
    }

    if (!Object.prototype.hasOwnProperty.call(entry, 'value')) {
      throw new AstCacheValidationError('Cache setMany entries require value');
    }

    const normalizedKey = astCacheNormalizeKey(entry.key);
    let entryOptions = {};
    if (typeof entry.options !== 'undefined') {
      if (!astCacheIsPlainObject(entry.options)) {
        throw new AstCacheValidationError('Cache setMany entry options must be an object');
      }
      entryOptions = entry.options;
    }

    if (typeof entry.ttlSec !== 'undefined' || typeof entry.tags !== 'undefined') {
      entryOptions = Object.assign({}, entryOptions, {
        ttlSec: typeof entry.ttlSec !== 'undefined' ? entry.ttlSec : entryOptions.ttlSec,
        tags: typeof entry.tags !== 'undefined' ? entry.tags : entryOptions.tags
      });
    }

    normalized.push({
      key: astCacheJsonClone(entry.key),
      value: entry.value,
      normalizedKey,
      keyHash: astCacheHashKey(normalizedKey),
      options: entryOptions
    });
  }

  return normalized;
}

function astCacheGetValueWithContext(context, normalizedKey, keyHash) {
  const resolvedKeyHash = typeof keyHash === 'string' && keyHash.length > 0
    ? keyHash
    : astCacheHashKey(normalizedKey);
  const entry = context.adapter.get(resolvedKeyHash);
  if (!entry) {
    return null;
  }

  return astCacheJsonClone(entry.value);
}

function astCacheSetValueWithContext(context, normalizedKey, keyHash, value, operationOptions = {}) {
  const resolvedKeyHash = typeof keyHash === 'string' && keyHash.length > 0
    ? keyHash
    : astCacheHashKey(normalizedKey);
  const safeOperationOptions = astCacheIsPlainObject(operationOptions)
    ? operationOptions
    : {};
  const staleKeyHash = astCacheHashKey(astCacheBuildInternalKey(normalizedKey, 'stale'));
  const leaseKeyHash = astCacheHashKey(astCacheBuildInternalKey(normalizedKey, 'lease'));
  const ttlSec = astCacheResolveTtlSec(safeOperationOptions.ttlSec, context.config.defaultTtlSec);
  const tags = astCacheNormalizeTags(safeOperationOptions.tags);
  const nowMs = astCacheNowMs();

  const entry = astCacheBuildEntry({
    normalizedKey,
    keyHash: resolvedKeyHash,
    value,
    tags,
    ttlSec,
    nowMs
  });

  const saved = context.adapter.set(entry);
  astCacheTryOrFallback(() => context.adapter.delete(staleKeyHash), false);
  astCacheTryOrFallback(() => context.adapter.delete(leaseKeyHash), false);
  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    keyHash: saved.keyHash,
    ttlSec,
    tags: saved.tags.slice(),
    expiresAt: typeof saved.expiresAtMs === 'number' ? new Date(saved.expiresAtMs).toISOString() : null
  };
}

function astCacheDeleteValueWithContext(context, normalizedKey, keyHash) {
  const resolvedKeyHash = typeof keyHash === 'string' && keyHash.length > 0
    ? keyHash
    : astCacheHashKey(normalizedKey);
  const staleKeyHash = astCacheHashKey(astCacheBuildInternalKey(normalizedKey, 'stale'));
  const leaseKeyHash = astCacheHashKey(astCacheBuildInternalKey(normalizedKey, 'lease'));
  const deleted = context.adapter.delete(resolvedKeyHash);
  astCacheTryOrFallback(() => context.adapter.delete(staleKeyHash), false);
  astCacheTryOrFallback(() => context.adapter.delete(leaseKeyHash), false);
  return deleted;
}

function astCacheFetchValueWithContext(context, normalizedKey, keyHash, resolver) {
  const resolvedKeyHash = typeof keyHash === 'string' && keyHash.length > 0
    ? keyHash
    : astCacheHashKey(normalizedKey);
  const staleKeyHash = astCacheHashKey(astCacheBuildInternalKey(normalizedKey, 'stale'));
  const leaseKeyHash = astCacheHashKey(astCacheBuildInternalKey(normalizedKey, 'lease'));
  const fetchOptions = astCacheResolveFetchOptions(context.config, context.options);

  if (!fetchOptions.forceRefresh) {
    const freshEntry = context.adapter.get(resolvedKeyHash);
    if (freshEntry) {
      astCacheRecordFetchStat(context.config, 'freshHits', 1);
      return astCacheBuildFetchResult(context, resolvedKeyHash, freshEntry.value, {
        cacheHit: true,
        stale: false,
        source: 'fresh',
        refreshed: false
      });
    }
  }

  astCacheRecordFetchStat(context.config, 'misses', 1);
  const staleEntry = fetchOptions.allowStaleWhileRevalidate
    ? context.adapter.get(staleKeyHash)
    : null;

  if (!fetchOptions.coalesce) {
    return astCacheFetchResolveAndPersist(
      context,
      normalizedKey,
      resolvedKeyHash,
      resolver,
      fetchOptions,
      staleEntry
    );
  }

  const ownerId = `${astCacheNowMs()}_${Math.floor(Math.random() * 1000000000)}`;
  const leaseAcquired = astCacheFetchTryAcquireLease(
    context,
    normalizedKey,
    leaseKeyHash,
    ownerId,
    fetchOptions
  );

  if (leaseAcquired) {
    astCacheRecordFetchStat(context.config, 'coalescedLeaders', 1);
    try {
      return astCacheFetchResolveAndPersist(
        context,
        normalizedKey,
        resolvedKeyHash,
        resolver,
        fetchOptions,
        staleEntry
      );
    } finally {
      astCacheFetchReleaseLease(context, leaseKeyHash, ownerId);
    }
  }

  astCacheRecordFetchStat(context.config, 'coalescedFollowers', 1);

  if (staleEntry && fetchOptions.allowStaleWhileRevalidate) {
    astCacheRecordFetchStat(context.config, 'staleHits', 1);
    return astCacheBuildFetchResult(context, resolvedKeyHash, staleEntry.value, {
      cacheHit: true,
      stale: true,
      source: 'stale',
      refreshed: false,
      coalesced: true,
      waitMs: 0
    });
  }

  astCacheRecordFetchStat(context.config, 'coalescedWaits', 1);
  const waitResult = astCacheFetchWaitForLeader(
    context,
    resolvedKeyHash,
    leaseKeyHash,
    fetchOptions.coalesceWaitMs,
    fetchOptions.pollMs
  );

  if (waitResult.entry) {
    astCacheRecordFetchStat(context.config, 'freshHits', 1);
    return astCacheBuildFetchResult(context, resolvedKeyHash, waitResult.entry.value, {
      cacheHit: true,
      stale: false,
      source: 'fresh',
      refreshed: false,
      coalesced: true,
      waitMs: waitResult.waitedMs
    });
  }

  if (waitResult.timedOut) {
    astCacheRecordFetchStat(context.config, 'coalescedTimeouts', 1);
  }

  const fallbackLeaseAcquired = astCacheFetchTryAcquireLease(
    context,
    normalizedKey,
    leaseKeyHash,
    ownerId,
    fetchOptions
  );

  if (fallbackLeaseAcquired) {
    astCacheRecordFetchStat(context.config, 'coalescedLeaders', 1);
    try {
      return astCacheFetchResolveAndPersist(
        context,
        normalizedKey,
        resolvedKeyHash,
        resolver,
        fetchOptions,
        staleEntry,
        {
          coalesced: true,
          waitMs: waitResult.waitedMs
        }
      );
    } finally {
      astCacheFetchReleaseLease(context, leaseKeyHash, ownerId);
    }
  }

  astCacheRecordFetchStat(context.config, 'coalescedWaits', 1);
  const followUpWaitResult = astCacheFetchWaitForLeader(
    context,
    resolvedKeyHash,
    leaseKeyHash,
    fetchOptions.coalesceWaitMs,
    fetchOptions.pollMs
  );
  const totalWaitMs = waitResult.waitedMs + followUpWaitResult.waitedMs;

  if (followUpWaitResult.entry) {
    astCacheRecordFetchStat(context.config, 'freshHits', 1);
    return astCacheBuildFetchResult(context, resolvedKeyHash, followUpWaitResult.entry.value, {
      cacheHit: true,
      stale: false,
      source: 'fresh',
      refreshed: false,
      coalesced: true,
      waitMs: totalWaitMs
    });
  }

  if (followUpWaitResult.timedOut) {
    astCacheRecordFetchStat(context.config, 'coalescedTimeouts', 1);
  }

  if (staleEntry && fetchOptions.allowStaleWhileRevalidate) {
    astCacheRecordFetchStat(context.config, 'staleHits', 1);
    return astCacheBuildFetchResult(context, resolvedKeyHash, staleEntry.value, {
      cacheHit: true,
      stale: true,
      source: 'stale',
      refreshed: false,
      coalesced: true,
      waitMs: totalWaitMs
    });
  }

  throw new AstCacheError('Cache fetch coalescing lease unavailable after wait', {
    keyHash: resolvedKeyHash,
    coalesceWaitMs: fetchOptions.coalesceWaitMs,
    waitMs: totalWaitMs
  });
}

function astCacheGetValue(key, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const keyHash = astCacheHashKey(normalizedKey);
  return astCacheGetValueWithContext(context, normalizedKey, keyHash);
}

function astCacheGetManyValues(keys, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedItems = astCacheNormalizeBatchKeys(keys);
  const items = [];
  let hits = 0;
  let misses = 0;

  for (let idx = 0; idx < normalizedItems.length; idx += 1) {
    const item = normalizedItems[idx];
    const value = astCacheGetValueWithContext(context, item.normalizedKey, item.keyHash);
    const isHit = value !== null;
    if (isHit) {
      hits += 1;
    } else {
      misses += 1;
    }

    items.push({
      key: item.key,
      keyHash: item.keyHash,
      status: isHit ? 'hit' : 'miss',
      value
    });
  }

  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    operation: 'get_many',
    count: normalizedItems.length,
    items,
    stats: {
      requested: normalizedItems.length,
      processed: normalizedItems.length,
      hits,
      misses
    }
  };
}

function astCacheSetValue(key, value, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const keyHash = astCacheHashKey(normalizedKey);
  return astCacheSetValueWithContext(context, normalizedKey, keyHash, value, context.options);
}

function astCacheSetManyValues(entries, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedEntries = astCacheNormalizeBatchEntries(entries);
  const items = [];

  for (let idx = 0; idx < normalizedEntries.length; idx += 1) {
    const entry = normalizedEntries[idx];
    const entryOptions = Object.assign({}, context.options, entry.options);
    const saved = astCacheSetValueWithContext(
      context,
      entry.normalizedKey,
      entry.keyHash,
      entry.value,
      entryOptions
    );

    items.push({
      key: entry.key,
      keyHash: saved.keyHash,
      status: 'set',
      ttlSec: saved.ttlSec,
      tags: saved.tags.slice(),
      expiresAt: saved.expiresAt
    });
  }

  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    operation: 'set_many',
    count: normalizedEntries.length,
    items,
    stats: {
      requested: normalizedEntries.length,
      processed: normalizedEntries.length,
      set: normalizedEntries.length
    }
  };
}

function astCacheDeleteValue(key, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const keyHash = astCacheHashKey(normalizedKey);
  return astCacheDeleteValueWithContext(context, normalizedKey, keyHash);
}

function astCacheDeleteManyValues(keys, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedItems = astCacheNormalizeBatchKeys(keys);
  const items = [];
  let deletedCount = 0;
  let notFoundCount = 0;

  for (let idx = 0; idx < normalizedItems.length; idx += 1) {
    const item = normalizedItems[idx];
    const deleted = astCacheDeleteValueWithContext(context, item.normalizedKey, item.keyHash);
    if (deleted) {
      deletedCount += 1;
    } else {
      notFoundCount += 1;
    }

    items.push({
      key: item.key,
      keyHash: item.keyHash,
      status: deleted ? 'deleted' : 'not_found',
      deleted
    });
  }

  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    operation: 'delete_many',
    count: normalizedItems.length,
    items,
    stats: {
      requested: normalizedItems.length,
      processed: normalizedItems.length,
      deleted: deletedCount,
      notFound: notFoundCount
    }
  };
}

function astCacheFetchValue(key, resolver, options = {}) {
  if (typeof resolver !== 'function') {
    throw new AstCacheValidationError('Cache fetch resolver must be a function');
  }

  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const keyHash = astCacheHashKey(normalizedKey);
  return astCacheFetchValueWithContext(context, normalizedKey, keyHash, resolver);
}

function astCacheFetchManyValues(keys, resolver, options = {}) {
  if (typeof resolver !== 'function') {
    throw new AstCacheValidationError('Cache fetchMany resolver must be a function');
  }

  const context = astCacheBuildResolvedContext(options);
  const normalizedItems = astCacheNormalizeBatchKeys(keys);
  const items = [];
  let hits = 0;
  let misses = 0;
  let staleHits = 0;

  for (let idx = 0; idx < normalizedItems.length; idx += 1) {
    const item = normalizedItems[idx];
    const result = astCacheFetchValueWithContext(
      context,
      item.normalizedKey,
      item.keyHash,
      payload => resolver(Object.assign({}, payload, {
        requestedKey: astCacheJsonClone(item.key),
        index: idx,
        total: normalizedItems.length
      }))
    );

    if (result.cacheHit) {
      hits += 1;
    } else {
      misses += 1;
    }

    if (result.stale) {
      staleHits += 1;
    }

    items.push({
      key: item.key,
      keyHash: result.keyHash,
      status: result.cacheHit ? 'hit' : 'miss',
      cacheHit: result.cacheHit,
      stale: result.stale,
      source: result.source,
      refreshed: result.refreshed,
      coalesced: result.coalesced,
      waitMs: result.waitMs,
      value: result.value
    });
  }

  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    operation: 'fetch_many',
    count: normalizedItems.length,
    items,
    stats: {
      requested: normalizedItems.length,
      processed: normalizedItems.length,
      hits,
      misses,
      staleHits
    }
  };
}

function astCacheInvalidateTag(tag, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  return context.adapter.invalidateByTag(tag);
}

function astCacheStats(options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const stats = context.adapter.stats();
  stats.fetch = astCacheGetFetchStats(context.config);
  return stats;
}

function astCacheClear(options = {}) {
  const context = astCacheBuildResolvedContext(options);
  astCacheResetFetchStats(context.config);
  return context.adapter.clear();
}
