function astGitHubCacheIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubCacheStableJson(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function astGitHubHashString(value) {
  const source = String(value || '');

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.computeDigest === 'function' &&
    Utilities.DigestAlgorithm &&
    Utilities.DigestAlgorithm.SHA_256
  ) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source);
    return digest
      .map(byte => {
        const normalized = byte < 0 ? byte + 256 : byte;
        return normalized.toString(16).padStart(2, '0');
      })
      .join('');
  }

  let hash = 0;
  for (let idx = 0; idx < source.length; idx += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(idx);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash)}`;
}

function astGitHubGetCacheApi() {
  if (typeof AST_CACHE !== 'undefined' && AST_CACHE) {
    return AST_CACHE;
  }

  return null;
}

function astGitHubBuildCacheOptions(cacheConfig = {}) {
  const options = {
    backend: cacheConfig.backend,
    namespace: cacheConfig.namespace,
    storageUri: cacheConfig.storageUri,
    lockTimeoutMs: cacheConfig.coalesceLeaseMs,
    updateStatsOnGet: false
  };

  Object.keys(options).forEach(key => {
    if (options[key] == null || options[key] === '') {
      delete options[key];
    }
  });

  return options;
}

function astGitHubBuildCacheKey(request, config, method, path, queryParams, bodyPayload, isGraphql = false) {
  const operation = request.operation;
  const cacheDescriptor = {
    operation,
    method: String(method || '').toUpperCase(),
    path,
    query: queryParams || {},
    graphql: isGraphql === true,
    graphqlOperationName: request.operationName || null,
    body: astGitHubCacheIsPlainObject(bodyPayload) ? bodyPayload : null,
    baseUrl: config.baseUrl,
    graphqlUrl: config.graphqlUrl,
    tokenFingerprint: astGitHubHashString(config.token).slice(0, 16)
  };

  return `github:${operation}:${astGitHubHashString(astGitHubCacheStableJson(cacheDescriptor))}`;
}

function astGitHubReadCacheEntry(cacheKey, cacheConfig = {}) {
  const api = astGitHubGetCacheApi();
  if (!api || typeof api.get !== 'function') {
    return null;
  }

  const options = astGitHubBuildCacheOptions(cacheConfig);
  return api.get(cacheKey, options);
}

function astGitHubWriteCacheEntry(cacheKey, payload, cacheConfig = {}, tags = []) {
  const api = astGitHubGetCacheApi();
  if (!api || typeof api.set !== 'function') {
    return null;
  }

  const options = Object.assign({}, astGitHubBuildCacheOptions(cacheConfig), {
    ttlSec: Math.max(
      Number(cacheConfig.staleTtlSec || 0),
      Number(cacheConfig.etagTtlSec || 0),
      Number(cacheConfig.ttlSec || 0),
      1
    ),
    tags: Array.isArray(tags) ? tags.filter(Boolean) : []
  });

  return api.set(cacheKey, payload, options);
}

function astGitHubDeleteCacheEntry(cacheKey, cacheConfig = {}) {
  const api = astGitHubGetCacheApi();
  if (!api || typeof api.delete !== 'function') {
    return false;
  }

  const options = astGitHubBuildCacheOptions(cacheConfig);
  return api.delete(cacheKey, options);
}

function astGitHubInvalidateCacheTags(tags = [], cacheConfig = {}) {
  const api = astGitHubGetCacheApi();
  if (!api || typeof api.invalidateByTag !== 'function') {
    return 0;
  }

  const normalizedTags = Array.isArray(tags)
    ? tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0)
    : [];

  if (normalizedTags.length === 0) {
    return 0;
  }

  const options = astGitHubBuildCacheOptions(cacheConfig);
  let total = 0;
  for (let idx = 0; idx < normalizedTags.length; idx += 1) {
    total += Number(api.invalidateByTag(normalizedTags[idx], options) || 0);
  }

  return total;
}

function astGitHubClassifyCachedPayload(cachedPayload, nowMs = Date.now()) {
  if (!astGitHubCacheIsPlainObject(cachedPayload)) {
    return {
      hasValue: false,
      fresh: false,
      stale: false,
      etagValid: false
    };
  }

  const freshUntilMs = Number(cachedPayload.freshUntilMs || 0);
  const staleUntilMs = Number(cachedPayload.staleUntilMs || 0);
  const etagUntilMs = Number(cachedPayload.etagUntilMs || 0);

  return {
    hasValue: true,
    fresh: freshUntilMs > nowMs,
    stale: staleUntilMs > nowMs,
    etagValid: Boolean(cachedPayload.etag) && etagUntilMs > nowMs
  };
}

function astGitHubIsCacheEnabled(operationSpec, config, requestOptions) {
  if (!operationSpec || operationSpec.read !== true) {
    return false;
  }

  const cacheConfig = config && config.cache ? config.cache : {};
  const requestCache = requestOptions && requestOptions.cache ? requestOptions.cache : {};

  if (typeof requestCache.enabled === 'boolean') {
    return requestCache.enabled;
  }

  return cacheConfig.enabled === true;
}
