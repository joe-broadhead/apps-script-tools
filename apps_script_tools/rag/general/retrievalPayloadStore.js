const AST_RAG_RETRIEVAL_PAYLOAD_SCHEMA_VERSION = '1.0';
const AST_RAG_RETRIEVAL_PAYLOAD_DEFAULTS = Object.freeze({
  namespace: 'ast_rag_retrieval',
  ttlSec: 600
});

function astRagNormalizeRetrievalPayloadKey(key, fieldName = 'key') {
  const normalized = astRagNormalizeString(key, null);
  if (!normalized) {
    throw new AstRagValidationError(`Retrieval payload ${fieldName} must be a non-empty string`);
  }
  return normalized;
}

function astRagBuildSourceUrl(fileId, mimeType, page, slide) {
  const normalizedFileId = astRagNormalizeString(fileId, null);
  if (!normalizedFileId) {
    return null;
  }

  if (mimeType === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${normalizedFileId}/edit`;
  }

  if (mimeType === 'application/vnd.google-apps.presentation') {
    if (typeof slide === 'number' && isFinite(slide) && slide > 0) {
      return `https://docs.google.com/presentation/d/${normalizedFileId}/edit#slide=id.p${Math.floor(slide)}`;
    }
    return `https://docs.google.com/presentation/d/${normalizedFileId}/edit`;
  }

  if (mimeType === 'application/pdf' && typeof page === 'number' && isFinite(page) && page > 0) {
    return `https://drive.google.com/file/d/${normalizedFileId}/view`;
  }

  return `https://drive.google.com/file/d/${normalizedFileId}/view`;
}

function astRagNormalizeRetrievalPayloadResult(item = {}) {
  if (!astRagIsPlainObject(item)) {
    throw new AstRagValidationError('retrieval payload results must contain objects');
  }

  const chunkId = astRagNormalizeString(item.chunkId, null);
  const fileId = astRagNormalizeString(item.fileId, null);
  const fileName = astRagNormalizeString(item.fileName, null);
  const mimeType = astRagNormalizeString(item.mimeType, null);
  const text = typeof item.text === 'string' ? item.text : '';

  if (!chunkId || !fileId || !fileName || !mimeType) {
    throw new AstRagValidationError(
      'retrieval payload result is missing required fields: chunkId, fileId, fileName, mimeType'
    );
  }

  const asFiniteOrNull = value => (typeof value === 'number' && isFinite(value) ? value : null);

  const finalScore = asFiniteOrNull(item.finalScore);
  const score = asFiniteOrNull(item.score);
  const normalizedFinalScore = finalScore == null ? score : finalScore;

  return {
    chunkId,
    sourceId: astRagNormalizeString(item.sourceId, null),
    fileId,
    fileName,
    mimeType,
    page: asFiniteOrNull(item.page),
    slide: asFiniteOrNull(item.slide),
    section: astRagNormalizeString(item.section, 'body'),
    text,
    score: normalizedFinalScore == null ? 0 : normalizedFinalScore,
    vectorScore: asFiniteOrNull(item.vectorScore),
    lexicalScore: asFiniteOrNull(item.lexicalScore),
    finalScore: normalizedFinalScore == null ? 0 : normalizedFinalScore,
    rerankScore: asFiniteOrNull(item.rerankScore)
  };
}

function astRagNormalizeRetrievalPayload(payload = {}, options = {}) {
  if (!astRagIsPlainObject(payload)) {
    throw new AstRagValidationError('retrieval payload must be an object');
  }

  const normalizedOptions = astRagIsPlainObject(options) ? options : {};
  const allowEmptyResults = astRagNormalizeBoolean(normalizedOptions.allowEmptyResults, true);

  const indexFileId = astRagNormalizeString(payload.indexFileId, null);
  const query = astRagNormalizeString(payload.query, null);

  if (!indexFileId) {
    throw new AstRagValidationError('retrieval payload requires indexFileId');
  }

  if (!query) {
    throw new AstRagValidationError('retrieval payload requires query');
  }

  const results = Array.isArray(payload.results)
    ? payload.results.map(astRagNormalizeRetrievalPayloadResult)
    : [];

  if (!allowEmptyResults && results.length === 0) {
    throw new AstRagValidationError('retrieval payload requires non-empty results');
  }

  const retrievalDefaults = astRagResolveRetrievalDefaults();
  const retrievalInput = astRagIsPlainObject(payload.retrieval) ? payload.retrieval : {};
  const retrievalCore = astRagNormalizeRetrievalConfig(
    retrievalInput,
    retrievalDefaults,
    'retrieval payload.retrieval'
  );
  const retrieval = Object.assign({}, retrievalCore, {
    filters: {
      fileIds: astRagNormalizeStringArray((retrievalInput.filters || {}).fileIds, 'retrieval payload.retrieval.filters.fileIds', true),
      mimeTypes: astRagNormalizeStringArray((retrievalInput.filters || {}).mimeTypes, 'retrieval payload.retrieval.filters.mimeTypes', true)
    },
    access: astRagNormalizeAccessControl(retrievalInput.access, 'retrieval payload.retrieval.access'),
    enforceAccessControl: astRagNormalizeBoolean(retrievalInput.enforceAccessControl, true)
  });

  return {
    schemaVersion: astRagNormalizeString(payload.schemaVersion, AST_RAG_RETRIEVAL_PAYLOAD_SCHEMA_VERSION),
    indexFileId,
    versionToken: astRagNormalizeString(payload.versionToken, null),
    query,
    retrieval,
    results,
    createdAt: astRagNormalizeString(payload.createdAt, astRagNowIsoString())
  };
}

