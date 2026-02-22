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
    'lockTimeoutMs'
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

function astCacheSelectBackendAdapter(config) {
  switch (config.backend) {
    case 'memory':
      return {
        get: keyHash => astCacheMemoryGet(keyHash, astCacheNowMs(), config),
        set: entry => astCacheMemorySet(entry, astCacheNowMs(), config),
        delete: keyHash => astCacheMemoryDelete(keyHash, astCacheNowMs(), config),
        invalidateByTag: tag => astCacheMemoryInvalidateByTag(tag, astCacheNowMs(), config),
        stats: () => astCacheMemoryStats(astCacheNowMs(), config),
        clear: () => astCacheMemoryClearNamespace(config)
      };
    case 'drive_json':
      return {
        get: keyHash => astCacheDriveGet(keyHash, config),
        set: entry => astCacheDriveSet(entry, config),
        delete: keyHash => astCacheDriveDelete(keyHash, config),
        invalidateByTag: tag => astCacheDriveInvalidateByTag(tag, config),
        stats: () => astCacheDriveStats(config),
        clear: () => astCacheDriveClearNamespace(config)
      };
    case 'script_properties':
      return {
        get: keyHash => astCacheScriptPropertiesGet(keyHash, config),
        set: entry => astCacheScriptPropertiesSet(entry, config),
        delete: keyHash => astCacheScriptPropertiesDelete(keyHash, config),
        invalidateByTag: tag => astCacheScriptPropertiesInvalidateByTag(tag, config),
        stats: () => astCacheScriptPropertiesStatsSnapshot(config),
        clear: () => astCacheScriptPropertiesClearNamespace(config)
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
  const adapter = astCacheSelectBackendAdapter(config);

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
