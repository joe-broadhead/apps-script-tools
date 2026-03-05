function astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta) {
  astRagApplyCacheOperationDiagnosticsShared(diagnostics, operationMeta);
}

function astRagSearchAssertWithinBudget(timeoutMs, startedAtMs, stage, diagnostics = null) {
  astRagAssertRetrievalWithinBudgetShared(timeoutMs, startedAtMs, stage, diagnostics);
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
  const queryPlan = astRagBuildQueryTransformPlan(
    normalizedRequest.query,
    normalizedRequest.retrieval.queryTransform
  );
  const retrievalQueries = Array.isArray(queryPlan.retrievalQueries) && queryPlan.retrievalQueries.length > 0
    ? queryPlan.retrievalQueries.slice()
    : [normalizedRequest.query];

  const cacheConfig = astRagResolveCacheConfig(normalizedRequest.cache || {});
  const diagnostics = astRagBuildSearchDiagnostics(normalizedRequest, cacheConfig);
  diagnostics.timings.validationMs = validationMs;
  diagnostics.retrieval.queryCount = retrievalQueries.length;
  diagnostics.retrieval.originalQuery = queryPlan.originalQuery;
  diagnostics.retrieval.rewrittenQuery = queryPlan.rewrittenQuery;
  diagnostics.retrieval.transformedQuery = queryPlan.transformed === true;

  const indexLoadStartMs = new Date().getTime();
  const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId, {
    loadChunks: false,
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
    queryPlan,
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
    if (astRagIsPlainObject(cachedResponse.queryProvenance)) {
      diagnostics.retrieval.queryCount = Array.isArray(cachedResponse.queryProvenance.retrievalQueries)
        ? cachedResponse.queryProvenance.retrievalQueries.length
        : diagnostics.retrieval.queryCount;
      diagnostics.retrieval.originalQuery = astRagNormalizeString(
        cachedResponse.queryProvenance.originalQuery,
        diagnostics.retrieval.originalQuery
      );
      diagnostics.retrieval.rewrittenQuery = astRagNormalizeString(
        cachedResponse.queryProvenance.rewrittenQuery,
        diagnostics.retrieval.rewrittenQuery
      );
      diagnostics.retrieval.transformedQuery = cachedResponse.queryProvenance.transformed === true;
    }
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
  }
  const queryVectorsByQuery = {};
  let usage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0
  };
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'cache_embedding_get', diagnostics);

  if (retrievalMode !== 'lexical') {
    for (let queryIdx = 0; queryIdx < retrievalQueries.length; queryIdx += 1) {
      const currentQuery = retrievalQueries[queryIdx];
      embeddingCacheKey = astRagBuildEmbeddingCacheKey(
        normalizedRequest.indexFileId,
        versionToken,
        embeddingProvider,
        embeddingModel,
        currentQuery
      );

      const cachedEmbedding = astRagCacheGet(
        cacheConfig,
        embeddingCacheKey,
        operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta),
        { path: 'embedding' }
      );
      astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'cache_embedding_get', diagnostics);

      if (cachedEmbedding && Array.isArray(cachedEmbedding.vector)) {
        diagnostics.cache.embeddingHit = true;
        diagnostics.cache.hitPath = diagnostics.cache.hitPath || 'embedding';
        queryVectorsByQuery[currentQuery] = cachedEmbedding.vector.slice();
        continue;
      }

      const embeddingStartMs = new Date().getTime();
      astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'embedding', diagnostics);
      const queryEmbedding = astRagEmbedTexts({
        provider: embeddingProvider,
        model: embeddingModel,
        texts: [currentQuery],
        auth: normalizedRequest.auth,
        providerOptions: normalizedRequest.embedding.providerOptions,
        options: { retries: 2 }
      });

      queryVectorsByQuery[currentQuery] = queryEmbedding.vectors[0];
      usage.inputTokens += (queryEmbedding.usage && queryEmbedding.usage.inputTokens) || 0;
      usage.outputTokens += (queryEmbedding.usage && queryEmbedding.usage.outputTokens) || 0;
      usage.totalTokens += (queryEmbedding.usage && queryEmbedding.usage.totalTokens) || 0;
      diagnostics.timings.embeddingMs += Math.max(0, new Date().getTime() - embeddingStartMs);
      astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'embedding', diagnostics);
      astRagCacheSet(
        cacheConfig,
        embeddingCacheKey,
        {
          vector: queryVectorsByQuery[currentQuery]
        },
        cacheConfig.embeddingTtlSec,
        operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta),
        { path: 'embedding' }
      );
      astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'cache_embedding_set', diagnostics);
    }
  }

  const selectedShardRefs = astRagSelectShardRefsForSearch(
    document,
    normalizedRequest.retrieval,
    queryVectorsByQuery[queryPlan.rewrittenQuery] || queryVectorsByQuery[retrievalQueries[0]] || null
  );
  if (astRagIsShardedIndexDocument(document)) {
    diagnostics.retrieval.partition.totalShards = astRagNormalizeShardRefs(document.shards).length;
    diagnostics.retrieval.partition.selectedShards = selectedShardRefs.length;
    diagnostics.retrieval.partition.selectedShardIds = selectedShardRefs.map(ref => ref.shardId);
  }

  const retrievalStartMs = new Date().getTime();
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'retrieval_load', diagnostics);
  const retrievalChunks = astRagLoadIndexChunks(normalizedRequest.indexFileId, document, {
    shardIds: selectedShardRefs.map(ref => ref.shardId),
    cache: cacheConfig,
    cacheDiagnostics: operationMeta => astRagApplyCacheOperationDiagnostics(diagnostics, operationMeta)
  });
  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'retrieval_load', diagnostics);
  diagnostics.timings.retrievalLoadMs = Math.max(0, new Date().getTime() - retrievalStartMs);
  const retrievalDocument = astRagCloneObject(document);
  retrievalDocument.chunks = retrievalChunks;

  astRagSearchAssertWithinBudget(retrievalTimeoutMs, retrievalStartedAtMs, 'retrieval', diagnostics);
  const ranked = astRagRetrieveRankedChunksForQueries(
    retrievalDocument,
    queryPlan,
    queryVectorsByQuery,
    normalizedRequest.retrieval,
    { diagnostics }
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
    queryProvenance: queryPlan,
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
