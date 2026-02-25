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

function astRagResolveRetrievalSelectionLimit(retrieval = {}) {
  const topK = astRagNormalizePositiveInt(
    retrieval.topK,
    AST_RAG_DEFAULT_RETRIEVAL.topK,
    1
  );
  const rerankEnabled = retrieval
    && retrieval.rerank
    && retrieval.rerank.enabled === true;
  if (!rerankEnabled) {
    return topK;
  }

  const rerankTopN = astRagNormalizePositiveInt(
    retrieval.rerank.topN,
    AST_RAG_DEFAULT_RETRIEVAL.rerank.topN,
    1
  );
  return Math.max(topK, rerankTopN);
}

function astRagBuildLexicalPrefilterSet(chunks, lexicalScores, limit) {
  const candidateScores = (Array.isArray(chunks) ? chunks : []).map(chunk => ({
    chunkId: chunk.chunkId,
    vectorScore: null,
    lexicalScore: lexicalScores[chunk.chunkId] || 0,
    finalScore: lexicalScores[chunk.chunkId] || 0
  }));

  const selected = astRagSelectTopScoredResults(
    candidateScores,
    astRagNormalizePositiveInt(limit, candidateScores.length, 1)
  );
  return new Set(selected.map(item => item.chunkId));
}

function astRagUpdateRetrievalDiagnostics(diagnostics, payload = {}) {
  if (!astRagIsPlainObject(diagnostics)) {
    return;
  }
  if (!astRagIsPlainObject(diagnostics.retrieval)) {
    diagnostics.retrieval = {};
  }

  diagnostics.retrieval.candidateCounts = Object.assign(
    {},
    astRagIsPlainObject(diagnostics.retrieval.candidateCounts)
      ? diagnostics.retrieval.candidateCounts
      : {},
    payload
  );
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

function astRagRetrieveRankedChunks(indexDocument, query, queryVector, retrieval = {}, runtime = {}) {
  const diagnostics = astRagIsPlainObject(runtime) ? runtime.diagnostics : null;
  const sourceChunks = Array.isArray(indexDocument.chunks) ? indexDocument.chunks : [];
  const filteredByQuery = astRagApplyChunkFilters(sourceChunks, retrieval.filters || {});
  const filteredByAccess = astRagApplyAccessControl(filteredByQuery, retrieval.access || {}, {
    enforceAccessControl: retrieval.enforceAccessControl
  });
  if (filteredByAccess.length === 0) {
    astRagUpdateRetrievalDiagnostics(diagnostics, {
      source: sourceChunks.length,
      afterFilters: filteredByQuery.length,
      afterAccess: 0,
      afterLexicalPrefilter: 0,
      scored: 0,
      aboveMinScore: 0,
      selectedForRerank: 0,
      returned: 0,
      droppedByMinScore: 0,
      droppedByLexicalPrefilter: 0
    });
    return [];
  }

  let candidateChunks = filteredByAccess;
  const lexicalPrefilterTopN = astRagNormalizePositiveInt(
    retrieval.lexicalPrefilterTopN,
    AST_RAG_DEFAULT_RETRIEVAL.lexicalPrefilterTopN,
    0
  );
  const shouldComputeLexical = (
    retrieval.mode === 'hybrid'
    || retrieval.mode === 'lexical'
    || lexicalPrefilterTopN > 0
  );
  const lexical = shouldComputeLexical
    ? astRagComputeLexicalScores(query, candidateChunks)
    : { scores: {} };
  if (
    lexicalPrefilterTopN > 0 &&
    retrieval.mode !== 'lexical' &&
    candidateChunks.length > lexicalPrefilterTopN
  ) {
    const prefilteredSet = astRagBuildLexicalPrefilterSet(
      candidateChunks,
      lexical.scores || {},
      lexicalPrefilterTopN
    );
    candidateChunks = candidateChunks.filter(chunk => prefilteredSet.has(chunk.chunkId));
  }

  let queryNorm = null;
  if (retrieval.mode !== 'lexical') {
    queryNorm = astRagVectorNorm(queryVector);
  }

  const scored = candidateChunks.map(chunk => {
    const vectorScore = retrieval.mode === 'lexical'
      ? null
      : astRagCosineSimilarityWithNorm(
        queryVector,
        queryNorm,
        chunk.embedding,
        chunk.embeddingNorm
      );
    const lexicalScore = lexical.scores[chunk.chunkId] || 0;

    return Object.assign(
      astRagProjectChunkForRetrieval(chunk),
      {
        vectorScore,
        lexicalScore
      }
    );
  });

  const fused = astRagFuseRetrievalScores(scored, retrieval)
    .filter(item => item.finalScore >= retrieval.minScore);
  const selectionLimit = astRagResolveRetrievalSelectionLimit(retrieval);
  const selectedForRerank = astRagSelectTopScoredResults(fused, selectionLimit);
  const reranked = astRagRerankResults(query, selectedForRerank, retrieval.rerank || {});
  const returned = reranked
    .slice(0, retrieval.topK)
    .map(item => Object.assign({}, item, {
      score: item.finalScore
    }));

  astRagUpdateRetrievalDiagnostics(diagnostics, {
    source: sourceChunks.length,
    afterFilters: filteredByQuery.length,
    afterAccess: filteredByAccess.length,
    afterLexicalPrefilter: candidateChunks.length,
    scored: scored.length,
    aboveMinScore: fused.length,
    selectedForRerank: selectedForRerank.length,
    returned: returned.length,
    droppedByMinScore: Math.max(0, scored.length - fused.length),
    droppedByLexicalPrefilter: Math.max(0, filteredByAccess.length - candidateChunks.length)
  });

  return returned;
}
