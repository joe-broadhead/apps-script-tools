const AST_RAG_ANSWER_CACHE_DEFAULT_TTL_SEC = 120;
const AST_RAG_ANSWER_CACHE_MAX_TTL_SEC = 3600;
const AST_RAG_ANSWER_CACHE_PREFIX = 'AST_RAG_ANSWER_';
let AST_RAG_LOCAL_ANSWER_CACHE = {};

function astRagCanUseScriptCache() {
  return (
    typeof CacheService !== 'undefined' &&
    CacheService &&
    typeof CacheService.getScriptCache === 'function'
  );
}

function astRagResolveAnswerCacheTtlSec(normalizedRequest = {}) {
  const options = astRagIsPlainObject(normalizedRequest.options) ? normalizedRequest.options : {};
  return astRagNormalizePositiveInt(
    options.answerCacheTtlSec,
    AST_RAG_ANSWER_CACHE_DEFAULT_TTL_SEC,
    1
  );
}

function astRagBuildAnswerCacheIdentity(normalizedRequest = {}, indexDocument = {}) {
  const payload = {
    indexFileId: astRagNormalizeString(normalizedRequest.indexFileId, ''),
    indexVersion: astRagNormalizeString(indexDocument.indexVersion, null)
      || astRagNormalizeString(indexDocument.updatedAt, null)
      || '',
    question: astRagNormalizeString(normalizedRequest.question, ''),
    history: Array.isArray(normalizedRequest.history) ? normalizedRequest.history : [],
    retrieval: normalizedRequest.retrieval || {},
    generation: {
      provider: normalizedRequest.generation && normalizedRequest.generation.provider,
      model: normalizedRequest.generation && normalizedRequest.generation.model
    },
    options: {
      requireCitations: Boolean(normalizedRequest.options && normalizedRequest.options.requireCitations),
      enforceAccessControl: Boolean(normalizedRequest.options && normalizedRequest.options.enforceAccessControl),
      insufficientEvidenceMessage: astRagNormalizeString(
        normalizedRequest.options && normalizedRequest.options.insufficientEvidenceMessage,
        ''
      )
    }
  };

  return astRagHashString(astRagStableStringify(payload));
}

function astRagBuildAnswerCacheKey(identity) {
  return `${AST_RAG_ANSWER_CACHE_PREFIX}${identity}`;
}

function astRagGetLocalCachedAnswer(cacheKey) {
  const cached = AST_RAG_LOCAL_ANSWER_CACHE[cacheKey];
  if (!cached) {
    return null;
  }
  if (cached.expiresAtMs <= Date.now()) {
    delete AST_RAG_LOCAL_ANSWER_CACHE[cacheKey];
    return null;
  }
  return astRagSafeJsonParse(cached.payload, null);
}

function astRagSetLocalCachedAnswer(cacheKey, value, ttlSec) {
  AST_RAG_LOCAL_ANSWER_CACHE[cacheKey] = {
    payload: JSON.stringify(value),
    expiresAtMs: Date.now() + (ttlSec * 1000)
  };
}

function astRagGetAnswerCache(identity) {
  const cacheKey = astRagBuildAnswerCacheKey(identity);

  if (astRagCanUseScriptCache()) {
    try {
      const cache = CacheService.getScriptCache();
      if (cache && typeof cache.get === 'function') {
        const raw = cache.get(cacheKey);
        const parsed = astRagSafeJsonParse(raw, null);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (_error) {
      // fallback to local cache
    }
  }

  return astRagGetLocalCachedAnswer(cacheKey);
}

function astRagSetAnswerCache(identity, value, ttlSec) {
  const cacheKey = astRagBuildAnswerCacheKey(identity);
  const normalizedTtl = Math.max(1, Math.min(AST_RAG_ANSWER_CACHE_MAX_TTL_SEC, ttlSec));
  const serialized = JSON.stringify(value);

  if (astRagCanUseScriptCache()) {
    try {
      const cache = CacheService.getScriptCache();
      if (cache && typeof cache.put === 'function') {
        cache.put(cacheKey, serialized, normalizedTtl);
        return;
      }
    } catch (_error) {
      // fallback to local cache
    }
  }

  astRagSetLocalCachedAnswer(cacheKey, value, normalizedTtl);
}

