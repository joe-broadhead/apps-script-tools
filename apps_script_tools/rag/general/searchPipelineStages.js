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
      retrievalLoadMs: 0,
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
      queryCount: 1,
      originalQuery: normalizedRequest.query,
      rewrittenQuery: normalizedRequest.query,
      transformedQuery: false,
      reranker: (
        normalizedRequest.retrieval &&
        normalizedRequest.retrieval.rerank &&
        normalizedRequest.retrieval.rerank.enabled === true
      )
        ? astRagNormalizeString(
          normalizedRequest.retrieval.rerank.provider,
          AST_RAG_DEFAULT_RETRIEVAL.rerank.provider
        )
        : null,
      rerankTopN: (
        normalizedRequest.retrieval &&
        normalizedRequest.retrieval.rerank &&
        normalizedRequest.retrieval.rerank.enabled === true
      )
        ? normalizedRequest.retrieval.rerank.topN
        : 0,
      lexicalPrefilterTopN: normalizedRequest.retrieval.lexicalPrefilterTopN || 0,
      partition: {
        enabled: normalizedRequest.retrieval.partition && normalizedRequest.retrieval.partition.enabled === true,
        maxShards: normalizedRequest.retrieval.partition && normalizedRequest.retrieval.partition.maxShards || 0,
        totalShards: 0,
        selectedShards: 0,
        selectedShardIds: []
      },
      returned: 0,
      timedOut: false,
      timeoutMs: normalizedRequest.options && typeof normalizedRequest.options.maxRetrievalMs === 'number'
        ? normalizedRequest.options.maxRetrievalMs
        : null,
      timeoutStage: null,
      candidateCounts: {
        source: 0,
        afterFilters: 0,
        afterAccess: 0,
        afterLexicalPrefilter: 0,
        scored: 0,
        aboveMinScore: 0,
        selectedForRerank: 0,
        returned: 0,
        droppedByMinScore: 0,
        droppedByLexicalPrefilter: 0
      }
    }
  };
}

function astRagSelectShardRefsForSearch(indexDocument, retrieval = {}, queryVector = null) {
  const refs = astRagNormalizeShardRefs(indexDocument && indexDocument.shards);
  if (!refs.length) {
    return [];
  }

  const partition = astRagIsPlainObject(retrieval.partition) ? retrieval.partition : {};
  const enabled = partition.enabled === true;
  const maxShards = astRagNormalizeOptionalNonNegativeInt(partition.maxShards, 0, 'search.retrieval.partition.maxShards', 0);

  if (!enabled) {
    return refs;
  }

  if (retrieval.mode === 'lexical' || !Array.isArray(queryVector) || queryVector.length === 0) {
    if (maxShards > 0) {
      return refs.slice(0, Math.min(maxShards, refs.length));
    }
    return refs;
  }

  const queryNorm = astRagVectorNorm(queryVector);
  const ranked = refs.map(ref => {
    const centroid = Array.isArray(ref.centroid) ? ref.centroid : [];
    const score = centroid.length > 0
      ? astRagCosineSimilarityWithNorm(queryVector, queryNorm, centroid, ref.centroidNorm)
      : -1;
    return {
      ref,
      score
    };
  });

  ranked.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return String(left.ref.shardId).localeCompare(String(right.ref.shardId));
  });

  const limit = maxShards > 0
    ? Math.min(maxShards, ranked.length)
    : ranked.length;
  return ranked.slice(0, limit).map(item => item.ref);
}
