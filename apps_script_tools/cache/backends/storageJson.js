function astCacheStorageRequireRunner() {
  if (typeof runStorageRequest === 'function') {
    return runStorageRequest;
  }

  throw new AstCacheCapabilityError(
    'runStorageRequest is required for cache storage_json backend'
  );
}

function astCacheStorageNamespaceHash(namespace) {
  const normalizedNamespace = astCacheNormalizeString(namespace, 'ast_cache');
  try {
    return astCacheHashKey(normalizedNamespace).slice(0, 16);
  } catch (_error) {
    return normalizedNamespace
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .slice(0, 32) || 'namespace';
  }
}

function astCacheStorageAppendNamespaceSuffix(path, namespaceHash) {
  const normalizedPath = astCacheNormalizeString(path, '');
  if (!normalizedPath) {
    throw new AstCacheValidationError('Cache storage_json uri must include an object path');
  }

  const lastSlash = normalizedPath.lastIndexOf('/');
  const nameStart = lastSlash + 1;
  const objectName = normalizedPath.slice(nameStart);
  if (!objectName) {
    throw new AstCacheValidationError('Cache storage_json uri must include an object name');
  }

  const extensionIndex = objectName.lastIndexOf('.');
  if (extensionIndex > 0 && extensionIndex < objectName.length - 1) {
    const baseName = objectName.slice(0, extensionIndex);
    const extension = objectName.slice(extensionIndex);
    return `${normalizedPath.slice(0, nameStart)}${baseName}--${namespaceHash}${extension}`;
  }

  return `${normalizedPath}--${namespaceHash}`;
}

function astCacheStorageResolveNamespaceUri(config) {
  const baseUri = astCacheNormalizeString(config && config.storageUri, '');
  if (!baseUri) {
    throw new AstCacheValidationError(
      'cache backend "storage_json" requires storageUri (or CACHE_STORAGE_URI)'
    );
  }

  const namespaceHash = astCacheStorageNamespaceHash(config.namespace);
  const lowerUri = baseUri.toLowerCase();

  if (lowerUri.startsWith('gcs://') || lowerUri.startsWith('s3://')) {
    const match = baseUri.match(/^([a-zA-Z0-9_]+):\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new AstCacheValidationError('Cache storage_json uri must include bucket and object path', {
        uri: baseUri
      });
    }

    const scheme = match[1].toLowerCase();
    const bucket = match[2];
    const objectPath = astCacheStorageAppendNamespaceSuffix(match[3], namespaceHash);
    return `${scheme}://${bucket}/${objectPath}`;
  }

  if (lowerUri.startsWith('dbfs:/')) {
    const path = baseUri.slice('dbfs:/'.length);
    const namespacedPath = astCacheStorageAppendNamespaceSuffix(path, namespaceHash);
    return `dbfs:/${namespacedPath}`;
  }

  throw new AstCacheValidationError(
    'Cache storage_json uri scheme must be one of: gcs://, s3://, dbfs:/',
    { uri: baseUri }
  );
}

function astCacheStorageBuildRequestOptions(runtimeOptions = {}) {
  const mergedOptions = {};

  if (typeof runtimeOptions.storageTimeoutMs !== 'undefined') {
    const timeoutMs = astCacheNormalizePositiveInt(runtimeOptions.storageTimeoutMs, null, 1, 300000);
    if (timeoutMs == null) {
      throw new AstCacheValidationError('Cache option storageTimeoutMs must be a positive integer');
    }
    mergedOptions.timeoutMs = timeoutMs;
  }

  if (typeof runtimeOptions.storageRetries !== 'undefined') {
    const retries = astCacheNormalizePositiveInt(runtimeOptions.storageRetries, null, 0, 10);
    if (retries == null) {
      throw new AstCacheValidationError('Cache option storageRetries must be a non-negative integer');
    }
    mergedOptions.retries = retries;
  }

  if (typeof runtimeOptions.storageIncludeRaw === 'boolean') {
    mergedOptions.includeRaw = runtimeOptions.storageIncludeRaw;
  }

  if (astCacheIsPlainObject(runtimeOptions.storageOptions)) {
    const allowedOptions = ['timeoutMs', 'retries', 'includeRaw'];
    for (let idx = 0; idx < allowedOptions.length; idx += 1) {
      const key = allowedOptions[idx];
      if (typeof runtimeOptions.storageOptions[key] !== 'undefined') {
        mergedOptions[key] = runtimeOptions.storageOptions[key];
      }
    }
  }

  mergedOptions.overwrite = true;
  return mergedOptions;
}

