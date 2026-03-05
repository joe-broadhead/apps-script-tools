function astRagBuildAnswerDiagnostics(cacheConfig = {}, timeoutMs = null) {
  return {
    totalMs: 0,
    pipelinePath: 'standard',
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
      source: null,
      ms: 0,
      queryCount: 1,
      originalQuery: null,
      rewrittenQuery: null,
      transformedQuery: false,
      reranker: null,
      rerankTopN: 0,
      rawSources: 0,
      usableSources: 0,
      lexicalPrefilterTopN: 0,
      emptyReason: null,
      recoveryAttempted: false,
      recoveryApplied: false,
      attempts: [],
      timedOut: false,
      timeoutMs: typeof timeoutMs === 'number' && isFinite(timeoutMs) ? timeoutMs : null,
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
      },
      contextBudget: {
        maxContextChars: null,
        maxContextTokensApprox: null,
        inputBlocks: 0,
        selectedBlocks: 0,
        droppedBlocks: 0,
        truncatedBlocks: 0,
        usedChars: 0,
        usedTokensApprox: 0
      }
    },
    generation: {
      status: 'not_started',
      ms: 0,
      grounded: false,
      finishReason: null,
      errorClass: null
    }
  };
}

function astRagBuildRecoveryRetrievalConfig(retrieval, attempt, recoveryConfig) {
  const safeAttempt = Math.max(1, astRagNormalizePositiveInt(attempt, 1, 1));
  const totalAttempts = Math.max(1, astRagNormalizePositiveInt(recoveryConfig.maxAttempts, 1, 1));

  const topKBoost = typeof recoveryConfig.topKBoost === 'number' && isFinite(recoveryConfig.topKBoost)
    ? recoveryConfig.topKBoost
    : 2;
  const minScoreFloor = typeof recoveryConfig.minScoreFloor === 'number' && isFinite(recoveryConfig.minScoreFloor)
    ? recoveryConfig.minScoreFloor
    : retrieval.minScore;

  const boostedTopK = Math.max(
    retrieval.topK,
    Math.ceil(retrieval.topK * Math.pow(topKBoost, safeAttempt))
  );

  const scoreRange = Math.max(0, retrieval.minScore - minScoreFloor);
  const decrementedMinScore = retrieval.minScore - ((scoreRange / totalAttempts) * safeAttempt);
  const relaxedMinScore = Math.max(minScoreFloor, decrementedMinScore);

  return Object.assign({}, retrieval, {
    topK: boostedTopK,
    minScore: relaxedMinScore
  });
}

function astRagBuildFallbackCitationsFromResults(results = []) {
  return (Array.isArray(results) ? results : []).map((result, index) => ({
    citationId: `S${index + 1}`,
    chunkId: result.chunkId,
    fileId: result.fileId,
    fileName: result.fileName,
    mimeType: result.mimeType,
    page: result.page == null ? null : result.page,
    slide: result.slide == null ? null : result.slide,
    section: result.section || 'body',
    score: result.score,
    vectorScore: (typeof result.vectorScore === 'number' && isFinite(result.vectorScore))
      ? result.vectorScore
      : null,
    lexicalScore: (typeof result.lexicalScore === 'number' && isFinite(result.lexicalScore))
      ? result.lexicalScore
      : null,
    finalScore: (typeof result.finalScore === 'number' && isFinite(result.finalScore))
      ? result.finalScore
      : result.score,
    rerankScore: (typeof result.rerankScore === 'number' && isFinite(result.rerankScore))
      ? result.rerankScore
      : null,
    snippet: astRagTruncate(result.text, 280)
  }));
}

function astRagBuildAnswerRetrievalSummary(normalizedRequest, rankedResults) {
  return {
    topK: normalizedRequest.retrieval.topK,
    minScore: normalizedRequest.retrieval.minScore,
    mode: normalizedRequest.retrieval.mode,
    returned: Array.isArray(rankedResults) ? rankedResults.length : 0
  };
}

