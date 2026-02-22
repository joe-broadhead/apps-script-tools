let AST_CACHE_SCRIPT_PROPERTIES_STATS = {};

function astCacheScriptPropertiesStats(namespace) {
  if (!AST_CACHE_SCRIPT_PROPERTIES_STATS[namespace]) {
    AST_CACHE_SCRIPT_PROPERTIES_STATS[namespace] = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      evictions: 0,
      expired: 0
    };
  }

  return AST_CACHE_SCRIPT_PROPERTIES_STATS[namespace];
}

function astCacheScriptPropertiesHandle() {
  if (
    typeof PropertiesService === 'undefined' ||
    !PropertiesService ||
    typeof PropertiesService.getScriptProperties !== 'function'
  ) {
    throw new AstCacheCapabilityError('PropertiesService is required for cache script_properties backend');
  }

  const handle = PropertiesService.getScriptProperties();
  if (!handle) {
    throw new AstCacheCapabilityError('Unable to access script properties handle');
  }

  return handle;
}

function astCacheScriptPropertiesNamespaceKey(namespace) {
  const safeNamespace = astCacheNormalizeString(namespace, 'ast_cache')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toUpperCase();

  return `AST_CACHE_${safeNamespace}_MAP`;
}

function astCacheScriptPropertiesRunWithLock(task, config) {
  if (typeof task !== 'function') {
    throw new AstCacheCapabilityError('Cache script_properties lock task must be a function');
  }

  if (
    typeof LockService === 'undefined' ||
    !LockService ||
    typeof LockService.getScriptLock !== 'function'
  ) {
    return task();
  }

  const lock = LockService.getScriptLock();
  if (!lock || typeof lock.tryLock !== 'function') {
    return task();
  }

  const timeoutMs = astCacheNormalizePositiveInt(config.lockTimeoutMs, 30000, 1, 300000);
  const acquired = astCacheTryOrFallback(() => lock.tryLock(timeoutMs), false);
  if (!acquired) {
    throw new AstCacheCapabilityError('Unable to acquire cache script_properties lock', {
      timeoutMs
    });
  }

  try {
    return task();
  } finally {
    if (typeof lock.releaseLock === 'function') {
      astCacheTryOrFallback(() => lock.releaseLock(), null);
    }
  }
}

function astCacheScriptPropertiesDefaultDocument(namespace) {
  return {
    schemaVersion: '1.0',
    namespace,
    updatedAtMs: astCacheNowMs(),
    entries: {}
  };
}

function astCacheScriptPropertiesReadDocument(handle, propertyKey, namespace) {
  const raw = typeof handle.getProperty === 'function'
    ? handle.getProperty(propertyKey)
    : null;

  if (!raw) {
    return astCacheScriptPropertiesDefaultDocument(namespace);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    return astCacheScriptPropertiesDefaultDocument(namespace);
  }

  if (!astCacheIsPlainObject(parsed)) {
    return astCacheScriptPropertiesDefaultDocument(namespace);
  }

  if (!astCacheIsPlainObject(parsed.entries)) {
    parsed.entries = {};
  }

  parsed.namespace = astCacheNormalizeString(parsed.namespace, namespace);
  parsed.schemaVersion = astCacheNormalizeString(parsed.schemaVersion, '1.0');
  parsed.updatedAtMs = astCacheNormalizePositiveInt(parsed.updatedAtMs, astCacheNowMs(), 0, 9007199254740991);
  return parsed;
}

function astCacheScriptPropertiesWriteDocument(handle, propertyKey, document) {
  if (typeof handle.setProperty !== 'function') {
    throw new AstCacheCapabilityError('Script properties handle does not support setProperty');
  }

  const serialized = JSON.stringify(document);
  handle.setProperty(propertyKey, serialized);
}

function astCacheScriptPropertiesPruneExpired(document, nowMs, stats) {
  const keys = Object.keys(document.entries || {});
  let removed = 0;

  for (let idx = 0; idx < keys.length; idx += 1) {
    const keyHash = keys[idx];
    const entry = document.entries[keyHash];
    if (!astCacheIsExpired(entry, nowMs)) {
      continue;
    }

    delete document.entries[keyHash];
    removed += 1;
  }

  if (removed > 0) {
    stats.expired += removed;
  }
}

