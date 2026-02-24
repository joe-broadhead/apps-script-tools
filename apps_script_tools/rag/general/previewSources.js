function astRagBuildPreviewCard(result, index, snippetMaxChars, includeText) {
  const citationId = `S${index + 1}`;
  const url = astRagBuildSourceUrl(result.fileId, result.mimeType, result.page, result.slide);
  const snippet = astRagTruncate(result.text, snippetMaxChars);

  return {
    citationId,
    chunkId: result.chunkId,
    fileId: result.fileId,
    fileName: result.fileName,
    mimeType: result.mimeType,
    page: result.page == null ? null : result.page,
    slide: result.slide == null ? null : result.slide,
    section: result.section || 'body',
    score: result.score,
    vectorScore: typeof result.vectorScore === 'number' && isFinite(result.vectorScore)
      ? result.vectorScore
      : null,
    lexicalScore: typeof result.lexicalScore === 'number' && isFinite(result.lexicalScore)
      ? result.lexicalScore
      : null,
    finalScore: typeof result.finalScore === 'number' && isFinite(result.finalScore)
      ? result.finalScore
      : result.score,
    rerankScore: typeof result.rerankScore === 'number' && isFinite(result.rerankScore)
      ? result.rerankScore
      : null,
    snippet,
    url,
    text: includeText ? result.text : undefined
  };
}

function astRagPreviewSourcesCore(request = {}) {
  const totalStartMs = new Date().getTime();
  const validateStartMs = totalStartMs;
  const normalized = astRagValidatePreviewRequest(request);
  const diagnosticsEnabled = normalized.searchRequest.options && normalized.searchRequest.options.diagnostics === true;
  const diagnostics = {
    totalMs: 0,
    cache: {
      indexDocHit: false,
      searchHit: false,
      embeddingHit: false,
      retrievalPayloadHit: false,
      answerHit: false
    },
    timings: {
      validationMs: Math.max(0, new Date().getTime() - validateStartMs),
      indexLoadMs: 0,
      embeddingMs: 0,
      retrievalMs: 0,
      rerankMs: 0,
      generationMs: 0,
      searchMs: 0,
      payloadCacheWriteMs: 0
    },
    retrieval: {
      mode: normalized.searchRequest.retrieval.mode,
      topK: normalized.searchRequest.retrieval.topK,
      minScore: normalized.searchRequest.retrieval.minScore,
      returned: 0
    }
  };

  const searchStartMs = new Date().getTime();
  const search = astRagSearchCore(normalized.searchRequest);
  diagnostics.timings.searchMs = Math.max(0, new Date().getTime() - searchStartMs);
  diagnostics.retrieval.returned = Array.isArray(search.results) ? search.results.length : 0;
  if (search && astRagIsPlainObject(search.diagnostics)) {
    diagnostics.cache = Object.assign({}, diagnostics.cache, search.diagnostics.cache || {});
    diagnostics.timings = Object.assign({}, diagnostics.timings, search.diagnostics.timings || {});
    diagnostics.retrieval = Object.assign({}, diagnostics.retrieval, search.diagnostics.retrieval || {});
    diagnostics.timings.searchMs = Math.max(0, diagnostics.timings.searchMs);
  }

  const versionToken = astRagNormalizeString(search.versionToken, null);

  const cards = (search.results || []).map((item, index) => (
    astRagBuildPreviewCard(
      item,
      index,
      normalized.preview.snippetMaxChars,
      normalized.preview.includeText
    )
  ));

  const payload = astRagBuildRetrievalPayload({
    indexFileId: normalized.searchRequest.indexFileId,
    versionToken,
    query: normalized.searchRequest.query,
    retrieval: normalized.searchRequest.retrieval,
    results: search.results || []
  });

  const cacheKey = astRagBuildRetrievalCacheKey({
    indexFileId: normalized.searchRequest.indexFileId,
    versionToken,
    query: normalized.searchRequest.query,
    retrieval: normalized.searchRequest.retrieval,
    options: normalized.searchRequest.options
  });

  if (normalized.preview.cachePayload) {
    const payloadWriteStartMs = new Date().getTime();
    astRagPutRetrievalPayload(
      cacheKey,
      payload,
      {
        cache: normalized.preview.payloadCache,
        ttlSec: normalized.preview.payloadTtlSec
      },
      normalized.searchRequest.cache || {}
    );
    diagnostics.timings.payloadCacheWriteMs = Math.max(0, new Date().getTime() - payloadWriteStartMs);
  }

  diagnostics.totalMs = Math.max(0, new Date().getTime() - totalStartMs);

  const response = {
    indexFileId: normalized.searchRequest.indexFileId,
    versionToken,
    query: normalized.searchRequest.query,
    retrieval: normalized.searchRequest.retrieval,
    cards,
    payload: normalized.preview.includePayload ? payload : null,
    cacheKey,
    usage: search.usage || {},
    resultCount: cards.length
  };
  if (diagnosticsEnabled) {
    response.diagnostics = diagnostics;
  }
  return response;
}
