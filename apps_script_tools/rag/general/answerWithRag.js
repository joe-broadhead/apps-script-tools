function astRagNowMs() {
  return new Date().getTime();
}

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

function astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta) {
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

function astRagBuildAnswerTimeoutError(timeoutMs, stage, startedAtMs) {
  return new AstRagRetrievalError('RAG retrieval exceeded maxRetrievalMs budget', {
    timedOut: true,
    timeoutMs,
    timeoutStage: astRagNormalizeString(stage, 'retrieval'),
    elapsedMs: Math.max(0, astRagNowMs() - startedAtMs)
  });
}

function astRagMarkAnswerTimeoutDiagnostics(diagnostics, timeoutMs, stage) {
  if (!astRagIsPlainObject(diagnostics) || !astRagIsPlainObject(diagnostics.retrieval)) {
    return;
  }

  diagnostics.retrieval.timedOut = true;
  diagnostics.retrieval.timeoutMs = timeoutMs;
  diagnostics.retrieval.timeoutStage = astRagNormalizeString(stage, 'retrieval');
}

function astRagAssertAnswerRetrievalBudget(timeoutMs, startedAtMs, stage, diagnostics = null) {
  if (!(typeof timeoutMs === 'number' && isFinite(timeoutMs) && timeoutMs > 0)) {
    return;
  }

  const elapsedMs = Math.max(0, astRagNowMs() - startedAtMs);
  if (elapsedMs <= timeoutMs) {
    return;
  }

  astRagMarkAnswerTimeoutDiagnostics(diagnostics, timeoutMs, stage);
  throw astRagBuildAnswerTimeoutError(timeoutMs, stage, startedAtMs);
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
  output.totalMs = Math.max(0, astRagNowMs() - totalStartMs);
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
    retrieval: astRagBuildAnswerRetrievalSummary(normalizedRequest, rankedResults),
    usage: queryUsage,
    diagnostics: astRagFinalizeAnswerDiagnostics(diagnostics, totalStartMs, pipelinePath || 'fallback')
  };
}

