function astRagSearchCore(request = {}) {
  const normalizedRequest = astRagValidateSearchRequest(request);
  const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId);
  const document = loaded.document;

  const indexEmbedding = document.embedding || {};
  const embeddingProvider = astRagNormalizeString(indexEmbedding.provider, null);
  const embeddingModel = astRagNormalizeString(indexEmbedding.model, null);

  if (!embeddingProvider || !embeddingModel) {
    throw new AstRagRetrievalError('Index is missing embedding provider/model metadata', {
      indexFileId: normalizedRequest.indexFileId
    });
  }

  const queryEmbedding = astRagEmbedTexts({
    provider: embeddingProvider,
    model: embeddingModel,
    texts: [normalizedRequest.query],
    auth: normalizedRequest.auth,
    providerOptions: normalizedRequest.embedding.providerOptions,
    options: { retries: 2 }
  });

  const queryVector = queryEmbedding.vectors[0];
  const ranked = astRagRetrieveRankedChunks(
    document,
    normalizedRequest.query,
    queryVector,
    normalizedRequest.retrieval
  );

  return {
    query: normalizedRequest.query,
    topK: normalizedRequest.retrieval.topK,
    minScore: normalizedRequest.retrieval.minScore,
    mode: normalizedRequest.retrieval.mode,
    results: ranked,
    usage: queryEmbedding.usage
  };
}
