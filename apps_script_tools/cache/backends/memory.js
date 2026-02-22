let AST_CACHE_MEMORY_STORES = {};

function astCacheMemoryBuildStats() {
  return {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    invalidations: 0,
    evictions: 0,
    expired: 0
  };
}

function astCacheMemoryGetNamespaceStore(config) {
  const namespace = astCacheNormalizeString(config.namespace, AST_CACHE_DEFAULT_CONFIG.namespace);
  if (!AST_CACHE_MEMORY_STORES[namespace]) {
    AST_CACHE_MEMORY_STORES[namespace] = {
      namespace,
      entries: {},
      stats: astCacheMemoryBuildStats()
    };
  }

  return AST_CACHE_MEMORY_STORES[namespace];
}

function astCacheMemoryPruneExpired(store, nowMs) {
  const keys = Object.keys(store.entries);
  let removed = 0;

  for (let idx = 0; idx < keys.length; idx += 1) {
    const keyHash = keys[idx];
    const entry = store.entries[keyHash];
    if (!astCacheIsExpired(entry, nowMs)) {
      continue;
    }

    delete store.entries[keyHash];
    removed += 1;
  }

  if (removed > 0) {
    store.stats.expired += removed;
  }

  return removed;
}

function astCacheMemoryTrimToMaxEntries(store, maxEntries) {
  const keyHashes = Object.keys(store.entries);
  if (keyHashes.length <= maxEntries) {
    return 0;
  }

  keyHashes.sort((left, right) => {
    const leftEntry = store.entries[left];
    const rightEntry = store.entries[right];
    const leftStamp = leftEntry ? leftEntry.updatedAtMs : 0;
    const rightStamp = rightEntry ? rightEntry.updatedAtMs : 0;
    return leftStamp - rightStamp;
  });

  let removed = 0;
  const overflow = keyHashes.length - maxEntries;
  for (let idx = 0; idx < overflow; idx += 1) {
    delete store.entries[keyHashes[idx]];
    removed += 1;
  }

  if (removed > 0) {
    store.stats.evictions += removed;
  }

  return removed;
}

function astCacheMemoryGet(keyHash, nowMs, config) {
  const store = astCacheMemoryGetNamespaceStore(config);
  astCacheMemoryPruneExpired(store, nowMs);

  const entry = store.entries[keyHash];
  if (!entry) {
    store.stats.misses += 1;
    return null;
  }

  store.stats.hits += 1;
  return astCacheJsonClone(entry);
}

function astCacheMemorySet(entry, nowMs, config) {
  const store = astCacheMemoryGetNamespaceStore(config);
  astCacheMemoryPruneExpired(store, nowMs);

  const nextEntry = astCacheTouchEntry(entry, nowMs);
  store.entries[nextEntry.keyHash] = nextEntry;
  store.stats.sets += 1;
  astCacheMemoryTrimToMaxEntries(store, config.maxMemoryEntries);

  return astCacheJsonClone(nextEntry);
}

function astCacheMemoryDelete(keyHash, nowMs, config) {
  const store = astCacheMemoryGetNamespaceStore(config);
  astCacheMemoryPruneExpired(store, nowMs);

  if (!store.entries[keyHash]) {
    return false;
  }

  delete store.entries[keyHash];
  store.stats.deletes += 1;
  return true;
}

function astCacheMemoryInvalidateByTag(tag, nowMs, config) {
  const store = astCacheMemoryGetNamespaceStore(config);
  astCacheMemoryPruneExpired(store, nowMs);

  const normalizedTag = astCacheNormalizeString(tag, '');
  if (!normalizedTag) {
    throw new AstCacheValidationError('Cache invalidateByTag tag must be a non-empty string');
  }

  const keys = Object.keys(store.entries);
  let removed = 0;
  for (let idx = 0; idx < keys.length; idx += 1) {
    const keyHash = keys[idx];
    const entry = store.entries[keyHash];
    if (!entry || !Array.isArray(entry.tags) || entry.tags.indexOf(normalizedTag) === -1) {
      continue;
    }
    delete store.entries[keyHash];
    removed += 1;
  }

  store.stats.invalidations += removed;
  return removed;
}

function astCacheMemoryStats(nowMs, config) {
  const store = astCacheMemoryGetNamespaceStore(config);
  astCacheMemoryPruneExpired(store, nowMs);

  return {
    backend: 'memory',
    namespace: store.namespace,
    entries: Object.keys(store.entries).length,
    stats: astCacheJsonClone(store.stats)
  };
}

function astCacheMemoryClearNamespace(config) {
  const store = astCacheMemoryGetNamespaceStore(config);
  const removed = Object.keys(store.entries).length;
  store.entries = {};
  store.stats = astCacheMemoryBuildStats();
  return removed;
}
