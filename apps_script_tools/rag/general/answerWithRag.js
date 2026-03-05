function astRagNowMs() {
  return astRagPipelineNowMs();
}

function astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta) {
  astRagApplyCacheOperationDiagnosticsShared(diagnostics, operationMeta);
}

function astRagMarkAnswerTimeoutDiagnostics(diagnostics, timeoutMs, stage) {
  astRagMarkRetrievalTimeoutDiagnosticsShared(diagnostics, timeoutMs, stage);
}

function astRagAssertAnswerRetrievalBudget(timeoutMs, startedAtMs, stage, diagnostics = null) {
  astRagAssertRetrievalWithinBudgetShared(timeoutMs, startedAtMs, stage, diagnostics);
}

function astRagAnswerCore(request = {}) {
  const spanId = astRagTelemetryStartSpan('rag.answer', {
    indexFileId: request && request.indexFileId ? request.indexFileId : null
  });
  const totalStartMs = astRagNowMs();
  const validationStartMs = totalStartMs;

  try {
    const normalizedRequest = astRagValidateAnswerRequest(request);
    const queryPlan = astRagBuildQueryTransformPlan(
      normalizedRequest.question,
      normalizedRequest.retrieval.queryTransform
    );
    const retrievalQueries = Array.isArray(queryPlan.retrievalQueries) && queryPlan.retrievalQueries.length > 0
      ? queryPlan.retrievalQueries.slice()
      : [normalizedRequest.question];
    const diagnosticsEnabled = normalizedRequest.options && normalizedRequest.options.diagnostics === true;
    const cacheConfig = astRagResolveCacheConfig(normalizedRequest.cache || {});
    const retrievalTimeoutMs = normalizedRequest.options && typeof normalizedRequest.options.maxRetrievalMs === 'number'
      ? normalizedRequest.options.maxRetrievalMs
      : null;

    const diagnostics = astRagBuildAnswerDiagnostics(cacheConfig, retrievalTimeoutMs);
    diagnostics.timings.validationMs = Math.max(0, astRagNowMs() - validationStartMs);
    diagnostics.retrieval.queryCount = retrievalQueries.length;
    diagnostics.retrieval.originalQuery = queryPlan.originalQuery;
    diagnostics.retrieval.rewrittenQuery = queryPlan.rewrittenQuery;
    diagnostics.retrieval.transformedQuery = queryPlan.transformed === true;
    diagnostics.retrieval.lexicalPrefilterTopN = normalizedRequest.retrieval.lexicalPrefilterTopN || 0;
    if (
      normalizedRequest.retrieval &&
      normalizedRequest.retrieval.rerank &&
      normalizedRequest.retrieval.rerank.enabled === true
    ) {
      diagnostics.retrieval.reranker = astRagNormalizeString(
        normalizedRequest.retrieval.rerank.provider,
        AST_RAG_DEFAULT_RETRIEVAL.rerank.provider
      );
      diagnostics.retrieval.rerankTopN = normalizedRequest.retrieval.rerank.topN;
    }
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
      queryPlan,
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
    const queryVectorsByQuery = {};
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
          for (let queryIdx = 0; queryIdx < retrievalQueries.length; queryIdx += 1) {
            const currentQuery = retrievalQueries[queryIdx];
            const embeddingCacheKey = astRagBuildEmbeddingCacheKey(
              normalizedRequest.indexFileId,
              versionToken,
              embeddingProvider,
              embeddingModel,
              currentQuery
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
              queryVectorsByQuery[currentQuery] = cachedEmbedding.vector.slice();
              continue;
            }

            const embeddingStartMs = astRagNowMs();
            astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'embedding', diagnostics);
            const queryEmbedding = astRagEmbedTexts({
              provider: embeddingProvider,
              model: embeddingModel,
              texts: [currentQuery],
              auth: normalizedRequest.auth,
              options: { retries: 2 }
            });
            queryVectorsByQuery[currentQuery] = queryEmbedding.vectors[0];
            queryUsage.inputTokens += (queryEmbedding.usage && queryEmbedding.usage.inputTokens) || 0;
            queryUsage.outputTokens += (queryEmbedding.usage && queryEmbedding.usage.outputTokens) || 0;
            queryUsage.totalTokens += (queryEmbedding.usage && queryEmbedding.usage.totalTokens) || 0;
            diagnostics.timings.embeddingMs += Math.max(0, astRagNowMs() - embeddingStartMs);
            astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'embedding', diagnostics);
            astRagCacheSet(
              cacheConfig,
              embeddingCacheKey,
              {
                vector: queryVectorsByQuery[currentQuery]
              },
              cacheConfig.embeddingTtlSec,
              operationMeta => astRagApplyAnswerCacheOperationDiagnostics(diagnostics, operationMeta),
              { path: 'embedding' }
            );
            astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'cache_embedding_set', diagnostics);
          }
          queryVector = queryVectorsByQuery[queryPlan.rewrittenQuery] || queryVectorsByQuery[retrievalQueries[0]] || null;
        }

        astRagAssertAnswerRetrievalBudget(retrievalTimeoutMs, retrievalStartMs, 'retrieval', diagnostics);
        rankedResults = astRagRetrieveRankedChunksForQueries(
          indexDocument,
          queryPlan,
          queryVectorsByQuery,
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
          queryProvenance: astRagCloneObject(queryPlan),
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
          queryPlan,
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
          queryPlan,
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
          candidateResults = astRagRetrieveRankedChunksForQueries(
            indexDocument,
            queryPlan,
            queryVectorsByQuery,
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
            queryPlan.rewrittenQuery,
            queryVectorsByQuery[queryPlan.rewrittenQuery] || queryVector,
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
              ? astRagRetrieveRankedChunksForQueries(
                indexDocument,
                queryPlan,
                queryVectorsByQuery,
                relaxedForFallback,
                { diagnostics }
              )
              : []
          );

        const fallbackOnEmpty = astRagBuildFallbackAnswerResult({
          normalizedRequest,
          rankedResults: fallbackSeedResults,
          queryUsage,
          queryPlan,
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
        queryProvenance: astRagCloneObject(queryPlan),
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

    if (typeof astRunAiRequest !== 'function') {
      throw new AstRagGroundingError('astRunAiRequest is not available; AST.AI runtime is required for RAG.answer');
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

      const aiResponse = astRunAiRequest({
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
        queryProvenance: astRagCloneObject(queryPlan),
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

function astRagAnswerStreamEmit(onEvent, event) {
  if (typeof onEvent !== 'function') {
    return;
  }

  try {
    onEvent(event);
  } catch (error) {
    throw new AstRagValidationError(
      'RAG answerStream onEvent callback threw an error',
      {
        eventType: event && event.type ? event.type : null
      },
      error
    );
  }
}

function astRagAnswerStreamChunkText(text, chunkSize) {
  const source = typeof text === 'string' ? text : '';
  if (!source) {
    return [];
  }

  const size = Number.isInteger(chunkSize) && chunkSize > 0 ? chunkSize : 24;
  const chunks = [];
  for (let idx = 0; idx < source.length; idx += size) {
    chunks.push(source.slice(idx, idx + size));
  }
  return chunks;
}

function astRagBuildAnswerStreamEventBase(normalizedRequest = {}) {
  return {
    indexFileId: normalizedRequest.indexFileId || null,
    provider: normalizedRequest.generation && normalizedRequest.generation.provider
      ? normalizedRequest.generation.provider
      : null,
    model: normalizedRequest.generation && normalizedRequest.generation.model
      ? normalizedRequest.generation.model
      : null
  };
}

function astRagBuildAnswerStreamMetadataFrame(response = {}) {
  return {
    status: astRagNormalizeString(response.status, 'ok'),
    citations: Array.isArray(response.citations)
      ? response.citations.map(item => astRagCloneObject(item))
      : [],
    retrieval: astRagIsPlainObject(response.retrieval) ? astRagCloneObject(response.retrieval) : null,
    usage: astRagIsPlainObject(response.usage) ? astRagCloneObject(response.usage) : null,
    queryProvenance: astRagIsPlainObject(response.queryProvenance) ? astRagCloneObject(response.queryProvenance) : null,
    diagnostics: astRagIsPlainObject(response.diagnostics) ? astRagCloneObject(response.diagnostics) : null
  };
}

function astRagAnswerStreamCore(request = {}) {
  const normalizedRequest = astRagValidateAnswerStreamRequest(request);
  const onEvent = normalizedRequest.onEvent;
  const eventBase = astRagBuildAnswerStreamEventBase(normalizedRequest);

  astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
    type: 'start',
    question: normalizedRequest.question
  }));
  astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
    type: 'progress',
    phase: 'answer_started'
  }));

  try {
    const response = astRagAnswerCore(normalizedRequest);
    astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
      type: 'progress',
      phase: 'answer_ready',
      status: response && response.status ? response.status : null
    }));
    const chunks = astRagAnswerStreamChunkText(response && response.answer, normalizedRequest.streamChunkSize);
    let accumulated = '';

    for (let idx = 0; idx < chunks.length; idx += 1) {
      const delta = chunks[idx];
      accumulated += delta;
      astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
        type: 'token',
        index: idx,
        delta,
        text: accumulated,
        status: response && response.status ? response.status : null
      }));
    }

    astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
      type: 'metadata',
      metadata: astRagBuildAnswerStreamMetadataFrame(response)
    }));

    astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
      type: 'done',
      response
    }));

    return response;
  } catch (error) {
    try {
      astRagAnswerStreamEmit(onEvent, Object.assign({}, eventBase, {
        type: 'error',
        error: {
          name: error && error.name ? error.name : 'Error',
          message: error && error.message ? error.message : String(error)
        }
      }));
    } catch (_emitError) {
      // Preserve original upstream failure so callers receive the true root cause.
    }
    throw error;
  }
}
