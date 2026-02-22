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

function astRagProjectChunkForRetrieval(chunk = {}) {
  return {
    chunkId: chunk.chunkId,
    sourceId: chunk.sourceId,
    fileId: chunk.fileId,
    fileName: chunk.fileName,
    mimeType: chunk.mimeType,
    page: chunk.page == null ? null : chunk.page,
    slide: chunk.slide == null ? null : chunk.slide,
    section: chunk.section || 'body',
    text: chunk.text
  };
}

function astRagRetrieveRankedChunks(indexDocument, query, queryVector, retrieval = {}) {
  const chunks = astRagApplyChunkFilters(indexDocument.chunks || [], retrieval.filters || {});
  if (chunks.length === 0) {
    return [];
  }

  const lexical = retrieval.mode === 'hybrid'
    ? astRagComputeLexicalScores(query, chunks)
    : { scores: {} };

  const scored = chunks.map(chunk => {
    const vectorScore = astRagCosineSimilarity(queryVector, chunk.embedding);
    const lexicalScore = lexical.scores[chunk.chunkId] || 0;

    return Object.assign(
      astRagProjectChunkForRetrieval(chunk),
      {
        vectorScore,
        lexicalScore
      }
    );
  });

  const fused = astRagFuseRetrievalScores(scored, retrieval);
  const ranked = astRagSortScoredResults(fused)
    .filter(item => item.finalScore >= retrieval.minScore);
  const reranked = astRagRerankResults(query, ranked, retrieval.rerank || {});

  return reranked
    .slice(0, retrieval.topK)
    .map(item => Object.assign({}, item, {
      score: item.finalScore
    }));
}
