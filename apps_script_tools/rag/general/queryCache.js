const AST_RAG_CACHE_DEFAULTS = Object.freeze({
  enabled: false,
  backend: 'memory',
  namespace: 'ast_rag',
  ttlSec: 300,
  searchTtlSec: 300,
  answerTtlSec: 180,
  embeddingTtlSec: 900,
  storageUri: '',
  lockTimeoutMs: 5000,
  updateStatsOnGet: false
});

function astRagNormalizeCacheBackend(value, fallback = AST_RAG_CACHE_DEFAULTS.backend) {
  const normalized = astRagNormalizeString(value, fallback);
  if (!normalized) {
    return fallback;
  }

  const supported = ['memory', 'drive_json', 'script_properties', 'storage_json'];
  if (!supported.includes(normalized)) {
    throw new AstRagValidationError('cache.backend must be one of: memory, drive_json, script_properties, storage_json', {
      backend: normalized
    });
  }

  return normalized;
}

function astRagHashCacheKey(value) {
  const serialized = String(value || '');
  if (typeof sha256Hash === 'function') {
    try {
      return String(sha256Hash(serialized));
    } catch (_error) {
      // Fallback below.
    }
  }

  return serialized;
}

function astRagBuildCacheKey(parts = {}) {
  const base = astRagStableStringify(parts);
  const digest = astRagHashCacheKey(base);
  return `rag:${digest}`;
}

function astRagResolveCacheTtl(cacheConfig, key, fallback) {
  const candidate = cacheConfig && typeof cacheConfig[key] === 'number'
    ? cacheConfig[key]
    : fallback;
  return astRagNormalizePositiveInt(candidate, fallback, 1);
}

function astRagCanUseCache(cacheConfig = {}) {
  return Boolean(
    cacheConfig &&
    cacheConfig.enabled === true &&
    typeof astCacheGetValue === 'function' &&
    typeof astCacheSetValue === 'function'
  );
}

function astRagBuildCacheOptions(cacheConfig = {}, ttlSec) {
  const options = {
    backend: astRagNormalizeCacheBackend(cacheConfig.backend, AST_RAG_CACHE_DEFAULTS.backend),
    namespace: astRagNormalizeString(cacheConfig.namespace, AST_RAG_CACHE_DEFAULTS.namespace),
    ttlSec: astRagResolveCacheTtl(cacheConfig, 'ttlSec', astRagNormalizePositiveInt(ttlSec, 300, 1))
  };

  const storageUri = astRagNormalizeString(cacheConfig.storageUri, '');
  if (storageUri) {
    options.storageUri = storageUri;
  }

  if (typeof cacheConfig.lockTimeoutMs === 'number') {
    options.lockTimeoutMs = astRagNormalizePositiveInt(
      cacheConfig.lockTimeoutMs,
      AST_RAG_CACHE_DEFAULTS.lockTimeoutMs,
      1
    );
  }

  if (typeof cacheConfig.updateStatsOnGet === 'boolean') {
    options.updateStatsOnGet = cacheConfig.updateStatsOnGet;
  }

  return options;
}

function astRagCacheGet(cacheConfig, key) {
  if (!astRagCanUseCache(cacheConfig)) {
    return null;
  }

  try {
    return astCacheGetValue(key, astRagBuildCacheOptions(cacheConfig, cacheConfig.ttlSec));
  } catch (_error) {
    return null;
  }
}

function astRagCacheSet(cacheConfig, key, value, ttlSec) {
  if (!astRagCanUseCache(cacheConfig)) {
    return null;
  }

  try {
    return astCacheSetValue(
      key,
      value,
      astRagBuildCacheOptions(cacheConfig, ttlSec)
    );
  } catch (_error) {
    return null;
  }
}

function astRagBuildIndexDocumentCacheKey(indexFileId, versionToken) {
  return astRagBuildCacheKey({
    kind: 'index_document',
    indexFileId,
    versionToken
  });
}

function astRagBuildEmbeddingCacheKey(indexFileId, versionToken, provider, model, query) {
  return astRagBuildCacheKey({
    kind: 'query_embedding',
    indexFileId,
    versionToken,
    provider,
    model,
    query
  });
}

function astRagBuildSearchCacheKey(indexFileId, versionToken, query, retrieval) {
  return astRagBuildCacheKey({
    kind: 'search',
    indexFileId,
    versionToken,
    query,
    retrieval
  });
}

function astRagBuildAnswerCacheKey(indexFileId, versionToken, question, history, retrieval, generation, options) {
  const normalizedGeneration = astRagIsPlainObject(generation)
    ? Object.assign({}, generation, {
      // Ensure cache identity includes generation options/providerOptions even when omitted,
      // and avoids collisions when callers rely on defaults.
      options: astRagIsPlainObject(generation.options) ? generation.options : {},
      providerOptions: astRagIsPlainObject(generation.providerOptions) ? generation.providerOptions : {}
    })
    : generation;

  return astRagBuildCacheKey({
    kind: 'answer',
    indexFileId,
    versionToken,
    question,
    history,
    retrieval,
    generation: normalizedGeneration,
    options
  });
}
