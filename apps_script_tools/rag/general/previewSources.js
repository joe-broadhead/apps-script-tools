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
  const normalized = astRagValidatePreviewRequest(request);
  const search = astRagSearchCore(normalized.searchRequest);

  const loaded = astRagLoadIndexDocument(normalized.searchRequest.indexFileId, {
    cache: astRagResolveCacheConfig(normalized.searchRequest.cache || {})
  });
  const versionToken = astRagNormalizeString(
    loaded.versionToken,
    astRagNormalizeString((loaded.document || {}).updatedAt, null)
  );

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
    retrieval: normalized.searchRequest.retrieval
  });

  if (normalized.preview.cachePayload) {
    astRagPutRetrievalPayload(
      cacheKey,
      payload,
      {
        cache: normalized.preview.payloadCache,
        ttlSec: normalized.preview.payloadTtlSec
      },
      normalized.searchRequest.cache || {}
    );
  }

  return {
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
}