function astRagBuildRetrievalPayload(args = {}) {
  if (!astRagIsPlainObject(args)) {
    throw new AstRagValidationError('retrieval payload args must be an object');
  }

  const payload = {
    schemaVersion: AST_RAG_RETRIEVAL_PAYLOAD_SCHEMA_VERSION,
    indexFileId: args.indexFileId,
    versionToken: args.versionToken,
    query: args.query,
    retrieval: astRagIsPlainObject(args.retrieval) ? astRagCloneObject(args.retrieval) : {},
    results: Array.isArray(args.results) ? args.results.slice() : [],
    createdAt: astRagNormalizeString(args.createdAt, astRagNowIsoString())
  };

  return astRagNormalizeRetrievalPayload(payload, { allowEmptyResults: true });
}

function astRagBuildRetrievalCacheKey(args = {}) {
  if (!astRagIsPlainObject(args)) {
    throw new AstRagValidationError('buildRetrievalCacheKey args must be an object');
  }

  const indexFileId = astRagNormalizeString(args.indexFileId, null);
  const query = astRagNormalizeString(args.query, null);

  if (!indexFileId) {
    throw new AstRagValidationError('buildRetrievalCacheKey requires indexFileId');
  }

  if (!query) {
    throw new AstRagValidationError('buildRetrievalCacheKey requires query');
  }

  const normalizedSearch = astRagValidateSearchRequest({
    indexFileId,
    query,
    retrieval: astRagIsPlainObject(args.retrieval) ? astRagCloneObject(args.retrieval) : {},
    filters: astRagIsPlainObject(args.filters) ? astRagCloneObject(args.filters) : {},
    access: astRagIsPlainObject(args.access) ? astRagCloneObject(args.access) : {},
    options: astRagIsPlainObject(args.options) ? astRagCloneObject(args.options) : {}
  });

  return astRagBuildCacheKey({
    kind: 'retrieval_payload',
    indexFileId,
    versionToken: astRagNormalizeString(args.versionToken, null),
    query,
    retrieval: normalizedSearch.retrieval
  });
}

function astRagResolveRetrievalPayloadCacheOptions(options = {}, fallbackCache = {}) {
  if (!astRagIsPlainObject(options)) {
    throw new AstRagValidationError('retrieval payload cache options must be an object');
  }

  const cacheOverrides = astRagIsPlainObject(options.cache) ? astRagCloneObject(options.cache) : {};
  const flatOverrides = {};
  const overrideKeys = [
    'backend',
    'namespace',
    'ttlSec',
    'searchTtlSec',
    'answerTtlSec',
    'embeddingTtlSec',
    'storageUri',
    'lockTimeoutMs',
    'updateStatsOnGet'
  ];

  for (let idx = 0; idx < overrideKeys.length; idx += 1) {
    const key = overrideKeys[idx];
    if (typeof options[key] !== 'undefined') {
      flatOverrides[key] = options[key];
    }
  }

  const resolved = astRagResolveCacheConfig(
    Object.assign({}, astRagIsPlainObject(fallbackCache) ? fallbackCache : {}, cacheOverrides, flatOverrides, {
      enabled: true
    })
  );

  const explicitNamespace = astRagNormalizeString(
    options.namespace,
    astRagNormalizeString(cacheOverrides.namespace, null)
  );
  const namespace = astRagNormalizeString(explicitNamespace, AST_RAG_RETRIEVAL_PAYLOAD_DEFAULTS.namespace);
  const ttlSec = astRagNormalizePositiveInt(
    options.ttlSec,
    resolved.searchTtlSec || resolved.ttlSec || AST_RAG_RETRIEVAL_PAYLOAD_DEFAULTS.ttlSec,
    1
  );

  return astRagBuildCacheOptions(Object.assign({}, resolved, {
    enabled: true,
    namespace,
    ttlSec
  }), ttlSec);
}

