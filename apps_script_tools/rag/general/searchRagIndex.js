function astRagSearchCore(request = {}) {
  const normalizedRequest = astRagValidateSearchRequest(request);
  const cacheConfig = astRagResolveCacheConfig(normalizedRequest.cache || {});
  const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId, {
    cache: cacheConfig
  });
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
    return cachedSearch;
  }

  const indexEmbedding = document.embedding || {};
  const embeddingProvider = astRagNormalizeString(indexEmbedding.provider, null);
  const embeddingModel = astRagNormalizeString(indexEmbedding.model, null);

  if (!embeddingProvider || !embeddingModel) {
    throw new AstRagRetrievalError('Index is missing embedding provider/model metadata', {
      indexFileId: normalizedRequest.indexFileId
    });
  }

  const embeddingCacheKey = astRagBuildEmbeddingCacheKey(
    normalizedRequest.indexFileId,
    versionToken,
    embeddingProvider,
    embeddingModel,
    normalizedRequest.query
  );

  const cachedEmbedding = astRagCacheGet(cacheConfig, embeddingCacheKey);
  let queryVector = null;
  let usage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0
  };

  if (cachedEmbedding && Array.isArray(cachedEmbedding.vector)) {
    queryVector = cachedEmbedding.vector.slice();
  } else {
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
    astRagCacheSet(cacheConfig, embeddingCacheKey, {
      vector: queryVector
    }, cacheConfig.embeddingTtlSec);
  }

  const ranked = astRagRetrieveRankedChunks(
    document,
    normalizedRequest.query,
    queryVector,
    normalizedRequest.retrieval
  );

  const response = {
    query: normalizedRequest.query,
    topK: normalizedRequest.retrieval.topK,
    minScore: normalizedRequest.retrieval.minScore,
    mode: normalizedRequest.retrieval.mode,
    results: ranked,
    usage
  };

  astRagCacheSet(cacheConfig, searchCacheKey, response, cacheConfig.searchTtlSec);
  return response;
}
