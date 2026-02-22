function astRagRankChunks(indexDocument, queryVector, retrieval) {
  const filteredChunks = astRagApplyChunkFilters(indexDocument.chunks || [], retrieval.filters);

  return filteredChunks
    .map(chunk => ({
      chunkId: chunk.chunkId,
      sourceId: chunk.sourceId,
      fileId: chunk.fileId,
      fileName: chunk.fileName,
      mimeType: chunk.mimeType,
      page: chunk.page == null ? null : chunk.page,
      slide: chunk.slide == null ? null : chunk.slide,
      section: chunk.section || 'body',
      text: chunk.text,
      score: astRagCosineSimilarity(queryVector, chunk.embedding)
    }))
    .filter(item => item.score >= retrieval.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, retrieval.topK);
}

function astRagAnswerCore(request = {}) {
  const spanId = astRagTelemetryStartSpan('rag.answer', {
    indexFileId: request && request.indexFileId ? request.indexFileId : null
  });

  try {
    const normalizedRequest = astRagValidateAnswerRequest(request);
    const loaded = astRagLoadIndexDocument(normalizedRequest.indexFileId);
    const indexDocument = loaded.document;

    const indexEmbedding = indexDocument.embedding || {};
    const embeddingProvider = astRagNormalizeString(indexEmbedding.provider, null);
    const embeddingModel = astRagNormalizeString(indexEmbedding.model, null);

    if (!embeddingProvider || !embeddingModel) {
      throw new AstRagRetrievalError('Index is missing embedding metadata', {
        indexFileId: normalizedRequest.indexFileId
      });
    }

    const queryEmbedding = astRagEmbedTexts({
      provider: embeddingProvider,
      model: embeddingModel,
      texts: [normalizedRequest.question],
      auth: normalizedRequest.auth,
      options: { retries: 2 }
    });

    const rankedResults = astRagRankChunks(indexDocument, queryEmbedding.vectors[0], normalizedRequest.retrieval);

    if (rankedResults.length === 0) {
      const insufficient = {
        status: 'insufficient_context',
        answer: normalizedRequest.options.insufficientEvidenceMessage,
        citations: [],
        retrieval: {
          topK: normalizedRequest.retrieval.topK,
          minScore: normalizedRequest.retrieval.minScore,
          returned: 0
        },
        usage: queryEmbedding.usage
      };

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
      insufficientEvidenceMessage: normalizedRequest.options.insufficientEvidenceMessage
    });

    const result = {
      status: grounded.status,
      answer: grounded.answer,
      citations: grounded.citations,
      retrieval: {
        topK: normalizedRequest.retrieval.topK,
        minScore: normalizedRequest.retrieval.minScore,
        returned: rankedResults.length
      },
      usage: {
        retrieval: queryEmbedding.usage,
        generation: aiResponse.usage || {}
      }
    };

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
