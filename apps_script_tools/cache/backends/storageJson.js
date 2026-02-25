let AST_CACHE_STORAGE_PENDING_STATS = {};

const AST_CACHE_STORAGE_STATS_FLUSH_THRESHOLD = 25;
const AST_CACHE_STORAGE_MAX_LIST_ITEMS = 50000;
const AST_CACHE_STORAGE_MAX_LIST_PAGES = 200;
const AST_CACHE_STORAGE_TRIM_BATCH_SIZE = 64;
const AST_CACHE_STORAGE_HARD_MAX_LIST_ITEMS = 2000000;

function astCacheStorageRequireRunner() {
  if (typeof astRunStorageRequest === 'function') {
    return astRunStorageRequest;
  }

  throw new AstCacheCapabilityError(
    'astRunStorageRequest is required for cache storage_json backend'
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

function astCacheStorageResolveNamespaceRootUri(config) {
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

function astCacheStorageJoinUri(rootUri, relativePath) {
  const safeRoot = astCacheNormalizeString(rootUri, '').replace(/\/+$/, '');
  const safePath = astCacheNormalizeString(relativePath, '').replace(/^\/+/, '');

  if (!safeRoot || !safePath) {
    throw new AstCacheValidationError('Cache storage_json uri path join requires root and path');
  }

  return `${safeRoot}/${safePath}`;
}

function astCacheStorageNormalizeTagPathSegment(tag) {
  const normalizedTag = astCacheNormalizeString(tag, '');
  if (!normalizedTag) {
    throw new AstCacheValidationError('Cache tag must be a non-empty string');
  }

  let hashPart = 'tag';
  try {
    hashPart = astCacheHashKey(normalizedTag).slice(0, 24);
  } catch (_error) {
    hashPart = normalizedTag.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 24) || 'tag';
  }

  const slug = normalizedTag
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 24) || 'tag';

  return `${slug}--${hashPart}`;
}

function astCacheStorageEntryUri(config, keyHash) {
  const rootUri = astCacheStorageResolveNamespaceRootUri(config);
  return astCacheStorageJoinUri(rootUri, `entries/${keyHash}.json`);
}

function astCacheStorageEntriesPrefixUri(config) {
  const rootUri = astCacheStorageResolveNamespaceRootUri(config);
  return astCacheStorageJoinUri(rootUri, 'entries/');
}

function astCacheStorageTagUri(config, tag) {
  const rootUri = astCacheStorageResolveNamespaceRootUri(config);
  const tagSegment = astCacheStorageNormalizeTagPathSegment(tag);
  return astCacheStorageJoinUri(rootUri, `tags/${tagSegment}.json`);
}

function astCacheStorageTagsPrefixUri(config) {
  const rootUri = astCacheStorageResolveNamespaceRootUri(config);
  return astCacheStorageJoinUri(rootUri, 'tags/');
}

function astCacheStorageStatsUri(config) {
  const rootUri = astCacheStorageResolveNamespaceRootUri(config);
  return astCacheStorageJoinUri(rootUri, 'meta/stats.json');
}

function astCacheStorageBuildRequestOptions(runtimeOptions = {}, extraOptions = {}) {
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

  if (typeof runtimeOptions.storagePageSize !== 'undefined') {
    const pageSize = astCacheNormalizePositiveInt(runtimeOptions.storagePageSize, null, 1, 10000);
    if (pageSize == null) {
      throw new AstCacheValidationError('Cache option storagePageSize must be a positive integer');
    }
    mergedOptions.pageSize = pageSize;
  }

  if (typeof runtimeOptions.storageMaxItems !== 'undefined') {
    const maxItems = astCacheNormalizePositiveInt(runtimeOptions.storageMaxItems, null, 1, AST_CACHE_STORAGE_MAX_LIST_ITEMS);
    if (maxItems == null) {
      throw new AstCacheValidationError('Cache option storageMaxItems must be a positive integer');
    }
    mergedOptions.maxItems = maxItems;
  }

  if (typeof runtimeOptions.storageRecursive === 'boolean') {
    mergedOptions.recursive = runtimeOptions.storageRecursive;
  }

  if (typeof runtimeOptions.storageOptions !== 'undefined' && !astCacheIsPlainObject(runtimeOptions.storageOptions)) {
    throw new AstCacheValidationError('Cache option storageOptions must be an object when provided');
  }

  if (astCacheIsPlainObject(runtimeOptions.storageOptions)) {
    const allowedOptions = ['timeoutMs', 'retries', 'includeRaw', 'pageSize', 'maxItems', 'recursive', 'pageToken'];
    for (let idx = 0; idx < allowedOptions.length; idx += 1) {
      const key = allowedOptions[idx];
      if (typeof runtimeOptions.storageOptions[key] !== 'undefined') {
        mergedOptions[key] = runtimeOptions.storageOptions[key];
      }
    }
  }

  const optionKeys = Object.keys(extraOptions || {});
  for (let idx = 0; idx < optionKeys.length; idx += 1) {
    const key = optionKeys[idx];
    if (typeof extraOptions[key] === 'undefined') {
      continue;
    }
    mergedOptions[key] = extraOptions[key];
  }

  if (typeof mergedOptions.overwrite === 'undefined') {
    mergedOptions.overwrite = true;
  }

  return mergedOptions;
}

function astCacheStorageBuildRequest(operation, uri, runtimeOptions, payload = null, extraOptions = {}) {
  const request = {
    operation,
    uri,
    options: astCacheStorageBuildRequestOptions(runtimeOptions, extraOptions)
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

function astCacheStorageRunTagMutationWithLock(config, runtimeOptions = {}, task) {
  if (typeof task !== 'function') {
    throw new AstCacheCapabilityError('Cache storage_json tag mutation task must be a function');
  }

  if (typeof astCacheRunWithLock !== 'function') {
    return task();
  }

  const requestedScope = astCacheNormalizeString(runtimeOptions.storageTagLockScope, 'script').toLowerCase();
  const lockScope = ['script', 'user', 'none'].indexOf(requestedScope) >= 0
    ? requestedScope
    : 'script';
  const lockTimeoutMs = astCacheNormalizePositiveInt(
    runtimeOptions.storageTagLockTimeoutMs,
    astCacheNormalizePositiveInt(config.lockTimeoutMs, 30000, 1, 300000),
    1,
    300000
  );

  return astCacheRunWithLock(task, {
    lockScope,
    lockTimeoutMs
  });
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

function astCacheStorageReadJsonObject(uri, runtimeOptions = {}, options = {}) {
  const executeStorageRequest = astCacheStorageRequireRunner();
  const defaultValue = Object.prototype.hasOwnProperty.call(options, 'defaultValue')
    ? options.defaultValue
    : null;
  const notFoundValue = Object.prototype.hasOwnProperty.call(options, 'notFoundValue')
    ? options.notFoundValue
    : defaultValue;

  let response;
  try {
    response = executeStorageRequest(
      astCacheStorageBuildRequest('read', uri, runtimeOptions)
    );
  } catch (error) {
    if (error && error.name === 'AstStorageNotFoundError') {
      return astCacheIsPlainObject(notFoundValue)
        ? astCacheJsonClone(notFoundValue)
        : notFoundValue;
    }

    throw new AstCacheCapabilityError(
      'Cache storage_json read failed',
      { uri },
      error
    );
  }

  const rawText = astCacheStorageExtractDocumentText(response);
  if (!rawText) {
    return astCacheIsPlainObject(defaultValue)
      ? astCacheJsonClone(defaultValue)
      : defaultValue;
  }

  try {
    const parsed = JSON.parse(rawText);
    if (astCacheIsPlainObject(parsed)) {
      return parsed;
    }
  } catch (_error) {
    // Fall through to default value for invalid JSON payloads.
  }

  return astCacheIsPlainObject(defaultValue)
    ? astCacheJsonClone(defaultValue)
    : defaultValue;
}

function astCacheStorageWriteJsonObject(uri, document, runtimeOptions = {}) {
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

function astCacheStorageDeleteObject(uri, runtimeOptions = {}, options = {}) {
  const executeStorageRequest = astCacheStorageRequireRunner();
  const suppressNotFound = options.suppressNotFound !== false;

  try {
    executeStorageRequest(
      astCacheStorageBuildRequest('delete', uri, runtimeOptions)
    );
    return true;
  } catch (error) {
    if (suppressNotFound && error && error.name === 'AstStorageNotFoundError') {
      return false;
    }

    throw new AstCacheCapabilityError(
      'Cache storage_json delete failed',
      { uri },
      error
    );
  }
}

function astCacheStorageListObjects(prefixUri, runtimeOptions = {}, options = {}) {
  const executeStorageRequest = astCacheStorageRequireRunner();
  const requestedPageSize = typeof options.pageSizeOverride === 'undefined'
    ? runtimeOptions.storagePageSize
    : options.pageSizeOverride;
  const pageSize = astCacheNormalizePositiveInt(requestedPageSize, 1000, 1, 10000);
  const configuredMaxItems = astCacheNormalizePositiveInt(
    runtimeOptions.storageMaxItems,
    AST_CACHE_STORAGE_MAX_LIST_ITEMS,
    1,
    AST_CACHE_STORAGE_HARD_MAX_LIST_ITEMS
  );
  const maxItems = astCacheNormalizePositiveInt(
    options.maxItemsOverride,
    configuredMaxItems,
    1,
    AST_CACHE_STORAGE_HARD_MAX_LIST_ITEMS
  );
  const maxPages = astCacheNormalizePositiveInt(
    options.maxPagesOverride,
    Math.max(AST_CACHE_STORAGE_MAX_LIST_PAGES, Math.ceil(maxItems / pageSize) + 1),
    1,
    5000
  );

  const uris = [];
  const seen = {};
  let pageToken = null;
  let pageCount = 0;

  while (uris.length < maxItems) {
    if (pageCount >= maxPages) {
      break;
    }
    pageCount += 1;

    let response;
    try {
      const remaining = maxItems - uris.length;
      response = executeStorageRequest(
        astCacheStorageBuildRequest('list', prefixUri, runtimeOptions, null, {
          recursive: true,
          pageSize,
          pageToken,
          maxItems: Math.max(pageSize, remaining)
        })
      );
    } catch (error) {
      if (error && error.name === 'AstStorageNotFoundError') {
        return [];
      }

      throw new AstCacheCapabilityError(
        'Cache storage_json list failed',
        { uri: prefixUri },
        error
      );
    }

    const output = astCacheIsPlainObject(response) && astCacheIsPlainObject(response.output)
      ? response.output
      : {};
    const items = Array.isArray(output.items) ? output.items : [];

    for (let idx = 0; idx < items.length; idx += 1) {
      const item = items[idx];
      if (!astCacheIsPlainObject(item)) {
        continue;
      }

      if (item.isPrefix === true || item.isDir === true) {
        continue;
      }

      const uri = astCacheNormalizeString(item.uri, '');
      if (!uri || !uri.startsWith(prefixUri)) {
        continue;
      }

      if (seen[uri]) {
        continue;
      }

      seen[uri] = true;
      uris.push(uri);

      if (uris.length >= maxItems) {
        break;
      }
    }

    const page = astCacheIsPlainObject(response) && astCacheIsPlainObject(response.page)
      ? response.page
      : {};
    pageToken = astCacheNormalizeString(page.nextPageToken, '');
    if (!pageToken) {
      break;
    }
  }

  return uris;
}

function astCacheStorageDefaultTagDocument(tag) {
  return {
    schemaVersion: '1.0',
    tag,
    updatedAtMs: astCacheNowMs(),
    keyHashes: []
  };
}

function astCacheStorageDefaultStatsDocument() {
  return {
    schemaVersion: '1.0',
    updatedAtMs: astCacheNowMs(),
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    invalidations: 0,
    evictions: 0,
    expired: 0
  };
}

function astCacheStorageNormalizeTagDocument(document, tag) {
  const safe = astCacheIsPlainObject(document)
    ? document
    : astCacheStorageDefaultTagDocument(tag);

  const keyHashes = Array.isArray(safe.keyHashes)
    ? safe.keyHashes
      .map(value => astCacheNormalizeString(value, ''))
      .filter(Boolean)
    : [];
  const deduped = [];
  const seen = {};
  for (let idx = 0; idx < keyHashes.length; idx += 1) {
    const keyHash = keyHashes[idx];
    if (seen[keyHash]) {
      continue;
    }
    seen[keyHash] = true;
    deduped.push(keyHash);
  }

  return {
    schemaVersion: astCacheNormalizeString(safe.schemaVersion, '1.0'),
    tag,
    updatedAtMs: astCacheNormalizePositiveInt(
      safe.updatedAtMs,
      astCacheNowMs(),
      0,
      9007199254740991
    ),
    keyHashes: deduped
  };
}

function astCacheStorageNormalizeStatsDocument(document) {
  const source = astCacheIsPlainObject(document)
    ? document
    : astCacheStorageDefaultStatsDocument();

  function normalizeCounter(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return Math.floor(numeric);
  }

  return {
    schemaVersion: astCacheNormalizeString(source.schemaVersion, '1.0'),
    updatedAtMs: astCacheNormalizePositiveInt(source.updatedAtMs, astCacheNowMs(), 0, 9007199254740991),
    hits: normalizeCounter(source.hits),
    misses: normalizeCounter(source.misses),
    sets: normalizeCounter(source.sets),
    deletes: normalizeCounter(source.deletes),
    invalidations: normalizeCounter(source.invalidations),
    evictions: normalizeCounter(source.evictions),
    expired: normalizeCounter(source.expired)
  };
}

function astCacheStorageNormalizeEntryDocument(document, expectedKeyHash) {
  if (!astCacheIsPlainObject(document)) {
    return null;
  }

  const normalizedKeyHash = astCacheNormalizeString(document.keyHash, '');
  if (!normalizedKeyHash || normalizedKeyHash !== expectedKeyHash) {
    return null;
  }

  const normalizedKey = astCacheNormalizeString(document.normalizedKey, '');
  if (!normalizedKey) {
    return null;
  }

  const tags = astCacheNormalizeTags(document.tags);
  const createdAtMs = astCacheNormalizePositiveInt(document.createdAtMs, astCacheNowMs(), 0, 9007199254740991);
  const updatedAtMs = astCacheNormalizePositiveInt(document.updatedAtMs, createdAtMs, 0, 9007199254740991);
  const expiresAtMs = astCacheNormalizePositiveInt(document.expiresAtMs, null, 1, 9007199254740991);

  return {
    keyHash: normalizedKeyHash,
    normalizedKey,
    value: astCacheEnsureSerializable(document.value, 'entry.value'),
    tags,
    createdAtMs,
    updatedAtMs,
    expiresAtMs
  };
}

function astCacheStoragePendingStatsState(config) {
  const rootUri = astCacheStorageResolveNamespaceRootUri(config);
  if (!AST_CACHE_STORAGE_PENDING_STATS[rootUri]) {
    AST_CACHE_STORAGE_PENDING_STATS[rootUri] = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      evictions: 0,
      expired: 0
    };
  }

  return {
    rootUri,
    counters: AST_CACHE_STORAGE_PENDING_STATS[rootUri]
  };
}

function astCacheStorageBumpPendingStats(config, patch = {}) {
  const state = astCacheStoragePendingStatsState(config);
  const keys = Object.keys(patch || {});

  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const numeric = Number(patch[key]);
    if (!Number.isFinite(numeric) || numeric === 0) {
      continue;
    }

    state.counters[key] = Number(state.counters[key] || 0) + numeric;
  }

  return state;
}

function astCacheStoragePendingStatsTotal(counters = {}) {
  const keys = Object.keys(counters);
  let total = 0;
  for (let idx = 0; idx < keys.length; idx += 1) {
    total += Math.abs(Number(counters[keys[idx]] || 0));
  }
  return total;
}

function astCacheStorageReadStatsDocument(config, runtimeOptions = {}) {
  const uri = astCacheStorageStatsUri(config);
  const parsed = astCacheStorageReadJsonObject(uri, runtimeOptions, {
    defaultValue: astCacheStorageDefaultStatsDocument(),
    notFoundValue: astCacheStorageDefaultStatsDocument()
  });

  return {
    uri,
    stats: astCacheStorageNormalizeStatsDocument(parsed)
  };
}

function astCacheStorageWriteStatsDocument(uri, stats, runtimeOptions = {}) {
  const nextStats = astCacheStorageNormalizeStatsDocument(stats);
  nextStats.updatedAtMs = astCacheNowMs();
  astCacheStorageWriteJsonObject(uri, nextStats, runtimeOptions);
  return nextStats;
}

function astCacheStorageFlushPendingStats(config, runtimeOptions = {}, options = {}) {
  const state = astCacheStoragePendingStatsState(config);
  if (astCacheStoragePendingStatsTotal(state.counters) === 0) {
    try {
      return astCacheStorageReadStatsDocument(config, runtimeOptions).stats;
    } catch (error) {
      if (options.strict === true) {
        throw error;
      }
      return astCacheStorageNormalizeStatsDocument(astCacheStorageDefaultStatsDocument());
    }
  }

  try {
    const loaded = astCacheStorageReadStatsDocument(config, runtimeOptions);
    const nextStats = astCacheStorageNormalizeStatsDocument(loaded.stats);

    const keys = Object.keys(state.counters);
    for (let idx = 0; idx < keys.length; idx += 1) {
      const key = keys[idx];
      const increment = Number(state.counters[key] || 0);
      if (!Number.isFinite(increment) || increment === 0) {
        continue;
      }
      nextStats[key] = Number(nextStats[key] || 0) + increment;
      state.counters[key] = 0;
    }

    return astCacheStorageWriteStatsDocument(loaded.uri, nextStats, runtimeOptions);
  } catch (error) {
    if (options.strict === true) {
      throw error;
    }

    return astCacheStorageNormalizeStatsDocument(astCacheStorageDefaultStatsDocument());
  }
}

function astCacheStorageUpdateStats(config, runtimeOptions = {}, patch = {}) {
  astCacheStorageFlushPendingStats(config, runtimeOptions, { strict: false });

  const loaded = astCacheStorageReadStatsDocument(config, runtimeOptions);
  const nextStats = astCacheStorageNormalizeStatsDocument(loaded.stats);

  const keys = Object.keys(patch || {});
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const increment = Number(patch[key]);
    if (!Number.isFinite(increment) || increment === 0) {
      continue;
    }
    nextStats[key] = Number(nextStats[key] || 0) + increment;
  }

  return astCacheStorageWriteStatsDocument(loaded.uri, nextStats, runtimeOptions);
}

function astCacheStorageReadEntry(config, keyHash, runtimeOptions = {}) {
  const uri = astCacheStorageEntryUri(config, keyHash);
  const parsed = astCacheStorageReadJsonObject(uri, runtimeOptions, {
    defaultValue: null,
    notFoundValue: null
  });

  return astCacheStorageNormalizeEntryDocument(parsed, keyHash);
}

function astCacheStorageWriteEntry(config, entry, runtimeOptions = {}) {
  const uri = astCacheStorageEntryUri(config, entry.keyHash);
  astCacheStorageWriteJsonObject(uri, entry, runtimeOptions);
  return uri;
}

function astCacheStorageReadTagDocument(config, tag, runtimeOptions = {}) {
  const uri = astCacheStorageTagUri(config, tag);
  const parsed = astCacheStorageReadJsonObject(uri, runtimeOptions, {
    defaultValue: astCacheStorageDefaultTagDocument(tag),
    notFoundValue: astCacheStorageDefaultTagDocument(tag)
  });

  return {
    uri,
    tag,
    document: astCacheStorageNormalizeTagDocument(parsed, tag)
  };
}

function astCacheStorageWriteTagDocument(uri, document, runtimeOptions = {}) {
  const normalized = astCacheStorageNormalizeTagDocument(document, document.tag);
  normalized.updatedAtMs = astCacheNowMs();

  if (!Array.isArray(normalized.keyHashes) || normalized.keyHashes.length === 0) {
    astCacheStorageDeleteObject(uri, runtimeOptions, { suppressNotFound: true });
    return null;
  }

  astCacheStorageWriteJsonObject(uri, normalized, runtimeOptions);
  return normalized;
}

function astCacheStorageSyncEntryTags(config, keyHash, previousTags = [], nextTags = [], runtimeOptions = {}) {
  return astCacheStorageRunTagMutationWithLock(config, runtimeOptions, () => {
    const prev = astCacheNormalizeTags(previousTags);
    const next = astCacheNormalizeTags(nextTags);

    const prevSet = {};
    for (let idx = 0; idx < prev.length; idx += 1) {
      prevSet[prev[idx]] = true;
    }

    const nextSet = {};
    for (let idx = 0; idx < next.length; idx += 1) {
      nextSet[next[idx]] = true;
    }

    const removedTags = [];
    for (let idx = 0; idx < prev.length; idx += 1) {
      const tag = prev[idx];
      if (!nextSet[tag]) {
        removedTags.push(tag);
      }
    }

    const addedTags = [];
    for (let idx = 0; idx < next.length; idx += 1) {
      const tag = next[idx];
      if (!prevSet[tag]) {
        addedTags.push(tag);
      }
    }

    for (let idx = 0; idx < removedTags.length; idx += 1) {
      const tag = removedTags[idx];
      const loaded = astCacheStorageReadTagDocument(config, tag, runtimeOptions);
      loaded.document.keyHashes = loaded.document.keyHashes.filter(value => value !== keyHash);
      astCacheStorageWriteTagDocument(loaded.uri, loaded.document, runtimeOptions);
    }

    for (let idx = 0; idx < addedTags.length; idx += 1) {
      const tag = addedTags[idx];
      const loaded = astCacheStorageReadTagDocument(config, tag, runtimeOptions);
      if (loaded.document.keyHashes.indexOf(keyHash) === -1) {
        loaded.document.keyHashes.push(keyHash);
      }
      astCacheStorageWriteTagDocument(loaded.uri, loaded.document, runtimeOptions);
    }
  });
}

function astCacheStorageDeleteEntryArtifacts(config, keyHash, tags = [], runtimeOptions = {}) {
  return astCacheStorageRunTagMutationWithLock(config, runtimeOptions, () => {
    const entryUri = astCacheStorageEntryUri(config, keyHash);
    const deleted = astCacheStorageDeleteObject(entryUri, runtimeOptions, { suppressNotFound: true });

    const normalizedTags = astCacheNormalizeTags(tags);
    for (let idx = 0; idx < normalizedTags.length; idx += 1) {
      const tag = normalizedTags[idx];
      const loaded = astCacheStorageReadTagDocument(config, tag, runtimeOptions);
      loaded.document.keyHashes = loaded.document.keyHashes.filter(value => value !== keyHash);
      astCacheStorageWriteTagDocument(loaded.uri, loaded.document, runtimeOptions);
    }

    return deleted;
  });
}

function astCacheStorageExtractKeyHashFromUri(uri) {
  const match = String(uri || '').match(/\/entries\/([^\/]+)\.json$/);
  return match ? astCacheNormalizeString(match[1], '') : '';
}

function astCacheStorageListEntryUris(config, runtimeOptions = {}, options = {}) {
  const prefixUri = astCacheStorageEntriesPrefixUri(config);
  return astCacheStorageListObjects(prefixUri, runtimeOptions, options)
    .filter(uri => /\/entries\/[^\/]+\.json$/.test(uri));
}

function astCacheStorageTrimToMaxEntries(config, runtimeOptions = {}) {
  const maxEntries = astCacheNormalizePositiveInt(
    config.maxMemoryEntries,
    null,
    1,
    9007199254740991
  );

  if (maxEntries == null) {
    return 0;
  }

  const trimBatchSize = astCacheNormalizePositiveInt(
    runtimeOptions.storageTrimBatchSize,
    AST_CACHE_STORAGE_TRIM_BATCH_SIZE,
    1,
    10000
  );
  const probeLimit = maxEntries + trimBatchSize;
  const entryUris = astCacheStorageListEntryUris(config, runtimeOptions, {
    maxItemsOverride: probeLimit
  });
  if (entryUris.length <= maxEntries) {
    return 0;
  }

  const entries = [];
  for (let idx = 0; idx < entryUris.length; idx += 1) {
    const keyHash = astCacheStorageExtractKeyHashFromUri(entryUris[idx]);
    if (!keyHash) {
      continue;
    }

    const entry = astCacheStorageReadEntry(config, keyHash, runtimeOptions);
    if (!entry) {
      continue;
    }

    entries.push(entry);
  }

  if (entries.length <= maxEntries) {
    return 0;
  }

  entries.sort((left, right) => {
    const leftStamp = Number(left && left.updatedAtMs || 0);
    const rightStamp = Number(right && right.updatedAtMs || 0);
    if (leftStamp !== rightStamp) {
      return leftStamp - rightStamp;
    }
    return String(left.keyHash || '').localeCompare(String(right.keyHash || ''));
  });

  const overflow = entries.length - maxEntries;
  if (overflow <= 0) {
    return 0;
  }
  let removed = 0;

  for (let idx = 0; idx < overflow; idx += 1) {
    const entry = entries[idx];
    if (!entry) {
      continue;
    }

    if (astCacheStorageDeleteEntryArtifacts(config, entry.keyHash, entry.tags, runtimeOptions)) {
      removed += 1;
    }
  }

  if (removed > 0) {
    astCacheStorageUpdateStats(config, runtimeOptions, {
      evictions: removed
    });
  }

  return removed;
}

function astCacheStorageMaybeFlushPendingGetStats(config, runtimeOptions = {}) {
  const state = astCacheStoragePendingStatsState(config);
  if (astCacheStoragePendingStatsTotal(state.counters) < AST_CACHE_STORAGE_STATS_FLUSH_THRESHOLD) {
    return;
  }

  astCacheStorageFlushPendingStats(config, runtimeOptions, { strict: false });
}

function astCacheStorageGet(keyHash, config, runtimeOptions = {}) {
  const nowMs = astCacheNowMs();
  const entry = astCacheStorageReadEntry(config, keyHash, runtimeOptions);

  if (!entry) {
    if (config.updateStatsOnGet !== false) {
      astCacheStorageBumpPendingStats(config, { misses: 1 });
      astCacheStorageMaybeFlushPendingGetStats(config, runtimeOptions);
    }
    return null;
  }

  if (astCacheIsExpired(entry, nowMs)) {
    astCacheStorageDeleteEntryArtifacts(config, keyHash, entry.tags, runtimeOptions);

    if (config.updateStatsOnGet !== false) {
      astCacheStorageBumpPendingStats(config, {
        expired: 1,
        misses: 1
      });
      astCacheStorageMaybeFlushPendingGetStats(config, runtimeOptions);
    }

    return null;
  }

  if (config.updateStatsOnGet !== false) {
    astCacheStorageBumpPendingStats(config, { hits: 1 });
    astCacheStorageMaybeFlushPendingGetStats(config, runtimeOptions);
  }

  return astCacheJsonClone(entry);
}

function astCacheStorageSet(entry, config, runtimeOptions = {}) {
  astCacheStorageFlushPendingStats(config, runtimeOptions, { strict: false });

  const nowMs = astCacheNowMs();
  const nextEntry = astCacheTouchEntry(entry, nowMs);
  const previousEntry = astCacheStorageReadEntry(config, nextEntry.keyHash, runtimeOptions);

  astCacheStorageWriteEntry(config, nextEntry, runtimeOptions);
  astCacheStorageSyncEntryTags(
    config,
    nextEntry.keyHash,
    previousEntry ? previousEntry.tags : [],
    nextEntry.tags,
    runtimeOptions
  );

  astCacheStorageUpdateStats(config, runtimeOptions, {
    sets: 1
  });
  astCacheStorageTrimToMaxEntries(config, runtimeOptions);

  return astCacheJsonClone(nextEntry);
}

function astCacheStorageDelete(keyHash, config, runtimeOptions = {}) {
  astCacheStorageFlushPendingStats(config, runtimeOptions, { strict: false });

  const previousEntry = astCacheStorageReadEntry(config, keyHash, runtimeOptions);
  if (!previousEntry) {
    return false;
  }

  const deleted = astCacheStorageDeleteEntryArtifacts(
    config,
    keyHash,
    previousEntry.tags,
    runtimeOptions
  );

  if (deleted) {
    astCacheStorageUpdateStats(config, runtimeOptions, {
      deletes: 1
    });
  }

  return deleted;
}

function astCacheStorageFindEntriesByTag(config, tag, runtimeOptions = {}) {
  const normalizedTag = astCacheNormalizeString(tag, '');
  if (!normalizedTag) {
    return [];
  }

  const entryUris = astCacheStorageListEntryUris(config, runtimeOptions);
  const output = [];

  for (let idx = 0; idx < entryUris.length; idx += 1) {
    const keyHash = astCacheStorageExtractKeyHashFromUri(entryUris[idx]);
    if (!keyHash) {
      continue;
    }

    const entry = astCacheStorageReadEntry(config, keyHash, runtimeOptions);
    if (!entry || !Array.isArray(entry.tags) || entry.tags.indexOf(normalizedTag) === -1) {
      continue;
    }

    output.push(entry);
  }

  return output;
}

function astCacheStorageInvalidateByTag(tag, config, runtimeOptions = {}) {
  const normalizedTag = astCacheNormalizeString(tag, '');
  if (!normalizedTag) {
    throw new AstCacheValidationError('Cache invalidateByTag tag must be a non-empty string');
  }

  astCacheStorageFlushPendingStats(config, runtimeOptions, { strict: false });

  const loaded = astCacheStorageReadTagDocument(config, normalizedTag, runtimeOptions);
  const keyHashes = Array.isArray(loaded.document.keyHashes)
    ? loaded.document.keyHashes.slice()
    : [];

  const candidates = [];
  if (keyHashes.length > 0) {
    const seen = {};
    for (let idx = 0; idx < keyHashes.length; idx += 1) {
      const keyHash = astCacheNormalizeString(keyHashes[idx], '');
      if (!keyHash || seen[keyHash]) {
        continue;
      }
      seen[keyHash] = true;
      const entry = astCacheStorageReadEntry(config, keyHash, runtimeOptions);
      if (!entry) {
        continue;
      }
      candidates.push(entry);
    }
  } else {
    const scanned = astCacheStorageFindEntriesByTag(config, normalizedTag, runtimeOptions);
    for (let idx = 0; idx < scanned.length; idx += 1) {
      candidates.push(scanned[idx]);
    }
  }

  let removed = 0;
  for (let idx = 0; idx < candidates.length; idx += 1) {
    const entry = candidates[idx];
    if (!entry || !entry.keyHash) {
      continue;
    }

    const deleted = astCacheStorageDeleteEntryArtifacts(
      config,
      entry.keyHash,
      entry.tags,
      runtimeOptions
    );

    if (deleted) {
      removed += 1;
    }
  }

  astCacheStorageDeleteObject(loaded.uri, runtimeOptions, { suppressNotFound: true });

  if (removed > 0) {
    astCacheStorageUpdateStats(config, runtimeOptions, {
      invalidations: removed
    });
  }

  return removed;
}

function astCacheStorageStats(config, runtimeOptions = {}) {
  const mode = astCacheNormalizeString(runtimeOptions.statsMode, 'exact').toLowerCase();
  const useApproxMode = mode === 'approx';

  const persistedStats = astCacheStorageFlushPendingStats(config, runtimeOptions, { strict: true });

  let entryCount = 0;
  if (!useApproxMode) {
    entryCount = astCacheStorageListEntryUris(config, runtimeOptions).length;
  }

  return {
    backend: 'storage_json',
    namespace: astCacheNormalizeString(config.namespace, 'ast_cache'),
    entries: entryCount,
    stats: astCacheJsonClone(persistedStats)
  };
}

function astCacheStorageClearNamespace(config, runtimeOptions = {}) {
  astCacheStorageFlushPendingStats(config, runtimeOptions, { strict: false });

  const entryUris = astCacheStorageListEntryUris(config, runtimeOptions);
  let removed = 0;
  for (let idx = 0; idx < entryUris.length; idx += 1) {
    if (astCacheStorageDeleteObject(entryUris[idx], runtimeOptions, { suppressNotFound: true })) {
      removed += 1;
    }
  }

  const tagUris = astCacheStorageListObjects(astCacheStorageTagsPrefixUri(config), runtimeOptions);
  for (let idx = 0; idx < tagUris.length; idx += 1) {
    astCacheStorageDeleteObject(tagUris[idx], runtimeOptions, { suppressNotFound: true });
  }

  const rootUri = astCacheStorageResolveNamespaceRootUri(config);
  delete AST_CACHE_STORAGE_PENDING_STATS[rootUri];

  const statsUri = astCacheStorageStatsUri(config);
  astCacheStorageWriteStatsDocument(statsUri, astCacheStorageDefaultStatsDocument(), runtimeOptions);

  return removed;
}
