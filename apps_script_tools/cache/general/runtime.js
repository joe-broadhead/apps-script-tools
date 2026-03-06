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
    'driveNamespaceWarnBytes',
    'driveNamespaceMaxBytes',
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
        deleteManyByKeyHashes: keyHashes => astCacheMemoryDeleteMany(
          keyHashes,
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'deleteManyByKeyHashes')
        ),
        recordInvalidations: count => astCacheMemoryRecordInvalidations(
          count,
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'recordInvalidations')
        ),
        invalidateByTag: tag => astCacheMemoryInvalidateByTag(
          tag,
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        listEntries: options => astCacheMemoryListEntries(
          astCacheNowMs(),
          astCacheBuildOperationConfig(config, requestOptions, 'listEntries', options),
          options
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
        deleteManyByKeyHashes: keyHashes => astCacheDriveDeleteMany(
          keyHashes,
          astCacheBuildOperationConfig(config, requestOptions, 'deleteManyByKeyHashes')
        ),
        recordInvalidations: count => astCacheDriveRecordInvalidations(
          count,
          astCacheBuildOperationConfig(config, requestOptions, 'recordInvalidations')
        ),
        invalidateByTag: tag => astCacheDriveInvalidateByTag(
          tag,
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        listEntries: options => astCacheDriveListEntries(
          astCacheBuildOperationConfig(config, requestOptions, 'listEntries', options),
          options
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
        deleteManyByKeyHashes: keyHashes => astCacheScriptPropertiesDeleteMany(
          keyHashes,
          astCacheBuildOperationConfig(config, requestOptions, 'deleteManyByKeyHashes')
        ),
        recordInvalidations: count => astCacheScriptPropertiesRecordInvalidations(
          count,
          astCacheBuildOperationConfig(config, requestOptions, 'recordInvalidations')
        ),
        invalidateByTag: tag => astCacheScriptPropertiesInvalidateByTag(
          tag,
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        listEntries: options => astCacheScriptPropertiesListEntries(
          astCacheBuildOperationConfig(config, requestOptions, 'listEntries', options),
          options
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
        deleteManyByKeyHashes: keyHashes => {
          const safeKeyHashes = Array.isArray(keyHashes) ? keyHashes : [];
          let removed = 0;
          for (let idx = 0; idx < safeKeyHashes.length; idx += 1) {
            const keyHash = astCacheNormalizeString(safeKeyHashes[idx], '');
            if (!keyHash) {
              continue;
            }
            if (astCacheStorageDelete(
              keyHash,
              astCacheBuildOperationConfig(config, requestOptions, 'delete', { keyHash }),
              requestOptions
            )) {
              removed += 1;
            }
          }
          return removed;
        },
        recordInvalidations: count => astCacheStorageRecordInvalidations(
          count,
          astCacheBuildOperationConfig(config, requestOptions, 'recordInvalidations'),
          requestOptions
        ),
        invalidateByTag: tag => astCacheStorageInvalidateByTag(
          tag,
          astCacheBuildOperationConfig(config, requestOptions, 'invalidateByTag', { tag }),
          requestOptions
        ),
        listEntries: options => astCacheStorageListEntries(
          astCacheBuildOperationConfig(config, requestOptions, 'listEntries', options),
          requestOptions,
          options
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

function astCacheResolveScanOptions(options = {}) {
  return {
    includeInternal: options.includeInternal === true,
    maxScan: astCacheResolveConfigNumber([
      options.maxScan,
      options.limit
    ], 10000, 1, 1000000)
  };
}

function astCacheListEntriesWithContext(context, options = {}) {
  if (!context || !context.adapter || typeof context.adapter.listEntries !== 'function') {
    throw new AstCacheCapabilityError('Cache backend does not support entry enumeration', {
      backend: context && context.config ? context.config.backend : null
    });
  }

  const scanOptions = astCacheResolveScanOptions(options);
  return context.adapter.listEntries({
    includeInternal: scanOptions.includeInternal,
    maxItems: scanOptions.maxScan
  });
}

function astCacheDeleteMatchingEntries(context, entries, matcher, operation, details = {}) {
  const output = {
    backend: context.config.backend,
    namespace: context.config.namespace,
    operation,
    scanned: 0,
    matched: 0,
    deleted: 0,
    failed: 0,
    details: astCacheIsPlainObject(details) ? astCacheJsonClone(details) : {}
  };

  const safeEntries = Array.isArray(entries) ? entries : [];
  const matchedKeyHashes = [];
  for (let idx = 0; idx < safeEntries.length; idx += 1) {
    const entry = safeEntries[idx];
    output.scanned += 1;

    if (!entry || !entry.keyHash) {
      continue;
    }

    let matched = false;
    try {
      matched = matcher(entry) === true;
    } catch (error) {
      throw new AstCacheValidationError('Cache invalidation matcher threw an error', {
        operation,
        keyHash: entry.keyHash,
        normalizedKey: astCacheNormalizeString(entry.normalizedKey, '')
      }, error);
    }

    if (!matched) {
      continue;
    }

    output.matched += 1;
    matchedKeyHashes.push(entry.keyHash);
  }

  if (matchedKeyHashes.length === 0) {
    return output;
  }

  const uniqueKeyHashes = [];
  const seen = {};
  for (let idx = 0; idx < matchedKeyHashes.length; idx += 1) {
    const keyHash = astCacheNormalizeString(matchedKeyHashes[idx], '');
    if (!keyHash || seen[keyHash]) {
      continue;
    }
    seen[keyHash] = true;
    uniqueKeyHashes.push(keyHash);
  }

  if (typeof context.adapter.deleteManyByKeyHashes === 'function') {
    output.deleted = astCacheNormalizePositiveInt(
      astCacheTryOrFallback(() => context.adapter.deleteManyByKeyHashes(uniqueKeyHashes), 0),
      0,
      0,
      uniqueKeyHashes.length
    );
    output.failed = Math.max(0, uniqueKeyHashes.length - output.deleted);
    if (output.deleted > 0 && typeof context.adapter.recordInvalidations === 'function') {
      astCacheTryOrFallback(() => context.adapter.recordInvalidations(output.deleted), null);
    }
    return output;
  }

  for (let idx = 0; idx < uniqueKeyHashes.length; idx += 1) {
    const deleted = astCacheTryOrFallback(() => context.adapter.delete(uniqueKeyHashes[idx]), false);
    if (deleted) {
      output.deleted += 1;
      continue;
    }
    output.failed += 1;
  }

  if (output.deleted > 0 && typeof context.adapter.recordInvalidations === 'function') {
    astCacheTryOrFallback(() => context.adapter.recordInvalidations(output.deleted), null);
  }

  return output;
}

function astCacheBuildLockOwnerId(normalizedKey, options = {}) {
  const explicitOwnerId = astCacheNormalizeString(options.ownerId, '');
  if (explicitOwnerId) {
    return explicitOwnerId;
  }

  const entropySource = `${normalizedKey}|${astCacheNowMs()}|${Math.random()}`;
  return `lock_${astCacheHashKey(entropySource).slice(0, 24)}`;
}

function astCacheResolveLockOptions(context, options = {}) {
  const lockScope = astCacheNormalizeString(options.lockScope, context.config.lockScope).toLowerCase();
  if (['script', 'user', 'none'].indexOf(lockScope) === -1) {
    throw new AstCacheValidationError('Cache lock lockScope must be one of: script, user, none', {
      lockScope
    });
  }

  return {
    timeoutMs: astCacheResolveConfigNumber([
      options.timeoutMs,
      options.waitMs
    ], context.config.lockTimeoutMs, 0, 300000),
    leaseMs: astCacheResolveConfigNumber([
      options.leaseMs,
      options.ttlMs
    ], 30000, 250, 300000),
    pollMs: astCacheResolveConfigNumber([
      options.pollMs,
      options.intervalMs
    ], 75, 0, 10000),
    lockScope
  };
}

function astCacheTryAcquireScopedLock(context, normalizedLockKey, lockKeyHash, ownerId, lockOptions) {
  function attemptAcquire() {
    const existing = astCacheFetchReadEntry(context, lockKeyHash, true);
    if (existing && existing.value && existing.value.ownerId) {
      return false;
    }

    const nowMs = astCacheNowMs();
    const lockEntry = astCacheBuildEntry({
      normalizedKey: normalizedLockKey,
      keyHash: lockKeyHash,
      value: {
        ownerId,
        acquiredAtMs: nowMs
      },
      tags: [],
      ttlSec: Math.max(1, Math.ceil(lockOptions.leaseMs / 1000)),
      nowMs
    });
    context.adapter.set(lockEntry);

    const confirmed = astCacheFetchReadEntry(context, lockKeyHash, true);
    return Boolean(confirmed && confirmed.value && confirmed.value.ownerId === ownerId);
  }

  const lockConfig = Object.assign({}, context.config, {
    lockScope: lockOptions.lockScope
  });

  try {
    return astCacheRunWithLock(attemptAcquire, lockConfig);
  } catch (_error) {
    return attemptAcquire();
  }
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

function astCacheGetValueWithContext(context, normalizedKey, keyHash, includeMetadata = false) {
  const resolvedKeyHash = typeof keyHash === 'string' && keyHash.length > 0
    ? keyHash
    : astCacheHashKey(normalizedKey);
  const entry = context.adapter.get(resolvedKeyHash);
  if (!entry) {
    if (includeMetadata) {
      return {
        found: false,
        value: null
      };
    }
    return null;
  }

  const value = astCacheJsonClone(entry.value);
  if (includeMetadata) {
    return {
      found: true,
      value
    };
  }

  return value;
}

function astCacheSetValueWithContext(context, normalizedKey, keyHash, value, operationOptions = {}, cleanupMode = 'immediate') {
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
  const shouldDeferCleanup = cleanupMode === 'defer';
  if (!shouldDeferCleanup) {
    astCacheTryOrFallback(() => context.adapter.delete(staleKeyHash), false);
    astCacheTryOrFallback(() => context.adapter.delete(leaseKeyHash), false);
  }

  const output = {
    backend: context.config.backend,
    namespace: context.config.namespace,
    keyHash: saved.keyHash,
    ttlSec,
    tags: saved.tags.slice(),
    expiresAt: typeof saved.expiresAtMs === 'number' ? new Date(saved.expiresAtMs).toISOString() : null
  };

  if (shouldDeferCleanup) {
    output.cleanupKeyHashes = [staleKeyHash, leaseKeyHash];
  }

  return output;
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
    const resolved = astCacheGetValueWithContext(context, item.normalizedKey, item.keyHash, true);
    const isHit = resolved.found === true;
    if (isHit) {
      hits += 1;
    } else {
      misses += 1;
    }

    items.push({
      key: item.key,
      keyHash: item.keyHash,
      status: isHit ? 'hit' : 'miss',
      value: resolved.value
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
  const deferredCleanupKeyHashes = [];

  try {
    for (let idx = 0; idx < normalizedEntries.length; idx += 1) {
      const entry = normalizedEntries[idx];
      const entryOptions = Object.assign({}, context.options, entry.options);
      const saved = astCacheSetValueWithContext(
        context,
        entry.normalizedKey,
        entry.keyHash,
        entry.value,
        entryOptions,
        'defer'
      );

      if (Array.isArray(saved.cleanupKeyHashes)) {
        deferredCleanupKeyHashes.push(...saved.cleanupKeyHashes);
      }

      items.push({
        key: entry.key,
        keyHash: saved.keyHash,
        status: 'set',
        ttlSec: saved.ttlSec,
        tags: saved.tags.slice(),
        expiresAt: saved.expiresAt
      });
    }
  } finally {
    if (deferredCleanupKeyHashes.length > 0) {
      const uniqueCleanupKeyHashes = Array.from(new Set(deferredCleanupKeyHashes));
      if (typeof context.adapter.deleteManyByKeyHashes === 'function') {
        astCacheTryOrFallback(() => context.adapter.deleteManyByKeyHashes(uniqueCleanupKeyHashes), 0);
      } else {
        for (let idx = 0; idx < uniqueCleanupKeyHashes.length; idx += 1) {
          const cleanupKeyHash = uniqueCleanupKeyHashes[idx];
          astCacheTryOrFallback(() => context.adapter.delete(cleanupKeyHash), false);
        }
      }
    }
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
  const failFast = astCacheResolveConfigBoolean([
    context.options.failFast,
    context.options.fetchManyFailFast
  ], false);
  const items = [];
  let hits = 0;
  let misses = 0;
  let staleHits = 0;
  let errors = 0;

  for (let idx = 0; idx < normalizedItems.length; idx += 1) {
    const item = normalizedItems[idx];
    let result = null;
    try {
      result = astCacheFetchValueWithContext(
        context,
        item.normalizedKey,
        item.keyHash,
        payload => resolver(Object.assign({}, payload, {
          requestedKey: astCacheJsonClone(item.key),
          index: idx,
          total: normalizedItems.length
        }))
      );
    } catch (error) {
      if (failFast) {
        throw error;
      }

      errors += 1;
      items.push({
        key: item.key,
        keyHash: item.keyHash,
        status: 'error',
        cacheHit: false,
        stale: false,
        source: 'error',
        refreshed: false,
        coalesced: false,
        waitMs: 0,
        value: null,
        error: {
          name: astCacheNormalizeString(error && error.name, 'Error'),
          message: astCacheNormalizeString(error && error.message, String(error || 'Unknown error'))
        }
      });
      continue;
    }

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
      staleHits,
      errors
    }
  };
}

function astCacheInvalidateTag(tag, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  return context.adapter.invalidateByTag(tag);
}

function astCacheInvalidatePrefix(prefix, options = {}) {
  const normalizedPrefix = astCacheNormalizeString(prefix, '');
  if (!normalizedPrefix) {
    throw new AstCacheValidationError('Cache invalidateByPrefix prefix must be a non-empty string');
  }

  const context = astCacheBuildResolvedContext(options);
  const entries = astCacheListEntriesWithContext(context, options);
  return astCacheDeleteMatchingEntries(
    context,
    entries,
    entry => String(entry.normalizedKey || '').indexOf(normalizedPrefix) === 0,
    'invalidate_by_prefix',
    {
      prefix: normalizedPrefix
    }
  );
}

function astCacheInvalidatePredicate(predicate, options = {}) {
  if (typeof predicate !== 'function') {
    throw new AstCacheValidationError('Cache invalidateByPredicate predicate must be a function');
  }

  const context = astCacheBuildResolvedContext(options);
  const entries = astCacheListEntriesWithContext(context, options);
  return astCacheDeleteMatchingEntries(
    context,
    entries,
    entry => {
      const payload = {
        key: astCacheJsonClone(entry.normalizedKey),
        keyHash: entry.keyHash,
        tags: astCacheJsonClone(entry.tags || []),
        value: astCacheEnsureSerializable(entry.value, 'entry.value'),
        createdAtMs: entry.createdAtMs,
        updatedAtMs: entry.updatedAtMs,
        expiresAtMs: entry.expiresAtMs
      };
      return predicate(payload) === true;
    },
    'invalidate_by_predicate'
  );
}

function astCacheLock(key, task, options = {}) {
  if (typeof task !== 'function') {
    throw new AstCacheValidationError('Cache lock task must be a function');
  }

  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const normalizedLockKey = astCacheBuildInternalKey(normalizedKey, 'scoped_lock');
  const lockKeyHash = astCacheHashKey(normalizedLockKey);
  const lockOptions = astCacheResolveLockOptions(context, options);
  const ownerId = astCacheBuildLockOwnerId(normalizedKey, options);
  const startedAtMs = astCacheNowMs();
  const timeoutAtMs = startedAtMs + lockOptions.timeoutMs;
  const pollMs = lockOptions.pollMs > 0 ? lockOptions.pollMs : 25;

  let acquired = false;
  let attempts = 0;
  while (!acquired) {
    attempts += 1;
    acquired = astCacheTryAcquireScopedLock(
      context,
      normalizedLockKey,
      lockKeyHash,
      ownerId,
      lockOptions
    );

    if (acquired) {
      break;
    }

    if (astCacheNowMs() >= timeoutAtMs) {
      throw new AstCacheCapabilityError('Cache lock timeout exceeded', {
        keyHash: lockKeyHash,
        timeoutMs: lockOptions.timeoutMs,
        leaseMs: lockOptions.leaseMs,
        attempts
      });
    }

    astCacheSleepMs(pollMs);
  }

  const waitMs = Math.max(0, astCacheNowMs() - startedAtMs);
  let taskResult;
  let taskError = null;

  try {
    taskResult = task({
      backend: context.config.backend,
      namespace: context.config.namespace,
      keyHash: lockKeyHash,
      ownerId,
      waitMs,
      leaseMs: lockOptions.leaseMs,
      timeoutMs: lockOptions.timeoutMs,
      attempts
    });
  } catch (error) {
    taskError = error;
  } finally {
    astCacheFetchReleaseLease(context, lockKeyHash, ownerId);
  }

  if (taskError) {
    throw taskError;
  }

  const serializedTaskResult = typeof taskResult === 'undefined'
    ? null
    : astCacheEnsureSerializable(taskResult, 'lock.result');

  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    operation: 'lock',
    keyHash: lockKeyHash,
    ownerId,
    waitMs,
    leaseMs: lockOptions.leaseMs,
    timeoutMs: lockOptions.timeoutMs,
    attempts,
    result: serializedTaskResult
  };
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