function astCacheScriptPropertiesTrimToMaxEntries(document, maxEntries, stats) {
  const keys = Object.keys(document.entries || {});
  if (keys.length <= maxEntries) {
    return;
  }

  keys.sort((left, right) => {
    const leftStamp = Number(document.entries[left] && document.entries[left].updatedAtMs || 0);
    const rightStamp = Number(document.entries[right] && document.entries[right].updatedAtMs || 0);
    return leftStamp - rightStamp;
  });

  const overflow = keys.length - maxEntries;
  for (let idx = 0; idx < overflow; idx += 1) {
    delete document.entries[keys[idx]];
  }

  stats.evictions += overflow;
}

function astCacheScriptPropertiesWithDocument(config, mutator) {
  return astCacheScriptPropertiesRunWithLock(() => {
    const handle = astCacheScriptPropertiesHandle();
    const propertyKey = astCacheScriptPropertiesNamespaceKey(config.namespace);
    const document = astCacheScriptPropertiesReadDocument(handle, propertyKey, config.namespace);
    const stats = astCacheScriptPropertiesStats(config.namespace);
    const nowMs = astCacheNowMs();

    astCacheScriptPropertiesPruneExpired(document, nowMs, stats);
    const result = mutator(document, nowMs, stats);
    document.updatedAtMs = nowMs;
    astCacheScriptPropertiesWriteDocument(handle, propertyKey, document);

    return result;
  }, config);
}

function astCacheScriptPropertiesGet(keyHash, config) {
  return astCacheScriptPropertiesWithDocument(config, (document, nowMs, stats) => {
    const entry = document.entries[keyHash];
    if (!entry) {
      stats.misses += 1;
      return null;
    }

    if (astCacheIsExpired(entry, nowMs)) {
      delete document.entries[keyHash];
      stats.expired += 1;
      stats.misses += 1;
      return null;
    }

    stats.hits += 1;
    return astCacheJsonClone(entry);
  });
}

function astCacheScriptPropertiesSet(entry, config) {
  return astCacheScriptPropertiesWithDocument(config, (document, nowMs, stats) => {
    const nextEntry = astCacheTouchEntry(entry, nowMs);
    document.entries[nextEntry.keyHash] = nextEntry;
    stats.sets += 1;
    astCacheScriptPropertiesTrimToMaxEntries(document, config.maxMemoryEntries, stats);
    return astCacheJsonClone(nextEntry);
  });
}

function astCacheScriptPropertiesDelete(keyHash, config) {
  return astCacheScriptPropertiesWithDocument(config, (document, _nowMs, stats) => {
    if (!document.entries[keyHash]) {
      return false;
    }

    delete document.entries[keyHash];
    stats.deletes += 1;
    return true;
  });
}

function astCacheScriptPropertiesInvalidateByTag(tag, config) {
  const normalizedTag = astCacheNormalizeString(tag, '');
  if (!normalizedTag) {
    throw new AstCacheValidationError('Cache invalidateByTag tag must be a non-empty string');
  }

  return astCacheScriptPropertiesWithDocument(config, (document, _nowMs, stats) => {
    const keys = Object.keys(document.entries || {});
    let removed = 0;

    for (let idx = 0; idx < keys.length; idx += 1) {
      const keyHash = keys[idx];
      const entry = document.entries[keyHash];
      if (!entry || !Array.isArray(entry.tags) || entry.tags.indexOf(normalizedTag) === -1) {
        continue;
      }

      delete document.entries[keyHash];
      removed += 1;
    }

    stats.invalidations += removed;
    return removed;
  });
}

function astCacheScriptPropertiesStatsSnapshot(config) {
  return astCacheScriptPropertiesWithDocument(config, (document, _nowMs, stats) => {
    return {
      backend: 'script_properties',
      namespace: document.namespace,
      entries: Object.keys(document.entries || {}).length,
      stats: astCacheJsonClone(stats)
    };
  });
}

function astCacheScriptPropertiesClearNamespace(config) {
  return astCacheScriptPropertiesWithDocument(config, (document, _nowMs, stats) => {
    const removed = Object.keys(document.entries || {}).length;
    document.entries = {};
    AST_CACHE_SCRIPT_PROPERTIES_STATS[config.namespace] = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      evictions: 0,
      expired: 0
    };
    return removed;
  });
}