function astRagFinalizeAnswerDiagnostics(diagnostics, totalStartMs, pipelinePath) {
  const output = astRagIsPlainObject(diagnostics) ? diagnostics : astRagBuildAnswerDiagnostics();
  if (!astRagIsPlainObject(output.timings)) {
    output.timings = astRagBuildAnswerDiagnostics().timings;
  }
  output.totalMs = Math.max(0, astRagPipelineNowMs() - totalStartMs);
  output.pipelinePath = pipelinePath || output.pipelinePath || 'standard';
  output.timings.retrievalMs = output.retrieval && typeof output.retrieval.ms === 'number' ? output.retrieval.ms : 0;
  output.timings.generationMs = output.generation && typeof output.generation.ms === 'number' ? output.generation.ms : 0;
  return output;
}

function astRagPrepareAnswerResponse(result, diagnosticsEnabled) {
  if (!astRagIsPlainObject(result)) {
    return result;
  }

  if (diagnosticsEnabled) {
    return result;
  }

  const output = astRagCloneObject(result);
  delete output.diagnostics;
  return output;
}

function astRagDetectPayloadEmptyReason(payloadResults, retrieval) {
  const list = Array.isArray(payloadResults)
    ? payloadResults.map(astRagNormalizeRetrievalPayloadResult)
    : [];

  if (list.length === 0) {
    return 'payload_empty';
  }

  const filteredByQuery = astRagApplyChunkFilters(list, retrieval.filters || {});
  if (filteredByQuery.length === 0) {
    return 'filters_excluded_all';
  }

  const filteredByAccess = astRagApplyAccessControl(filteredByQuery, retrieval.access || {}, {
    enforceAccessControl: retrieval.enforceAccessControl
  });

  if (filteredByAccess.length === 0) {
    return 'access_filtered_all';
  }

  return 'below_min_score';
}

function astRagDetectIndexEmptyReason(indexDocument, query, queryVector, retrieval) {
  const chunks = Array.isArray((indexDocument || {}).chunks) ? indexDocument.chunks : [];
  if (chunks.length === 0) {
    return 'no_index_chunks';
  }

  const filteredByQuery = astRagApplyChunkFilters(chunks, retrieval.filters || {});
  if (filteredByQuery.length === 0) {
    return 'filters_excluded_all';
  }

  const filteredByAccess = astRagApplyAccessControl(filteredByQuery, retrieval.access || {}, {
    enforceAccessControl: retrieval.enforceAccessControl
  });
  if (filteredByAccess.length === 0) {
    return 'access_filtered_all';
  }

  if ((queryVector && Array.isArray(queryVector)) || retrieval.mode === 'lexical') {
    const relaxedRetrieval = Object.assign({}, retrieval, {
      topK: Math.max(retrieval.topK, 20),
      minScore: -1
    });
    const relaxedResults = astRagRetrieveRankedChunks(indexDocument, query, queryVector, relaxedRetrieval);
    if (relaxedResults.length > 0) {
      return 'below_min_score';
    }
  }

  return 'no_matches';
}

function astRagBuildFallbackAnswerResult({
  normalizedRequest,
  rankedResults,
  queryUsage,
  queryPlan,
  diagnostics,
  totalStartMs,
  pipelinePath
}) {
  const fallback = astRagFallbackFromCitations({
    citations: astRagBuildFallbackCitationsFromResults(rankedResults),
    intent: normalizedRequest.fallback.intent,
    factCount: normalizedRequest.fallback.factCount,
    maxItems: normalizedRequest.retrieval.topK,
    insufficientEvidenceMessage: normalizedRequest.options.insufficientEvidenceMessage
  });

  const filteredCitations = astRagCitationFilterForAnswer(fallback.citations, {
    maxItems: normalizedRequest.retrieval.topK
  });

  return {
    status: fallback.status,
    answer: astRagCitationNormalizeInline(fallback.answer),
    citations: filteredCitations,
    queryProvenance: astRagIsPlainObject(queryPlan) ? astRagCloneObject(queryPlan) : null,
    retrieval: astRagBuildAnswerRetrievalSummary(normalizedRequest, rankedResults),
    usage: queryUsage,
    diagnostics: astRagFinalizeAnswerDiagnostics(diagnostics, totalStartMs, pipelinePath || 'fallback')
  };
}
