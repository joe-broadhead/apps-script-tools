function astCacheExtractConfigOverrides(options = {}) {
  if (!astCacheIsPlainObject(options)) {
    throw new AstCacheValidationError('Cache options must be an object');
  }

  const inline = {};
  const keys = [
    'backend',
    'namespace',
    'defaultTtlSec',
    'maxMemoryEntries',
    'driveFolderId',
    'driveFileName',
    'storageUri',
    'lockTimeoutMs',
    'lockScope',
    'updateStatsOnGet',
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

function astCacheGetValue(key, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const keyHash = astCacheHashKey(normalizedKey);
  const entry = context.adapter.get(keyHash);
  if (!entry) {
    return null;
  }

  return astCacheJsonClone(entry.value);
}

function astCacheSetValue(key, value, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const keyHash = astCacheHashKey(normalizedKey);
  const ttlSec = astCacheResolveTtlSec(context.options.ttlSec, context.config.defaultTtlSec);
  const tags = astCacheNormalizeTags(context.options.tags);
  const nowMs = astCacheNowMs();

  const entry = astCacheBuildEntry({
    normalizedKey,
    keyHash,
    value,
    tags,
    ttlSec,
    nowMs
  });

  const saved = context.adapter.set(entry);
  return {
    backend: context.config.backend,
    namespace: context.config.namespace,
    keyHash: saved.keyHash,
    ttlSec,
    tags: saved.tags.slice(),
    expiresAt: typeof saved.expiresAtMs === 'number' ? new Date(saved.expiresAtMs).toISOString() : null
  };
}

function astCacheDeleteValue(key, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  const normalizedKey = astCacheNormalizeKey(key);
  const keyHash = astCacheHashKey(normalizedKey);
  return context.adapter.delete(keyHash);
}

function astCacheInvalidateTag(tag, options = {}) {
  const context = astCacheBuildResolvedContext(options);
  return context.adapter.invalidateByTag(tag);
}

function astCacheStats(options = {}) {
  const context = astCacheBuildResolvedContext(options);
  return context.adapter.stats();
}

function astCacheClear(options = {}) {
  const context = astCacheBuildResolvedContext(options);
  return context.adapter.clear();
}