function astRagAssertRetrievalPayloadCacheRuntime() {
  if (
    typeof astCacheGetValue !== 'function' ||
    typeof astCacheSetValue !== 'function' ||
    typeof astCacheDeleteValue !== 'function'
  ) {
    throw new AstRagValidationError(
      'AST.Cache runtime is required for retrieval payload cache APIs'
    );
  }
}

function astRagPutRetrievalPayload(key, payload, options = {}, fallbackCache = {}) {
  astRagAssertRetrievalPayloadCacheRuntime();
  const normalizedKey = astRagNormalizeRetrievalPayloadKey(key);
  const normalizedPayload = astRagNormalizeRetrievalPayload(payload, { allowEmptyResults: true });
  const cacheOptions = astRagResolveRetrievalPayloadCacheOptions(options, fallbackCache);
  return astCacheSetValue(normalizedKey, normalizedPayload, cacheOptions);
}

function astRagGetRetrievalPayload(key, options = {}, fallbackCache = {}) {
  astRagAssertRetrievalPayloadCacheRuntime();
  const normalizedKey = astRagNormalizeRetrievalPayloadKey(key);
  const cacheOptions = astRagResolveRetrievalPayloadCacheOptions(options, fallbackCache);
  const payload = astCacheGetValue(normalizedKey, cacheOptions);
  if (!payload) {
    return null;
  }
  return astRagNormalizeRetrievalPayload(payload, { allowEmptyResults: true });
}

function astRagDeleteRetrievalPayload(key, options = {}, fallbackCache = {}) {
  astRagAssertRetrievalPayloadCacheRuntime();
  const normalizedKey = astRagNormalizeRetrievalPayloadKey(key);
  const cacheOptions = astRagResolveRetrievalPayloadCacheOptions(options, fallbackCache);
  return astCacheDeleteValue(normalizedKey, cacheOptions);
}

function astRagApplyRetrievalPolicyToPayloadResults(results, retrieval = {}) {
  const list = Array.isArray(results)
    ? results.map(astRagNormalizeRetrievalPayloadResult)
    : [];

  const filteredByQuery = astRagApplyChunkFilters(list, retrieval.filters || {});
  const filteredByAccess = astRagApplyAccessControl(filteredByQuery, retrieval.access || {}, {
    enforceAccessControl: retrieval.enforceAccessControl
  });

  const minScore = typeof retrieval.minScore === 'number' && isFinite(retrieval.minScore)
    ? retrieval.minScore
    : AST_RAG_DEFAULT_RETRIEVAL.minScore;
  const topK = astRagNormalizePositiveInt(retrieval.topK, AST_RAG_DEFAULT_RETRIEVAL.topK, 1);

  const ranked = filteredByAccess
    .map(item => Object.assign({}, item, {
      score: typeof item.finalScore === 'number' && isFinite(item.finalScore)
        ? item.finalScore
        : item.score
    }))
    .filter(item => item.score >= minScore)
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, topK);
}

function astRagResolveAnswerRetrievalPayload(normalizedRequest, indexFileId, versionToken, fallbackCache = {}) {
  let payload = null;

  if (astRagIsPlainObject(normalizedRequest.retrievalPayload)) {
    payload = normalizedRequest.retrievalPayload;
  } else if (normalizedRequest.retrievalPayloadKey) {
    payload = astRagGetRetrievalPayload(
      normalizedRequest.retrievalPayloadKey,
      normalizedRequest.retrievalPayloadCache || {},
      fallbackCache
    );
  }

  if (!payload) {
    return null;
  }

  const normalizedPayload = astRagNormalizeRetrievalPayload(payload, { allowEmptyResults: true });
  if (normalizedPayload.indexFileId !== indexFileId) {
    return null;
  }

  const payloadVersion = astRagNormalizeString(normalizedPayload.versionToken, null);
  const normalizedVersion = astRagNormalizeString(versionToken, null);
  if (payloadVersion && normalizedVersion && payloadVersion !== normalizedVersion) {
    return null;
  }

  if (normalizedPayload.query !== normalizedRequest.question) {
    return null;
  }

  return normalizedPayload;
}
