function astRagAnswerCore(request = {}) {
  const spanId = astRagTelemetryStartSpan('rag.answer', {
    indexFileId: request && request.indexFileId ? request.indexFileId : null
  });

  try {
    const normalizedRequest = astRagValidateAnswerRequest(request);
    const cacheConfig = astRagResolveCacheConfig(normalizedRequest.cache || {});
    const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId, {
      cache: cacheConfig
    });
    const indexDocument = loaded.document;
    const versionToken = astRagNormalizeString(
      loaded.versionToken,
      astRagNormalizeString(indexDocument.updatedAt, 'unknown')
    );

    const indexEmbedding = indexDocument.embedding || {};
    const embeddingProvider = astRagNormalizeString(indexEmbedding.provider, null);
    const embeddingModel = astRagNormalizeString(indexEmbedding.model, null);

    if (!embeddingProvider || !embeddingModel) {
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
        providerOptions: normalizedRequest.generation.providerOptions
      },
      normalizedRequest.options
    );
    const useAnswerCache = Array.isArray(normalizedRequest.history) && normalizedRequest.history.length === 0;
    if (useAnswerCache) {
      const cachedAnswer = astRagCacheGet(cacheConfig, answerCacheKey);
      if (cachedAnswer && astRagIsPlainObject(cachedAnswer) && typeof cachedAnswer.answer === 'string') {
        astRagTelemetryEndSpan(spanId, {
          indexFileId: normalizedRequest.indexFileId,
          status: cachedAnswer.status || 'ok',
          cached: true,
          citationCount: Array.isArray(cachedAnswer.citations) ? cachedAnswer.citations.length : 0
        });
        return cachedAnswer;
      }
    }

    const embeddingCacheKey = astRagBuildEmbeddingCacheKey(
      normalizedRequest.indexFileId,
      versionToken,
      embeddingProvider,
      embeddingModel,
      normalizedRequest.question
    );

    const cachedEmbedding = astRagCacheGet(cacheConfig, embeddingCacheKey);
    let queryVector = null;
    let queryUsage = {
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
        texts: [normalizedRequest.question],
        auth: normalizedRequest.auth,
        options: { retries: 2 }
      });
      queryVector = queryEmbedding.vectors[0];
      queryUsage = queryEmbedding.usage || queryUsage;
      astRagCacheSet(cacheConfig, embeddingCacheKey, {
        vector: queryVector
      }, cacheConfig.embeddingTtlSec);
    }

    const rankedResults = astRagRetrieveRankedChunks(
      indexDocument,
      normalizedRequest.question,
      queryVector,
      normalizedRequest.retrieval
    );

    if (rankedResults.length === 0) {
      const insufficient = {
        status: 'insufficient_context',
        answer: normalizedRequest.options.insufficientEvidenceMessage,
        citations: [],
        retrieval: {
          topK: normalizedRequest.retrieval.topK,
          minScore: normalizedRequest.retrieval.minScore,
          mode: normalizedRequest.retrieval.mode,
          returned: 0
        },
        usage: queryUsage
      };

      if (useAnswerCache) {
        astRagCacheSet(cacheConfig, answerCacheKey, insufficient, cacheConfig.answerTtlSec);
      }

      astRagTelemetryEndSpan(spanId, {
        indexFileId: normalizedRequest.indexFileId,
        status: insufficient.status,
        returnedChunks: 0
      });
      return insufficient;
    }

    if (typeof runAiRequest !== 'function') {
      throw new AstRagGroundingError('runAiRequest is not available; AST.AI runtime is required for RAG.answer');
    }

    const prompt = astRagBuildGroundingPrompt(
      normalizedRequest.question,
      normalizedRequest.history,
      rankedResults
    );

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

    const grounded = astRagValidateGroundedAnswer({
      responseJson: aiResponse.output && aiResponse.output.json,
      contextBlocks: prompt.contextBlocks,
      searchResults: rankedResults,
      requireCitations: normalizedRequest.options.requireCitations,
      accessControl: normalizedRequest.retrieval.access,
      enforceAccessControl: normalizedRequest.options.enforceAccessControl,
      insufficientEvidenceMessage: normalizedRequest.options.insufficientEvidenceMessage
    });

    const result = {
      status: grounded.status,
      answer: grounded.answer,
      citations: grounded.citations,
      retrieval: {
        topK: normalizedRequest.retrieval.topK,
        minScore: normalizedRequest.retrieval.minScore,
        mode: normalizedRequest.retrieval.mode,
        returned: rankedResults.length
      },
      usage: {
        retrieval: queryUsage,
        generation: aiResponse.usage || {}
      }
    };

    if (useAnswerCache) {
      astRagCacheSet(cacheConfig, answerCacheKey, result, cacheConfig.answerTtlSec);
    }

    astRagTelemetryEndSpan(spanId, {
      indexFileId: normalizedRequest.indexFileId,
      status: result.status,
      citationCount: Array.isArray(result.citations) ? result.citations.length : 0,
      returnedChunks: rankedResults.length
    });
    return result;
  } catch (error) {
    astRagTelemetryEndSpan(spanId, {
      indexFileId: request && request.indexFileId ? request.indexFileId : null
    }, error);
    throw error;
  }
}
