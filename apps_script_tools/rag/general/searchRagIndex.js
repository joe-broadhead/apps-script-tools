function astRagBuildSearchDiagnostics(normalizedRequest, cacheConfig = {}) {
  return {
    totalMs: 0,
    cache: {
      indexDocHit: false,
      searchHit: false,
      embeddingHit: false,
      retrievalPayloadHit: false,
      answerHit: false,
      backend: astRagNormalizeString(cacheConfig.backend, AST_RAG_CACHE_DEFAULTS.backend),
      namespace: astRagNormalizeString(cacheConfig.namespace, AST_RAG_CACHE_DEFAULTS.namespace),
      lockScope: astRagNormalizeString(cacheConfig.lockScope, AST_RAG_CACHE_DEFAULTS.lockScope),
      lockContention: 0,
      hitPath: null
    },
    timings: {
      validationMs: 0,
      indexLoadMs: 0,
      embeddingMs: 0,
      retrievalMs: 0,
      rerankMs: 0,
      generationMs: 0,
      searchMs: 0,
      payloadCacheWriteMs: 0,
      cacheGetMs: 0,
      cacheSetMs: 0,
      cacheDeleteMs: 0,
      lockWaitMs: 0
    },
    retrieval: {
      mode: normalizedRequest.retrieval.mode,
      topK: normalizedRequest.retrieval.topK,
      minScore: normalizedRequest.retrieval.minScore,
      returned: 0,
      timedOut: false,
      timeoutMs: normalizedRequest.options && typeof normalizedRequest.options.maxRetrievalMs === 'number'
        ? normalizedRequest.options.maxRetrievalMs
        : null,
      timeoutStage: null
    }
  };
}

function astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta) {
  if (!astRagIsPlainObject(diagnostics) || !astRagIsPlainObject(operationMeta)) {
    return;
  }

  if (!astRagIsPlainObject(diagnostics.timings)) {
    diagnostics.timings = {};
  }
  if (!astRagIsPlainObject(diagnostics.cache)) {
    diagnostics.cache = {};
  }

  const durationMs = typeof operationMeta.durationMs === 'number' && isFinite(operationMeta.durationMs)
    ? Math.max(0, operationMeta.durationMs)
    : 0;
  const lockWaitMs = typeof operationMeta.lockWaitMs === 'number' && isFinite(operationMeta.lockWaitMs)
    ? Math.max(0, operationMeta.lockWaitMs)
    : 0;
  const lockContention = typeof operationMeta.lockContention === 'number' && isFinite(operationMeta.lockContention)
    ? Math.max(0, operationMeta.lockContention)
    : 0;

  if (operationMeta.operation === 'set') {
    diagnostics.timings.cacheSetMs = (diagnostics.timings.cacheSetMs || 0) + durationMs;
  } else if (operationMeta.operation === 'delete') {
    diagnostics.timings.cacheDeleteMs = (diagnostics.timings.cacheDeleteMs || 0) + durationMs;
  } else {
    diagnostics.timings.cacheGetMs = (diagnostics.timings.cacheGetMs || 0) + durationMs;
  }

  diagnostics.timings.lockWaitMs = (diagnostics.timings.lockWaitMs || 0) + lockWaitMs;
  diagnostics.cache.lockContention = (diagnostics.cache.lockContention || 0) + lockContention;
  diagnostics.cache.backend = astRagNormalizeString(operationMeta.backend, diagnostics.cache.backend);
  diagnostics.cache.namespace = astRagNormalizeString(operationMeta.namespace, diagnostics.cache.namespace);
  diagnostics.cache.lockScope = astRagNormalizeString(operationMeta.lockScope, diagnostics.cache.lockScope);
  if (!diagnostics.cache.hitPath && operationMeta.hit && operationMeta.path) {
    diagnostics.cache.hitPath = operationMeta.path;
  }
}

function astRagSearchBuildTimeoutError(timeoutMs, stage, startedAtMs) {
  return new AstRagRetrievalError('RAG retrieval exceeded maxRetrievalMs budget', {
    timedOut: true,
    timeoutMs,
    timeoutStage: astRagNormalizeString(stage, 'retrieval'),
    elapsedMs: Math.max(0, new Date().getTime() - startedAtMs)
  });
}

