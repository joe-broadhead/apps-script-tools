function astRagCitationExtractIds(text) {
  if (typeof text !== 'string') {
    return [];
  }

  const matches = text.match(/\bS\d+\b/gi) || [];
  const seen = {};
  const ordered = [];

  for (let idx = 0; idx < matches.length; idx += 1) {
    const normalized = matches[idx].toUpperCase();
    if (seen[normalized]) {
      continue;
    }
    seen[normalized] = true;
    ordered.push(normalized);
  }

  return ordered;
}

function astRagCitationNormalizeInline(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/\[\s*(S)\s*0*(\d+)\s*\]/gi, (_match, prefix, digits) => `[${prefix.toUpperCase()}${Number(digits)}]`)
    .replace(/\b(S)\s*0*(\d+)\b/gi, (_match, prefix, digits) => `${prefix.toUpperCase()}${Number(digits)}`)
    .replace(/\s+\[(S\d+)\]/g, ' [$1]')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function astRagCitationNormalizeRecord(citation = {}) {
  if (!astRagIsPlainObject(citation)) {
    return null;
  }

  const citationId = astRagNormalizeString(citation.citationId, null);
  const chunkId = astRagNormalizeString(citation.chunkId, null);
  const fileId = astRagNormalizeString(citation.fileId, null);
  const fileName = astRagNormalizeString(citation.fileName, null);
  const mimeType = astRagNormalizeString(citation.mimeType, null);

  if (!citationId || !chunkId || !fileId || !fileName || !mimeType) {
    return null;
  }

  const toFiniteOrNull = value => (typeof value === 'number' && isFinite(value) ? value : null);
  const finalScore = toFiniteOrNull(citation.finalScore);
  const score = toFiniteOrNull(citation.score);
  const normalizedScore = finalScore == null ? score : finalScore;

  return {
    citationId,
    chunkId,
    fileId,
    fileName,
    mimeType,
    page: toFiniteOrNull(citation.page),
    slide: toFiniteOrNull(citation.slide),
    section: astRagNormalizeString(citation.section, 'body'),
    score: normalizedScore == null ? 0 : normalizedScore,
    vectorScore: toFiniteOrNull(citation.vectorScore),
    lexicalScore: toFiniteOrNull(citation.lexicalScore),
    finalScore: normalizedScore == null ? 0 : normalizedScore,
    rerankScore: toFiniteOrNull(citation.rerankScore),
    snippet: astRagNormalizeString(citation.snippet, ''),
    url: astRagBuildSourceUrl(fileId, mimeType, citation.page, citation.slide)
  };
}

function astRagCitationDedupeByChunk(citations) {
  const seenChunkIds = {};
  const deduped = [];

  for (let idx = 0; idx < citations.length; idx += 1) {
    const item = citations[idx];
    if (seenChunkIds[item.chunkId]) {
      continue;
    }
    seenChunkIds[item.chunkId] = true;
    deduped.push(item);
  }

  return deduped;
}

function astRagCitationSort(citations) {
  return citations.slice().sort((left, right) => {
    const leftScore = typeof left.finalScore === 'number' && isFinite(left.finalScore)
      ? left.finalScore
      : (typeof left.score === 'number' && isFinite(left.score) ? left.score : 0);
    const rightScore = typeof right.finalScore === 'number' && isFinite(right.finalScore)
      ? right.finalScore
      : (typeof right.score === 'number' && isFinite(right.score) ? right.score : 0);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return String(left.citationId).localeCompare(String(right.citationId));
  });
}

function astRagCitationFilterForAnswer(citations, options = {}) {
  const list = Array.isArray(citations)
    ? citations.map(astRagCitationNormalizeRecord).filter(Boolean)
    : [];

  const normalized = astRagIsPlainObject(options) ? options : {};
  const maxItems = astRagNormalizePositiveInt(normalized.maxItems, 6, 1);
  const minScoreCandidate = normalized.minScore;
  const minScore = (typeof minScoreCandidate === 'number' && isFinite(minScoreCandidate))
    ? Math.max(-1, Math.min(1, minScoreCandidate))
    : null;

  let output = astRagCitationSort(list);
  if (minScore != null) {
    output = output.filter(item => item.finalScore >= minScore);
  }

  output = astRagCitationDedupeByChunk(output);
  return output.slice(0, maxItems);
}

function astRagCitationToUrl(citation = {}) {
  const normalized = astRagCitationNormalizeRecord(citation);
  if (!normalized) {
    return null;
  }

  return normalized.url;
}
