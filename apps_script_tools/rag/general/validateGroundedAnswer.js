function astRagExtractCitationIdsFromText(text) {
  if (typeof text !== 'string') {
    return [];
  }

  const matches = text.match(/\bS\d+\b/g) || [];
  return Array.from(new Set(matches));
}

function astRagNormalizeCitationIds(candidate) {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return Array.from(new Set(
    candidate
      .map(value => astRagNormalizeString(value, null))
      .filter(Boolean)
  ));
}

function astRagValidateGroundedAnswer({
  responseJson,
  contextBlocks,
  searchResults,
  requireCitations,
  insufficientEvidenceMessage
}) {
  const parsed = astRagIsPlainObject(responseJson) ? responseJson : {};
  const answer = astRagNormalizeString(parsed.answer, null);

  if (!answer) {
    return {
      status: 'insufficient_context',
      answer: insufficientEvidenceMessage,
      citations: []
    };
  }

  const allowedCitationIds = new Set((contextBlocks || []).map(block => block.citationId));
  let citationIds = astRagNormalizeCitationIds(parsed.citations);

  if (citationIds.length === 0) {
    citationIds = astRagExtractCitationIdsFromText(answer);
  }

  const validCitationIds = citationIds.filter(citationId => allowedCitationIds.has(citationId));

  if (requireCitations && validCitationIds.length === 0) {
    return {
      status: 'insufficient_context',
      answer: insufficientEvidenceMessage,
      citations: []
    };
  }

  const citations = validCitationIds.map(citationId => {
    const index = Number(citationId.slice(1)) - 1;
    const result = searchResults[index];

    if (!result) {
      return null;
    }

    return {
      citationId,
      chunkId: result.chunkId,
      fileId: result.fileId,
      fileName: result.fileName,
      mimeType: result.mimeType,
      page: result.page,
      slide: result.slide,
      score: result.score,
      snippet: astRagTruncate(result.text, 280)
    };
  }).filter(Boolean);

  if (requireCitations && citations.length === 0) {
    return {
      status: 'insufficient_context',
      answer: insufficientEvidenceMessage,
      citations: []
    };
  }

  return {
    status: 'ok',
    answer,
    citations
  };
}