function astRagSearchAssertWithinBudget(timeoutMs, startedAtMs, stage, diagnostics = null) {
  if (!(typeof timeoutMs === 'number' && isFinite(timeoutMs) && timeoutMs > 0)) {
    return;
  }

  const elapsedMs = Math.max(0, new Date().getTime() - startedAtMs);
  if (elapsedMs <= timeoutMs) {
    return;
  }

  if (astRagIsPlainObject(diagnostics) && astRagIsPlainObject(diagnostics.retrieval)) {
    diagnostics.retrieval.timedOut = true;
    diagnostics.retrieval.timeoutMs = timeoutMs;
    diagnostics.retrieval.timeoutStage = astRagNormalizeString(stage, 'retrieval');
  }

  throw astRagSearchBuildTimeoutError(timeoutMs, stage, startedAtMs);
}

function astRagSearchNormalizedCore(normalizedRequest, runtimeOptions = {}) {
  if (!astRagIsPlainObject(normalizedRequest)) {
    throw new AstRagValidationError('search request must be an object');
  }

  const totalStartMs = typeof runtimeOptions.totalStartMs === 'number'
    ? runtimeOptions.totalStartMs
    : new Date().getTime();
  const validationMs = typeof runtimeOptions.validationMs === 'number'
    ? Math.max(0, runtimeOptions.validationMs)
    : 0;
  const diagnosticsEnabled = normalizedRequest.options && normalizedRequest.options.diagnostics === true;
  const retrievalTimeoutMs = normalizedRequest.options && typeof normalizedRequest.options.maxRetrievalMs === 'number'
    ? normalizedRequest.options.maxRetrievalMs
    : null;
  const retrievalStartedAtMs = new Date().getTime();
  const retrievalMode = normalizedRequest.retrieval.mode;

  const cacheConfig = astRagResolveCacheConfig(normalizedRequest.cache || {});
  const diagnostics = astRagBuildSearchDiagnostics(normalizedRequest, cacheConfig);
  diagnostics.timings.validationMs = validationMs;

  const indexLoadStartMs = new Date().getTime();
  const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId, {
    cache: cacheConfig,
    cacheDiagnostics: operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta)
  });
  diagnostics.timings.indexLoadMs = Math.max(0, new Date().getTime() - indexLoadStartMs);
  diagnostics.cache.indexDocHit = loaded && loaded.cacheHit === true;
  if (diagnostics.cache.indexDocHit) {
    diagnostics.cache.hitPath = diagnostics.cache.hitPath || 'index_doc';
  }
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'index_load', diagnostics);

  const document = loaded.document;
  const versionToken = astRagNormalizeString(
    loaded.versionToken,
    astRagNormalizeString(document.updatedAt, 'unknown')
  );

  const searchCacheKey = astRagBuildSearchCacheKey(
    normalizedRequest.indexFileId,
    versionToken,
    normalizedRequest.query,
    normalizedRequest.retrieval
  );
  const cachedSearch = astRagCacheGet(
    cacheConfig,
    searchCacheKey,
    operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta),
    { path: 'search' }
  );
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'cache_search_get', diagnostics);
  if (cachedSearch && Array.isArray(cachedSearch.results)) {
    if (!diagnosticsEnabled) {
      return cachedSearch;
    }

    const cachedResponse = astRagCloneObject(cachedSearch);
    diagnostics.cache.searchHit = true;
    diagnostics.cache.embeddingHit = retrievalMode !== 'lexical';
    diagnostics.cache.hitPath = 'search';
    diagnostics.retrieval.returned = cachedResponse.results.length;
    diagnostics.totalMs = Math.max(0, new Date().getTime() - totalStartMs);
    cachedResponse.diagnostics = diagnostics;
    return cachedResponse;
  }

  const indexEmbedding = document.embedding || {};
  const embeddingProvider = astRagNormalizeString(indexEmbedding.provider, null);
  const embeddingModel = astRagNormalizeString(indexEmbedding.model, null);
  let embeddingCacheKey = null;
  if (retrievalMode !== 'lexical') {
    if (!embeddingProvider || !embeddingModel) {
      throw new AstRagRetrievalError('Index is missing embedding provider/model metadata', {
        indexFileId: normalizedRequest.indexFileId
      });
    }

    embeddingCacheKey = astRagBuildEmbeddingCacheKey(
      normalizedRequest.indexFileId,
      versionToken,
      embeddingProvider,
      embeddingModel,
      normalizedRequest.query
    );
  }

  const cachedEmbedding = embeddingCacheKey
    ? astRagCacheGet(
      cacheConfig,
      embeddingCacheKey,
      operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta),
      { path: 'embedding' }
    )
    : null;
  let queryVector = null;
  let usage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0
  };
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'cache_embedding_get', diagnostics);

  if (retrievalMode === 'lexical') {
    queryVector = null;
  } else if (cachedEmbedding && Array.isArray(cachedEmbedding.vector)) {
    diagnostics.cache.embeddingHit = true;
    diagnostics.cache.hitPath = diagnostics.cache.hitPath || 'embedding';
    queryVector = cachedEmbedding.vector.slice();
  } else {
    const embeddingStartMs = new Date().getTime();
    astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'embedding', diagnostics);
    const queryEmbedding = astRagEmbedTexts({
      provider: embeddingProvider,
      model: embeddingModel,
      texts: [normalizedRequest.query],
      auth: normalizedRequest.auth,
      providerOptions: normalizedRequest.embedding.providerOptions,
      options: { retries: 2 }
    });

    queryVector = queryEmbedding.vectors[0];
    usage = queryEmbedding.usage || usage;
    diagnostics.timings.embeddingMs = Math.max(0, new Date().getTime() - embeddingStartMs);
    astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'embedding', diagnostics);
    astRagCacheSet(
      cacheConfig,
      embeddingCacheKey,
      {
        vector: queryVector
      },
      cacheConfig.embeddingTtlSec,
      operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta),
      { path: 'embedding' }
    );
    astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'cache_embedding_set', diagnostics);
  }

  const retrievalStartMs = new Date().getTime();
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'retrieval', diagnostics);
  const ranked = astRagRetrieveRankedChunks(
    document,
    normalizedRequest.query,
    queryVector,
    normalizedRequest.retrieval
  );
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'retrieval', diagnostics);
  diagnostics.timings.retrievalMs = Math.max(0, new Date().getTime() - retrievalStartMs);
  diagnostics.retrieval.returned = ranked.length;
  diagnostics.timings.searchMs = diagnostics.timings.indexLoadMs + diagnostics.timings.embeddingMs + diagnostics.timings.retrievalMs;
  diagnostics.totalMs = Math.max(0, new Date().getTime() - totalStartMs);

  const response = {
    indexFileId: normalizedRequest.indexFileId,
    versionToken,
    query: normalizedRequest.query,
    topK: normalizedRequest.retrieval.topK,
    minScore: normalizedRequest.retrieval.minScore,
    mode: normalizedRequest.retrieval.mode,
    retrieval: normalizedRequest.retrieval,
    results: ranked,
    usage
  };
  if (diagnosticsEnabled) {
    response.diagnostics = diagnostics;
  }

  const cacheableResponse = astRagCloneObject(response);
  delete cacheableResponse.diagnostics;
  astRagCacheSet(
    cacheConfig,
    searchCacheKey,
    cacheableResponse,
    cacheConfig.searchTtlSec,
    operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta),
    { path: 'search' }
  );
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'cache_search_set', diagnostics);
  return response;
}

function astRagSearchCore(request = {}) {
  const totalStartMs = new Date().getTime();
  const validateStartMs = totalStartMs;
  const normalizedRequest = astRagValidateSearchRequest(request);
  const validationMs = Math.max(0, new Date().getTime() - validateStartMs);
  return astRagSearchNormalizedCore(normalizedRequest, {
    totalStartMs,
    validationMs
  });
}
