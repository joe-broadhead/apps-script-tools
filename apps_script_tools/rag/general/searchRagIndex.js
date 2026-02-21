function astRagApplyChunkFilters(chunks, filters = {}) {
  const fileSet = new Set(filters.fileIds || []);
  const mimeSet = new Set(filters.mimeTypes || []);

  return chunks.filter(chunk => {
    if (fileSet.size > 0 && !fileSet.has(chunk.fileId)) {
      return false;
    }

    if (mimeSet.size > 0 && !mimeSet.has(chunk.mimeType)) {
      return false;
    }

    return true;
  });
}

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
  const chunks = astRagApplyChunkFilters(document.chunks || [], normalizedRequest.filters);

  const ranked = chunks.map(chunk => {
    return {
      chunk,
      score: astRagCosineSimilarity(queryVector, chunk.embedding)
    };
  })
    .filter(item => item.score >= normalizedRequest.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, normalizedRequest.topK)
    .map(item => ({
      chunkId: item.chunk.chunkId,
      sourceId: item.chunk.sourceId,
      fileId: item.chunk.fileId,
      fileName: item.chunk.fileName,
      mimeType: item.chunk.mimeType,
      page: item.chunk.page == null ? null : item.chunk.page,
      slide: item.chunk.slide == null ? null : item.chunk.slide,
      section: item.chunk.section || 'body',
      text: item.chunk.text,
      score: item.score
    }));

  return {
    query: normalizedRequest.query,
    topK: normalizedRequest.topK,
    minScore: normalizedRequest.minScore,
    results: ranked,
    usage: queryEmbedding.usage
  };
}