function astCacheStorageBuildRequest(operation, uri, runtimeOptions, payload = null) {
  const request = {
    operation,
    uri,
    options: astCacheStorageBuildRequestOptions(runtimeOptions)
  };

  if (payload) {
    request.payload = payload;
  }

  if (astCacheIsPlainObject(runtimeOptions.storageAuth)) {
    request.auth = astCacheJsonClone(runtimeOptions.storageAuth);
  }

  if (astCacheIsPlainObject(runtimeOptions.storageProviderOptions)) {
    request.providerOptions = astCacheJsonClone(runtimeOptions.storageProviderOptions);
  }

  return request;
}

function astCacheStorageBase64ToText(base64) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.base64Decode !== 'function'
  ) {
    throw new AstCacheCapabilityError(
      'Utilities.base64Decode is required for cache storage_json base64 decoding'
    );
  }

  const bytes = Utilities.base64Decode(String(base64 || ''));
  if (Utilities && typeof Utilities.newBlob === 'function') {
    const blob = Utilities.newBlob(bytes);
    if (blob && typeof blob.getDataAsString === 'function') {
      return String(blob.getDataAsString() || '');
    }
  }

  let output = '';
  for (let idx = 0; idx < bytes.length; idx += 1) {
    const value = bytes[idx];
    output += String.fromCharCode(value < 0 ? value + 256 : value);
  }

  return output;
}

function astCacheStorageExtractDocumentText(response) {
  const output = astCacheIsPlainObject(response) && astCacheIsPlainObject(response.output)
    ? response.output
    : {};
  const data = astCacheIsPlainObject(output.data) ? output.data : {};

  if (typeof data.text === 'string') {
    return data.text;
  }

  if (astCacheIsPlainObject(data.json)) {
    try {
      return JSON.stringify(data.json);
    } catch (_error) {
      return '';
    }
  }

  if (typeof data.base64 === 'string' && data.base64) {
    try {
      return astCacheStorageBase64ToText(data.base64);
    } catch (_error) {
      return '';
    }
  }

  return '';
}

function astCacheStorageDefaultDocument(namespace) {
  return {
    schemaVersion: '1.0',
    namespace,
    updatedAtMs: astCacheNowMs(),
    entries: {},
    stats: {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      evictions: 0,
      expired: 0
    }
  };
}

function astCacheStorageReadDocument(config, runtimeOptions = {}) {
  const uri = astCacheStorageResolveNamespaceUri(config);
  const executeStorageRequest = astCacheStorageRequireRunner();

  let response;
  try {
    response = executeStorageRequest(
      astCacheStorageBuildRequest('read', uri, runtimeOptions)
    );
  } catch (error) {
    if (error && error.name === 'AstStorageNotFoundError') {
      return {
        uri,
        document: astCacheStorageDefaultDocument(config.namespace)
      };
    }

    throw new AstCacheCapabilityError(
      'Cache storage_json read failed',
      { uri },
      error
    );
  }

  const rawText = astCacheStorageExtractDocumentText(response);
  if (!rawText) {
    return {
      uri,
      document: astCacheStorageDefaultDocument(config.namespace)
    };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch (_error) {
    parsed = astCacheStorageDefaultDocument(config.namespace);
  }

  const document = astCacheIsPlainObject(parsed)
    ? parsed
    : astCacheStorageDefaultDocument(config.namespace);

  if (!astCacheIsPlainObject(document.entries)) {
    document.entries = {};
  }

  if (!astCacheIsPlainObject(document.stats)) {
    document.stats = astCacheStorageDefaultDocument(config.namespace).stats;
  }

  document.namespace = astCacheNormalizeString(document.namespace, config.namespace);
  document.schemaVersion = astCacheNormalizeString(document.schemaVersion, '1.0');
  document.updatedAtMs = astCacheNormalizePositiveInt(
    document.updatedAtMs,
    astCacheNowMs(),
    0,
    9007199254740991
  );

  return {
    uri,
    document
  };
}

function astCacheStorageWriteDocument(uri, document, runtimeOptions = {}) {
  const executeStorageRequest = astCacheStorageRequireRunner();

  try {
    executeStorageRequest(
      astCacheStorageBuildRequest('write', uri, runtimeOptions, {
        text: JSON.stringify(document),
        mimeType: 'application/json',
        encoding: 'utf-8'
      })
    );
  } catch (error) {
    throw new AstCacheCapabilityError(
      'Cache storage_json write failed',
      { uri },
      error
    );
  }
}

function astCacheStorageRunWithLock(task, config) {
  return astCacheRunWithLock(task, config);
}

function astCacheStoragePruneExpired(document, nowMs) {
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
    document.stats.expired = (document.stats.expired || 0) + removed;
  }
}