function astRagAnswerCore(request = {}) {
  const spanId = astRagTelemetryStartSpan('rag.answer', {
    indexFileId: request && request.indexFileId ? request.indexFileId : null
  });
  const totalStartMs = astRagNowMs();
  const validationStartMs = totalStartMs;

  try {
    const normalizedRequest = astRagValidateAnswerRequest(request);
    const diagnosticsEnabled = normalizedRequest.options && normalizedRequest.options.diagnostics === true;
    const cacheConfig = astRagResolveCacheConfig(normalizedRequest.cache || {});
    const retrievalTimeoutMs = normalizedRequest.options && typeof normalizedRequest.options.maxRetrievalMs === 'number'
      ? normalizedRequest.options.maxRetrievalMs
      : null;

    const diagnostics = astRagBuildAnswerDiagnostics(cacheConfig, retrievalTimeoutMs);
    diagnostics.timings.validationMs = Math.max(0, astRagNowMs() - validationStartMs);
    diagnostics.retrieval.lexicalPrefilterTopN = normalizedRequest.retrieval.lexicalPrefilterTopN || 0;
    const retrievalBudgetStartedAtMs = astRagNowMs();

    const indexLoadStartMs = astRagNowMs();
    const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId, {
      cache: cacheConfig,
      cacheDiagnostics: operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta)
    });
    const indexLoadMs = Math.max(0, astRagNowMs() - indexLoadStartMs);
    const indexDocument = loaded.document;
    const versionToken = astRagNormalizeString(
      loaded.versionToken,
      astRagNormalizeString(indexDocument.updatedAt, 'unknown')
    );
    diagnostics.timings.indexLoadMs = indexLoadMs;
    diagnostics.cache.indexDocHit = loaded && loaded.cacheHit === true;
    if (diagnostics.cache.indexDocHit) {
      diagnostics.cache.hitPath = diagnostics.cache.hitPath || 'index_doc';
    }

    const indexEmbedding = indexDocument.embedding || {};
    const embeddingProvider = astRagNormalizeString(indexEmbedding.provider, null);
    const embeddingModel = astRagNormalizeString(indexEmbedding.model, null);

    if (
      normalizedRequest.retrieval.mode !== 'lexical' &&
      (!embeddingProvider || !embeddingModel)
    ) {
      throw new AstRagRetrievalError('Index is missing embedding metadata', {
        indexFileId: normalizedRequest.indexFileId
      });
    }

    const answerCacheKey = astRagBuildAnswerCacheKey(
      normalizedRequest.indexFileId,
      versionToken,
      normalizedRequest.question,
      normalizedRequest.history,
      normalizedRequest.retrieval,
      {
        provider: normalizedRequest.generation.provider,
        model: normalizedRequest.generation.model,
        options: normalizedRequest.generation.options,
        providerOptions: normalizedRequest.generation.providerOptions,
        instructions: normalizedRequest.generation.instructions,
        style: normalizedRequest.generation.style,
        forbiddenPhrases: normalizedRequest.generation.forbiddenPhrases
      },
      Object.assign({}, normalizedRequest.options, {
        fallback: normalizedRequest.fallback
      })
    );
    const useAnswerCache = (
      Array.isArray(normalizedRequest.history) &&
      normalizedRequest.history.length === 0 &&
      !normalizedRequest.retrievalPayload &&
      !normalizedRequest.retrievalPayloadKey
    );
    let deferredRetrievalError = null;
    if (useAnswerCache) {
      const cachedAnswer = astRagCacheGet(
        cacheConfig,
        answerCacheKey,
        operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
        { path: 'answer' }
      );
      try {
        astRagAssertAnswerRetrievalBudget(
          retrievalTimeoutMs,
          retrievalBudgetStartedAtMs,
          'cache_answer_get',
          diagnostics
        );
      } catch (error) {
        deferredRetrievalError = error;
      }
      if (cachedAnswer && astRagIsPlainObject(cachedAnswer) && typeof cachedAnswer.answer === 'string') {
        if (deferredRetrievalError) {
          throw deferredRetrievalError;
        }
        const cachedResponse = astRagCloneObject(cachedAnswer);
        diagnostics.cache.answerHit = true;
        diagnostics.cache.searchHit = false;
        diagnostics.cache.retrievalPayloadHit = false;
        diagnostics.cache.hitPath = 'answer';
        diagnostics.retrieval.returned = (
          cachedResponse.retrieval &&
          typeof cachedResponse.retrieval.returned === 'number'
        )
          ? cachedResponse.retrieval.returned
          : (Array.isArray(cachedResponse.citations) ? cachedResponse.citations.length : 0);
        const finalizedCachedDiagnostics = astRagFinalizeAnswerDiagnostics(
          diagnostics,
          totalStartMs,
          astRagIsPlainObject(cachedResponse.diagnostics)
            ? astRagNormalizeString(cachedResponse.diagnostics.pipelinePath, 'cache')
            : 'cache'
        );
        cachedResponse.diagnostics = finalizedCachedDiagnostics;
        const preparedCachedResponse = astRagPrepareAnswerResponse(cachedResponse, diagnosticsEnabled);

        astRagTelemetryEndSpan(spanId, {
          indexFileId: normalizedRequest.indexFileId,
          status: preparedCachedResponse.status || 'ok',
          cached: true,
          citationCount: Array.isArray(preparedCachedResponse.citations) ? preparedCachedResponse.citations.length : 0,
          diagnosticsEnabled
        });
        return preparedCachedResponse;
      }
    }

    let queryVector = null;
    let queryUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
    let rankedResults = null;
    let retrievalPayload = null;
    let retrievalSource = null;
    let rawSourceCount = 0;
    const retrievalStartMs = retrievalBudgetStartedAtMs;

    try {
      if (deferredRetrievalError) {
        throw deferredRetrievalError;
      }
      astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'retrieval_payload', diagnostics);
      retrievalPayload = astRagResolveAnswerRetrievalPayload(
        normalizedRequest,
        normalizedRequest.indexFileId,
        versionToken,
        cacheConfig,
        operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta)
      );
      astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'retrieval_payload', diagnostics);

      if (retrievalPayload && Array.isArray(retrievalPayload.results)) {
        diagnostics.cache.retrievalPayloadHit = true;
        diagnostics.cache.hitPath = diagnostics.cache.hitPath || 'retrieval_payload';
        retrievalSource = 'payload';
        rawSourceCount = retrievalPayload.results.length;
        rankedResults = astRagApplyRetrievalPolicyToPayloadResults(
          retrievalPayload.results,
          normalizedRequest.retrieval
        );
      } else {
        retrievalSource = 'index';
        rawSourceCount = Array.isArray(indexDocument.chunks) ? indexDocument.chunks.length : 0;
        if (normalizedRequest.retrieval.mode === 'lexical') {
          queryVector = null;
        } else {
          const embeddingCacheKey = astRagBuildEmbeddingCacheKey(
            normalizedRequest.indexFileId,
            versionToken,
            embeddingProvider,
            embeddingModel,
            normalizedRequest.question
          );
          const cachedEmbedding = astRagCacheGet(
            cacheConfig,
            embeddingCacheKey,
            operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
            { path: 'embedding' }
          );
          astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'cache_embedding_get', diagnostics);

          if (cachedEmbedding && Array.isArray(cachedEmbedding.vector)) {
            diagnostics.cache.embeddingHit = true;
            diagnostics.cache.hitPath = diagnostics.cache.hitPath || 'embedding';
            queryVector = cachedEmbedding.vector.slice();
          } else {
            const embeddingStartMs = astRagNowMs();
            astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'embedding', diagnostics);
            const queryEmbedding = astRagEmbedTexts({
              provider: embeddingProvider,
              model: embeddingModel,
              texts: [normalizedRequest.question],
              auth: normalizedRequest.auth,
              options: { retries: 2 }
            });
            queryVector = queryEmbedding.vectors[0];
            queryUsage = queryEmbedding.usage || queryUsage;
            diagnostics.timings.embeddingMs = Math.max(0, astRagNowMs() - embeddingStartMs);
            astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'embedding', diagnostics);
            astRagCacheSet(
              cacheConfig,
              embeddingCacheKey,
              {
                vector: queryVector
              },
              cacheConfig.embeddingTtlSec,
              operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
              { path: 'embedding' }
            );
            astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'cache_embedding_set', diagnostics);
          }
        }

        astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'retrieval', diagnostics);
        rankedResults = astRagRetrieveRankedChunks(
          indexDocument,
          normalizedRequest.question,
          queryVector,
          normalizedRequest.retrieval,
          { diagnostics }
        );
        astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'retrieval', diagnostics);
      }
    } catch (retrievalError) {
      diagnostics.retrieval.source = retrievalSource;
      diagnostics.retrieval.ms = Math.max(0, astRagNowMs() - retrievalStartMs);
      diagnostics.timings.searchMs = diagnostics.retrieval.ms + diagnostics.timings.indexLoadMs + diagnostics.timings.embeddingMs;
      diagnostics.retrieval.rawSources = rawSourceCount;
      diagnostics.retrieval.usableSources = 0;
      const timeoutDetected = Boolean(
        retrievalError &&
        astRagIsPlainObject(retrievalError.details) &&
        retrievalError.details.timedOut === true
      );
      if (timeoutDetected) {
        diagnostics.retrieval.emptyReason = 'retrieval_timeout';
        astRagMarkAnswerTimeoutDiagnostics(
          diagnostics,
          retrievalError.details.timeoutMs || retrievalTimeoutMs,
          retrievalError.details.timeoutStage
        );
      } else {
        diagnostics.retrieval.emptyReason = 'retrieval_error';
      }
      diagnostics.generation.status = 'skipped';
      diagnostics.generation.errorClass = retrievalError && retrievalError.name ? retrievalError.name : 'Error';

      const timeoutPolicy = normalizedRequest.options.onRetrievalTimeout || 'error';
      if (timeoutDetected && timeoutPolicy === 'insufficient_context') {
        const timeoutInsufficient = {
          status: 'insufficient_context',
          answer: normalizedRequest.options.insufficientEvidenceMessage,
          citations: [],
          retrieval: astRagBuildAnswerRetrievalSummary(normalizedRequest, []),
          usage: queryUsage,
          diagnostics: astRagFinalizeAnswerDiagnostics(
            diagnostics,
            totalStartMs,
            'timeout_insufficient'
          )
        };

        const preparedTimeoutInsufficient = astRagPrepareAnswerResponse(timeoutInsufficient, diagnosticsEnabled);
        astRagTelemetryEndSpan(spanId, {
          indexFileId: normalizedRequest.indexFileId,
          status: preparedTimeoutInsufficient.status,
          pipelinePath: 'timeout_insufficient',
          returnedChunks: 0
        });
        return preparedTimeoutInsufficient;
      }

      if (timeoutDetected && timeoutPolicy === 'fallback') {
        const timeoutFallback = astRagBuildFallbackAnswerResult({
          normalizedRequest,
          rankedResults: [],
          queryUsage,
          diagnostics,
          totalStartMs,
          pipelinePath: 'timeout_fallback'
        });
        const preparedTimeoutFallback = astRagPrepareAnswerResponse(timeoutFallback, diagnosticsEnabled);
        astRagTelemetryEndSpan(spanId, {
          indexFileId: normalizedRequest.indexFileId,
          status: preparedTimeoutFallback.status,
          pipelinePath: 'timeout_fallback',
          returnedChunks: 0
        });
        return preparedTimeoutFallback;
      }

      if (normalizedRequest.fallback.onRetrievalError && !(timeoutDetected && timeoutPolicy === 'error')) {
        const fallbackOnError = astRagBuildFallbackAnswerResult({
          normalizedRequest,
          rankedResults: [],
          queryUsage,
          diagnostics,
          totalStartMs,
          pipelinePath: 'fallback'
        });

        if (useAnswerCache) {
          const cacheableFallback = astRagCloneObject(fallbackOnError);
          delete cacheableFallback.diagnostics;
          astRagCacheSet(
            cacheConfig,
            answerCacheKey,
            cacheableFallback,
            cacheConfig.answerTtlSec,
            operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
            { path: 'answer' }
          );
        }

        const pipelinePath = fallbackOnError.diagnostics.pipelinePath;
        const preparedFallback = astRagPrepareAnswerResponse(fallbackOnError, diagnosticsEnabled);

        astRagTelemetryEndSpan(spanId, {
          indexFileId: normalizedRequest.indexFileId,
          status: preparedFallback.status,
          pipelinePath,
          returnedChunks: 0
        });
        return preparedFallback;
      }

      throw retrievalError;
    }

    if (
      rankedResults.length === 0 &&
      normalizedRequest.retrieval.recovery &&
      normalizedRequest.retrieval.recovery.enabled
    ) {
      diagnostics.retrieval.recoveryAttempted = true;
      const recoveryConfig = normalizedRequest.retrieval.recovery;

      for (let attempt = 1; attempt <= recoveryConfig.maxAttempts; attempt += 1) {
        astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'recovery', diagnostics);
        const candidateRetrieval = astRagBuildRecoveryRetrievalConfig(
          normalizedRequest.retrieval,
          attempt,
          recoveryConfig
        );
        const attemptStartedAt = astRagNowMs();
        let candidateResults = [];

        if (retrievalPayload && Array.isArray(retrievalPayload.results)) {
          candidateResults = astRagApplyRetrievalPolicyToPayloadResults(
            retrievalPayload.results,
            candidateRetrieval
          );
        } else {
          astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'recovery', diagnostics);
          candidateResults = astRagRetrieveRankedChunks(
            indexDocument,
            normalizedRequest.question,
            queryVector,
            candidateRetrieval,
            { diagnostics }
          );
          astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'recovery', diagnostics);
        }

        diagnostics.retrieval.attempts.push({
          attempt,
          topK: candidateRetrieval.topK,
          minScore: candidateRetrieval.minScore,
          returned: candidateResults.length,
          ms: Math.max(0, astRagNowMs() - attemptStartedAt)
        });

        if (candidateResults.length > 0) {
          rankedResults = candidateResults;
          diagnostics.retrieval.recoveryApplied = true;
          break;
        }
      }
    }

    diagnostics.retrieval.source = retrievalSource;
    diagnostics.retrieval.ms = Math.max(0, astRagNowMs() - retrievalStartMs);
    diagnostics.timings.searchMs = diagnostics.retrieval.ms + diagnostics.timings.indexLoadMs + diagnostics.timings.embeddingMs;
    diagnostics.retrieval.rawSources = rawSourceCount;
    diagnostics.retrieval.usableSources = rankedResults.length;
    diagnostics.retrieval.emptyReason = rankedResults.length > 0
      ? null
      : (
        retrievalPayload && Array.isArray(retrievalPayload.results)
          ? astRagDetectPayloadEmptyReason(retrievalPayload.results, normalizedRequest.retrieval)
          : astRagDetectIndexEmptyReason(
            indexDocument,
            normalizedRequest.question,
            queryVector,
            normalizedRequest.retrieval
          )
      );

    if (rankedResults.length === 0) {
      if (normalizedRequest.fallback.onRetrievalEmpty) {
        const relaxedForFallback = Object.assign({}, normalizedRequest.retrieval, {
          minScore: -1,
          topK: Math.max(normalizedRequest.retrieval.topK, AST_RAG_DEFAULT_RETRIEVAL.topK)
        });
        const fallbackSeedResults = (retrievalPayload && Array.isArray(retrievalPayload.results))
          ? astRagApplyRetrievalPolicyToPayloadResults(
            retrievalPayload.results,
            relaxedForFallback
          )
          : (
            (
              ((queryVector && Array.isArray(queryVector)) || normalizedRequest.retrieval.mode === 'lexical') &&
              !(
                typeof retrievalTimeoutMs === 'number' &&
                isFinite(retrievalTimeoutMs) &&
                retrievalTimeoutMs > 0 &&
                Math.max(0, astRagNowMs() - retrievalStartMs) > retrievalTimeoutMs
              )
            )
              ? astRagRetrieveRankedChunks(
                indexDocument,
                normalizedRequest.question,
                queryVector,
                relaxedForFallback,
                { diagnostics }
              )
              : []
          );

        const fallbackOnEmpty = astRagBuildFallbackAnswerResult({
          normalizedRequest,
          rankedResults: fallbackSeedResults,
          queryUsage,
          diagnostics,
          totalStartMs,
          pipelinePath: 'fallback'
        });

        if (useAnswerCache) {
          const cacheableFallback = astRagCloneObject(fallbackOnEmpty);
          delete cacheableFallback.diagnostics;
          astRagCacheSet(
            cacheConfig,
            answerCacheKey,
            cacheableFallback,
            cacheConfig.answerTtlSec,
            operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
            { path: 'answer' }
          );
        }

        const pipelinePath = fallbackOnEmpty.diagnostics.pipelinePath;
        const preparedFallback = astRagPrepareAnswerResponse(fallbackOnEmpty, diagnosticsEnabled);

        astRagTelemetryEndSpan(spanId, {
          indexFileId: normalizedRequest.indexFileId,
          status: preparedFallback.status,
          pipelinePath,
          returnedChunks: 0
        });
        return preparedFallback;
      }

      const insufficient = {
        status: 'insufficient_context',
        answer: normalizedRequest.options.insufficientEvidenceMessage,
        citations: [],
        retrieval: astRagBuildAnswerRetrievalSummary(normalizedRequest, rankedResults),
        usage: queryUsage,
        diagnostics: astRagFinalizeAnswerDiagnostics(
          diagnostics,
          totalStartMs,
          diagnostics.retrieval.recoveryApplied ? 'recovery_applied' : 'standard'
        )
      };

      if (useAnswerCache) {
        const cacheableInsufficient = astRagCloneObject(insufficient);
        delete cacheableInsufficient.diagnostics;
        astRagCacheSet(
          cacheConfig,
          answerCacheKey,
          cacheableInsufficient,
          cacheConfig.answerTtlSec,
          operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
          { path: 'answer' }
        );
      }

      const pipelinePath = insufficient.diagnostics.pipelinePath;
      const preparedInsufficient = astRagPrepareAnswerResponse(insufficient, diagnosticsEnabled);

      astRagTelemetryEndSpan(spanId, {
        indexFileId: normalizedRequest.indexFileId,
        status: preparedInsufficient.status,
        pipelinePath,
        returnedChunks: 0
      });
      return preparedInsufficient;
    }

    if (typeof runAiRequest !== 'function') {
      throw new AstRagGroundingError('runAiRequest is not available; AST.AI runtime is required for RAG.answer');
    }

    diagnostics.generation.status = 'started';
    const generationStartMs = astRagNowMs();

    try {
      const prompt = astRagBuildGroundingPrompt(
        normalizedRequest.question,
        normalizedRequest.history,
        rankedResults,
        {
          instructions: normalizedRequest.generation.instructions,
          style: normalizedRequest.generation.style,
          forbiddenPhrases: normalizedRequest.generation.forbiddenPhrases,
          maxContextChars: normalizedRequest.generation.maxContextChars,
          maxContextTokensApprox: normalizedRequest.generation.maxContextTokensApprox
        }
      );
      if (astRagIsPlainObject(prompt.contextStats)) {
        diagnostics.retrieval.contextBudget = astRagCloneObject(prompt.contextStats);
      }

      const aiResponse = runAiRequest({
        provider: normalizedRequest.generation.provider,
        operation: 'structured',
        model: normalizedRequest.generation.model,
        input: prompt.messages,
        auth: normalizedRequest.generation.auth,
        providerOptions: normalizedRequest.generation.providerOptions,
        options: Object.assign({
          temperature: 0.1,
          maxOutputTokens: 1024
        }, normalizedRequest.generation.options || {}),
        schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            citations: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['answer', 'citations']
        }
      });

      diagnostics.generation.ms = Math.max(0, astRagNowMs() - generationStartMs);
      diagnostics.generation.status = 'ok';
      diagnostics.generation.finishReason = aiResponse && aiResponse.finishReason
        ? aiResponse.finishReason
        : null;

      const grounded = astRagValidateGroundedAnswer({
        responseJson: aiResponse.output && aiResponse.output.json,
        contextBlocks: prompt.contextBlocks,
        searchResults: rankedResults,
        requireCitations: normalizedRequest.options.requireCitations,
        accessControl: normalizedRequest.retrieval.access,
        enforceAccessControl: normalizedRequest.options.enforceAccessControl,
        insufficientEvidenceMessage: normalizedRequest.options.insufficientEvidenceMessage
      });

      diagnostics.generation.grounded = grounded.status === 'ok';

      const filteredCitations = astRagCitationFilterForAnswer(grounded.citations, {
        maxItems: normalizedRequest.retrieval.topK
      });

      const result = {
        status: grounded.status,
        answer: astRagCitationNormalizeInline(grounded.answer),
        citations: filteredCitations,
        retrieval: astRagBuildAnswerRetrievalSummary(normalizedRequest, rankedResults),
        usage: {
          retrieval: queryUsage,
          generation: aiResponse.usage || {}
        },
        diagnostics: astRagFinalizeAnswerDiagnostics(
          diagnostics,
          totalStartMs,
          diagnostics.retrieval.recoveryApplied ? 'recovery_applied' : 'standard'
        )
      };

      if (useAnswerCache) {
        const cacheableResult = astRagCloneObject(result);
        delete cacheableResult.diagnostics;
        astRagCacheSet(
          cacheConfig,
          answerCacheKey,
          cacheableResult,
          cacheConfig.answerTtlSec,
          operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
          { path: 'answer' }
        );
      }

      const pipelinePath = result.diagnostics.pipelinePath;
      const preparedResult = astRagPrepareAnswerResponse(result, diagnosticsEnabled);

      astRagTelemetryEndSpan(spanId, {
        indexFileId: normalizedRequest.indexFileId,
        status: preparedResult.status,
        pipelinePath,
        citationCount: Array.isArray(preparedResult.citations) ? preparedResult.citations.length : 0,
        returnedChunks: rankedResults.length
      });
      return preparedResult;
    } catch (generationError) {
      diagnostics.generation.ms = Math.max(0, astRagNowMs() - generationStartMs);
      diagnostics.generation.status = 'error';
      diagnostics.generation.errorClass = generationError && generationError.name
        ? generationError.name
        : 'Error';
      throw generationError;
    }
  } catch (error) {
    astRagTelemetryEndSpan(spanId, {
      indexFileId: request && request.indexFileId ? request.indexFileId : null
    }, error);
    throw error;
  }
}
