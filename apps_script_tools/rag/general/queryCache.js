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
  lockScope: 'script',
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

function astRagBuildCacheOperationMeta(cacheOptions = {}, operation = 'get', context = {}) {
  return {
    operation: astRagNormalizeString(operation, 'get'),
    path: astRagNormalizeString(context.path, null),
    backend: astRagNormalizeString(cacheOptions.backend, AST_RAG_CACHE_DEFAULTS.backend),
    namespace: astRagNormalizeString(cacheOptions.namespace, AST_RAG_CACHE_DEFAULTS.namespace),
    lockScope: astRagNormalizeString(cacheOptions.lockScope, AST_RAG_CACHE_DEFAULTS.lockScope),
    durationMs: 0,
    lockWaitMs: 0,
    lockContention: 0,
    hit: false,
    errorClass: null
  };
}

function astRagAttachCacheTrace(cacheOptions = {}, operationMeta = null) {
  if (!astRagIsPlainObject(cacheOptions) || !astRagIsPlainObject(operationMeta)) {
    return cacheOptions;
  }

  cacheOptions.traceContext = {
    source: 'rag',
    operation: operationMeta.operation,
    path: operationMeta.path
  };
  cacheOptions.traceCollector = event => {
    if (!event || typeof event !== 'object' || event.event !== 'lock_acquire') {
      return;
    }

    const waitMs = typeof event.waitMs === 'number' && isFinite(event.waitMs)
      ? Math.max(0, event.waitMs)
      : 0;
    operationMeta.lockWaitMs += waitMs;
    if (event.contention === true || waitMs > 0) {
      operationMeta.lockContention += 1;
    }
  };
  return cacheOptions;
}

function astRagFinalizeCacheOperationMeta(operationMeta, startedAtMs, diagnosticsCollector) {
  if (!astRagIsPlainObject(operationMeta)) {
    return;
  }

  operationMeta.durationMs = Math.max(0, new Date().getTime() - startedAtMs);

  if (typeof diagnosticsCollector === 'function') {
    diagnosticsCollector(operationMeta);
  }
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

  if (typeof cacheConfig.lockScope === 'string') {
    options.lockScope = astRagNormalizeString(cacheConfig.lockScope, AST_RAG_CACHE_DEFAULTS.lockScope);
  }

  if (typeof cacheConfig.updateStatsOnGet === 'boolean') {
    options.updateStatsOnGet = cacheConfig.updateStatsOnGet;
  }

  return options;
}

function astRagCacheGet(cacheConfig, key, diagnosticsCollector = null, context = {}) {
  if (!astRagCanUseCache(cacheConfig)) {
    if (typeof diagnosticsCollector === 'function') {
      diagnosticsCollector({
        operation: 'get',
        path: astRagNormalizeString(context.path, null),
        backend: astRagNormalizeString(cacheConfig && cacheConfig.backend, AST_RAG_CACHE_DEFAULTS.backend),
        namespace: astRagNormalizeString(cacheConfig && cacheConfig.namespace, AST_RAG_CACHE_DEFAULTS.namespace),
        lockScope: astRagNormalizeString(cacheConfig && cacheConfig.lockScope, AST_RAG_CACHE_DEFAULTS.lockScope),
        durationMs: 0,
        lockWaitMs: 0,
        lockContention: 0,
        hit: false,
        errorClass: null
      });
    }
    return null;
  }

  const options = astRagBuildCacheOptions(cacheConfig, cacheConfig.ttlSec);
  const operationMeta = astRagBuildCacheOperationMeta(options, 'get', context);
  astRagAttachCacheTrace(options, operationMeta);
  const startedAtMs = new Date().getTime();

  try {
    const value = astCacheGetValue(key, options);
    operationMeta.hit = value != null;
    return value;
  } catch (error) {
    operationMeta.errorClass = error && error.name ? error.name : 'Error';
    return null;
  } finally {
    astRagFinalizeCacheOperationMeta(operationMeta, startedAtMs, diagnosticsCollector);
  }
}

function astRagCacheSet(cacheConfig, key, value, ttlSec, diagnosticsCollector = null, context = {}) {
  if (!astRagCanUseCache(cacheConfig)) {
    if (typeof diagnosticsCollector === 'function') {
      diagnosticsCollector({
        operation: 'set',
        path: astRagNormalizeString(context.path, null),
        backend: astRagNormalizeString(cacheConfig && cacheConfig.backend, AST_RAG_CACHE_DEFAULTS.backend),
        namespace: astRagNormalizeString(cacheConfig && cacheConfig.namespace, AST_RAG_CACHE_DEFAULTS.namespace),
        lockScope: astRagNormalizeString(cacheConfig && cacheConfig.lockScope, AST_RAG_CACHE_DEFAULTS.lockScope),
        durationMs: 0,
        lockWaitMs: 0,
        lockContention: 0,
        hit: false,
        errorClass: null
      });
    }
    return null;
  }

  const options = astRagBuildCacheOptions(cacheConfig, ttlSec);
  const operationMeta = astRagBuildCacheOperationMeta(options, 'set', context);
  astRagAttachCacheTrace(options, operationMeta);
  const startedAtMs = new Date().getTime();

  try {
    const result = astCacheSetValue(
      key,
      value,
      options
    );
    return result;
  } catch (error) {
    operationMeta.errorClass = error && error.name ? error.name : 'Error';
    return null;
  } finally {
    astRagFinalizeCacheOperationMeta(operationMeta, startedAtMs, diagnosticsCollector);
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
  return astRagBuildCacheKey({
    kind: 'answer',
    indexFileId,
    versionToken,
    question,
    history,
    retrieval,
    generation,
    options
  });
}