function astCacheStorageTrimToMaxEntries(document, maxEntries) {
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

  document.stats.evictions = (document.stats.evictions || 0) + overflow;
}

function astCacheStorageWithDocument(config, runtimeOptions, mutator) {
  return astCacheStorageRunWithLock(() => {
    const loaded = astCacheStorageReadDocument(config, runtimeOptions);
    const uri = loaded.uri;
    const document = loaded.document;
    const nowMs = astCacheNowMs();

    astCacheStoragePruneExpired(document, nowMs);
    const result = mutator(document, nowMs);
    document.updatedAtMs = nowMs;
    astCacheStorageWriteDocument(uri, document, runtimeOptions);
    return result;
  }, config);
}

function astCacheStorageGet(keyHash, config, runtimeOptions = {}) {
  if (config.updateStatsOnGet === false) {
    const loaded = astCacheStorageReadDocument(config, runtimeOptions);
    const nowMs = astCacheNowMs();
    const entry = loaded.document.entries[keyHash];
    if (!entry || astCacheIsExpired(entry, nowMs)) {
      return null;
    }
    return astCacheJsonClone(entry);
  }

  return astCacheStorageWithDocument(config, runtimeOptions, (document, nowMs) => {
    const entry = document.entries[keyHash];
    if (!entry) {
      document.stats.misses = (document.stats.misses || 0) + 1;
      return null;
    }

    if (astCacheIsExpired(entry, nowMs)) {
      delete document.entries[keyHash];
      document.stats.expired = (document.stats.expired || 0) + 1;
      document.stats.misses = (document.stats.misses || 0) + 1;
      return null;
    }

    document.stats.hits = (document.stats.hits || 0) + 1;
    return astCacheJsonClone(entry);
  });
}

function astCacheStorageSet(entry, config, runtimeOptions = {}) {
  return astCacheStorageWithDocument(config, runtimeOptions, (document, nowMs) => {
    const nextEntry = astCacheTouchEntry(entry, nowMs);
    document.entries[nextEntry.keyHash] = nextEntry;
    document.stats.sets = (document.stats.sets || 0) + 1;
    astCacheStorageTrimToMaxEntries(document, config.maxMemoryEntries);
    return astCacheJsonClone(nextEntry);
  });
}

function astCacheStorageDelete(keyHash, config, runtimeOptions = {}) {
  return astCacheStorageWithDocument(config, runtimeOptions, document => {
    if (!document.entries[keyHash]) {
      return false;
    }

    delete document.entries[keyHash];
    document.stats.deletes = (document.stats.deletes || 0) + 1;
    return true;
  });
}

function astCacheStorageInvalidateByTag(tag, config, runtimeOptions = {}) {
  const normalizedTag = astCacheNormalizeString(tag, '');
  if (!normalizedTag) {
    throw new AstCacheValidationError('Cache invalidateByTag tag must be a non-empty string');
  }

  return astCacheStorageWithDocument(config, runtimeOptions, document => {
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

    document.stats.invalidations = (document.stats.invalidations || 0) + removed;
    return removed;
  });
}

function astCacheStorageStats(config, runtimeOptions = {}) {
  return astCacheStorageWithDocument(config, runtimeOptions, document => {
    return {
      backend: 'storage_json',
      namespace: document.namespace,
      entries: Object.keys(document.entries || {}).length,
      stats: astCacheJsonClone(document.stats || {})
    };
  });
}

function astCacheStorageClearNamespace(config, runtimeOptions = {}) {
  return astCacheStorageWithDocument(config, runtimeOptions, document => {
    const removed = Object.keys(document.entries || {}).length;
    document.entries = {};
    document.stats = astCacheStorageDefaultDocument(config.namespace).stats;
    return removed;
  });
}
