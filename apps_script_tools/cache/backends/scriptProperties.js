let AST_CACHE_SCRIPT_PROPERTIES_STATS = {};
const AST_CACHE_SCRIPT_PROPERTIES_MAX_VALUE_BYTES = 9000;

function astCacheScriptPropertiesUtf8ByteLength(value) {
  const normalized = String(value == null ? '' : value);

  try {
    if (
      typeof Utilities !== 'undefined' &&
      Utilities &&
      typeof Utilities.newBlob === 'function'
    ) {
      return Utilities.newBlob(normalized).getBytes().length;
    }
  } catch (_error) {
    // Fall through to deterministic JavaScript fallback.
  }

  try {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(normalized).length;
    }
  } catch (_error) {
    // Fall through to deterministic JavaScript fallback.
  }

  return unescape(encodeURIComponent(normalized)).length;
}

function astCacheScriptPropertiesMeasureDocument(document) {
  const serialized = JSON.stringify(document);
  return {
    serialized,
    bytes: astCacheScriptPropertiesUtf8ByteLength(serialized)
  };
}

function astCacheScriptPropertiesAssertEntryFitsLimit(entry, config) {
  const limitBytes = AST_CACHE_SCRIPT_PROPERTIES_MAX_VALUE_BYTES;
  const probe = astCacheScriptPropertiesDefaultDocument(config.namespace);
  probe.entries = {
    [entry.keyHash]: entry
  };
  const measured = astCacheScriptPropertiesMeasureDocument(probe);
  if (measured.bytes <= limitBytes) {
    return;
  }

  throw new AstCacheValidationError(
    'Cache script_properties entry exceeds per-property byte limit',
    {
      backend: 'script_properties',
      namespace: config.namespace,
      keyHash: entry.keyHash,
      bytes: measured.bytes,
      limitBytes
    }
  );
}

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
  const normalizedNamespace = astCacheNormalizeString(namespace, 'ast_cache');
  const namespaceHash = astCacheHashKey(normalizedNamespace);
  return `AST_CACHE_NS_${namespaceHash}_MAP`;
}

function astCacheScriptPropertiesRunWithLock(task, config) {
  return astCacheRunWithLock(task, config);
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

function astCacheScriptPropertiesTrimToMaxBytes(document, maxBytes, stats) {
  const keys = Object.keys(document.entries || {});
  if (keys.length === 0) {
    return astCacheScriptPropertiesMeasureDocument(document);
  }

  keys.sort((left, right) => {
    const leftStamp = Number(document.entries[left] && document.entries[left].updatedAtMs || 0);
    const rightStamp = Number(document.entries[right] && document.entries[right].updatedAtMs || 0);
    return leftStamp - rightStamp;
  });

  let measured = astCacheScriptPropertiesMeasureDocument(document);
  let removed = 0;

  for (let idx = 0; idx < keys.length && measured.bytes > maxBytes; idx += 1) {
    delete document.entries[keys[idx]];
    removed += 1;
    measured = astCacheScriptPropertiesMeasureDocument(document);
  }

  if (removed > 0) {
    stats.evictions += removed;
  }

  return measured;
}

function astCacheScriptPropertiesWriteDocument(handle, propertyKey, document, config, stats) {
  if (typeof handle.setProperty !== 'function') {
    throw new AstCacheCapabilityError('Script properties handle does not support setProperty');
  }

  const limitBytes = AST_CACHE_SCRIPT_PROPERTIES_MAX_VALUE_BYTES;
  let measured = astCacheScriptPropertiesMeasureDocument(document);

  if (measured.bytes > limitBytes) {
    measured = astCacheScriptPropertiesTrimToMaxBytes(document, limitBytes, stats);
  }

  if (measured.bytes > limitBytes) {
    throw new AstCacheValidationError(
      'Cache script_properties payload exceeds per-property byte limit',
      {
        backend: 'script_properties',
        namespace: config.namespace,
        propertyKey,
        bytes: measured.bytes,
        limitBytes
      }
    );
  }

  handle.setProperty(propertyKey, measured.serialized);
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
    astCacheScriptPropertiesWriteDocument(handle, propertyKey, document, config, stats);

    return result;
  }, config);
}

function astCacheScriptPropertiesGet(keyHash, config) {
  if (config.updateStatsOnGet === false) {
    const handle = astCacheScriptPropertiesHandle();
    const propertyKey = astCacheScriptPropertiesNamespaceKey(config.namespace);
    const document = astCacheScriptPropertiesReadDocument(handle, propertyKey, config.namespace);
    const nowMs = astCacheNowMs();
    const entry = document.entries[keyHash];
    if (!entry || astCacheIsExpired(entry, nowMs)) {
      return null;
    }
    return astCacheJsonClone(entry);
  }

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
    astCacheScriptPropertiesAssertEntryFitsLimit(nextEntry, config);
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

function astCacheScriptPropertiesDeleteMany(keyHashes, config) {
  const safeKeyHashes = Array.isArray(keyHashes)
    ? keyHashes
      .map(value => astCacheNormalizeString(value, ''))
      .filter(Boolean)
    : [];

  if (safeKeyHashes.length === 0) {
    return 0;
  }

  return astCacheScriptPropertiesWithDocument(config, (document, _nowMs, stats) => {
    let removed = 0;
    for (let idx = 0; idx < safeKeyHashes.length; idx += 1) {
      const keyHash = safeKeyHashes[idx];
      if (!document.entries[keyHash]) {
        continue;
      }
      delete document.entries[keyHash];
      removed += 1;
    }
    if (removed > 0) {
      stats.deletes += removed;
    }
    return removed;
  });
}

function astCacheScriptPropertiesRecordInvalidations(count, config) {
  const safeCount = astCacheNormalizePositiveInt(count, 0, 0, 1000000);
  if (safeCount <= 0) {
    return 0;
  }

  return astCacheScriptPropertiesWithDocument(config, (document, _nowMs, stats) => {
    stats.invalidations += safeCount;
    return safeCount;
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

function astCacheScriptPropertiesListEntries(config, options = {}) {
  const includeInternal = options.includeInternal === true;
  const maxItems = astCacheNormalizePositiveInt(options.maxItems, 10000, 1, 1000000);

  return astCacheScriptPropertiesWithDocument(config, (document) => {
    const keyHashes = Object.keys(document.entries || {}).sort();
    const output = [];

    for (let idx = 0; idx < keyHashes.length; idx += 1) {
      const keyHash = keyHashes[idx];
      const entry = document.entries[keyHash];
      if (!entry) {
        continue;
      }

      if (!includeInternal && astCacheIsInternalNormalizedKey(entry.normalizedKey)) {
        continue;
      }

      output.push(astCacheJsonClone(entry));
      if (output.length >= maxItems) {
        break;
      }
    }

    return output;
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
