function astRagBuildSearchDiagnostics(normalizedRequest) {
  return {
    totalMs: 0,
    cache: {
      indexDocHit: false,
      searchHit: false,
      embeddingHit: false,
      retrievalPayloadHit: false,
      answerHit: false
    },
    timings: {
      validationMs: 0,
      indexLoadMs: 0,
      embeddingMs: 0,
      retrievalMs: 0,
      rerankMs: 0,
      generationMs: 0,
      searchMs: 0,
      payloadCacheWriteMs: 0
    },
    retrieval: {
      mode: normalizedRequest.retrieval.mode,
      topK: normalizedRequest.retrieval.topK,
      minScore: normalizedRequest.retrieval.minScore,
      returned: 0
    }
  };
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
  const diagnostics = astRagBuildSearchDiagnostics(normalizedRequest);
  const retrievalMode = normalizedRequest.retrieval.mode;
  diagnostics.timings.validationMs = validationMs;

  const cacheConfig = astRagResolveCacheConfig(normalizedRequest.cache || {});

  const indexLoadStartMs = new Date().getTime();
  const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId, {
    cache: cacheConfig
  });
  diagnostics.timings.indexLoadMs = Math.max(0, new Date().getTime() - indexLoadStartMs);
  diagnostics.cache.indexDocHit = loaded && loaded.cacheHit === true;

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
  const cachedSearch = astRagCacheGet(cacheConfig, searchCacheKey);
  if (cachedSearch && Array.isArray(cachedSearch.results)) {
    if (!diagnosticsEnabled) {
      return cachedSearch;
    }

    const cachedResponse = astRagCloneObject(cachedSearch);
    diagnostics.cache.searchHit = true;
    diagnostics.cache.embeddingHit = retrievalMode !== 'lexical';
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

  const cachedEmbedding = embeddingCacheKey ? astRagCacheGet(cacheConfig, embeddingCacheKey) : null;
  let queryVector = null;
  let usage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0
  };

  if (retrievalMode === 'lexical') {
    queryVector = null;
  } else if (cachedEmbedding && Array.isArray(cachedEmbedding.vector)) {
    diagnostics.cache.embeddingHit = true;
    queryVector = cachedEmbedding.vector.slice();
  } else {
    const embeddingStartMs = new Date().getTime();
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
    astRagCacheSet(cacheConfig, embeddingCacheKey, {
      vector: queryVector
    }, cacheConfig.embeddingTtlSec);
  }

  const retrievalStartMs = new Date().getTime();
  const ranked = astRagRetrieveRankedChunks(
    document,
    normalizedRequest.query,
    queryVector,
    normalizedRequest.retrieval
  );
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
  astRagCacheSet(cacheConfig, searchCacheKey, cacheableResponse, cacheConfig.searchTtlSec);
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
