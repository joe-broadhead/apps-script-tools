function astRagFallbackNormalizeIntent(value, fallback = AST_RAG_DEFAULT_FALLBACK.intent) {
  const normalized = astRagNormalizeString(value, fallback);
  if (!['summary', 'facts'].includes(normalized)) {
    return fallback;
  }
  return normalized;
}

function astRagFallbackCleanSnippet(text) {
  const normalized = typeof text === 'string'
    ? text.replace(/\s+/g, ' ').trim()
    : '';

  if (!normalized) {
    return '';
  }

  const sentenceMatch = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentenceMatch && sentenceMatch[1] && sentenceMatch[1].length >= 40) {
    return astRagTruncate(sentenceMatch[1], 220);
  }

  return astRagTruncate(normalized, 220);
}

function astRagFallbackBuildFactResult(citations, factCount) {
  const lines = [];
  const matchedCitations = [];

  for (let idx = 0; idx < citations.length && lines.length < factCount; idx += 1) {
    const citation = citations[idx];
    const fact = astRagFallbackCleanSnippet(citation.snippet);

    if (!fact) {
      continue;
    }

    lines.push(`${lines.length + 1}. ${fact} [${citation.citationId}]`);
    matchedCitations.push(citation);
  }

  return {
    lines,
    citations: matchedCitations
  };
}

function astRagFallbackBuildSummaryLine(citations) {
  for (let idx = 0; idx < citations.length; idx += 1) {
    const snippet = astRagFallbackCleanSnippet(citations[idx].snippet);
    if (snippet) {
      return `${snippet} [${citations[idx].citationId}]`;
    }
  }

  return '';
}

function astRagFallbackFromCitations({
  citations = [],
  intent = AST_RAG_DEFAULT_FALLBACK.intent,
  factCount = AST_RAG_DEFAULT_FALLBACK.factCount,
  maxItems = AST_RAG_DEFAULT_RETRIEVAL.topK,
  insufficientEvidenceMessage = 'I do not have enough grounded context to answer that.'
} = {}) {
  const filtered = astRagCitationFilterForAnswer(citations, {
    maxItems: astRagNormalizePositiveInt(maxItems, AST_RAG_DEFAULT_RETRIEVAL.topK, 1)
  });

  if (filtered.length === 0) {
    return {
      status: 'insufficient_context',
      answer: insufficientEvidenceMessage,
      citations: []
    };
  }

  const normalizedIntent = astRagFallbackNormalizeIntent(intent, AST_RAG_DEFAULT_FALLBACK.intent);
  const normalizedFactCount = astRagNormalizePositiveInt(factCount, AST_RAG_DEFAULT_FALLBACK.factCount, 1);

  if (normalizedIntent === 'facts') {
    const factResult = astRagFallbackBuildFactResult(filtered, normalizedFactCount);
    if (factResult.lines.length === 0) {
      return {
        status: 'insufficient_context',
        answer: insufficientEvidenceMessage,
        citations: []
      };
    }

    return {
      status: 'ok',
      answer: `Here are grounded facts from the indexed sources:\n\n${factResult.lines.join('\n')}`,
      citations: factResult.citations
    };
  }

  const summary = astRagFallbackBuildSummaryLine(filtered);
  if (!summary) {
    return {
      status: 'insufficient_context',
      answer: insufficientEvidenceMessage,
      citations: []
    };
  }

  return {
    status: 'ok',
    answer: summary,
    citations: filtered.slice(0, 3)
  };
}
