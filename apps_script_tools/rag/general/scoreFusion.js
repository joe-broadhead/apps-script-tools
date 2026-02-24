function astRagResolveHybridWeights(retrieval = {}) {
  if (retrieval.mode === 'lexical') {
    return {
      vectorWeight: 0,
      lexicalWeight: 1
    };
  }

  if (retrieval.mode !== 'hybrid') {
    return {
      vectorWeight: 1,
      lexicalWeight: 0
    };
  }

  const vectorWeight = typeof retrieval.vectorWeight === 'number' && isFinite(retrieval.vectorWeight)
    ? Math.max(0, retrieval.vectorWeight)
    : AST_RAG_DEFAULT_RETRIEVAL.vectorWeight;
  const lexicalWeight = typeof retrieval.lexicalWeight === 'number' && isFinite(retrieval.lexicalWeight)
    ? Math.max(0, retrieval.lexicalWeight)
    : AST_RAG_DEFAULT_RETRIEVAL.lexicalWeight;
  const sum = vectorWeight + lexicalWeight;

  if (sum <= 0) {
    throw new AstRagValidationError('Hybrid retrieval requires vectorWeight + lexicalWeight > 0');
  }

  return {
    vectorWeight: vectorWeight / sum,
    lexicalWeight: lexicalWeight / sum
  };
}

function astRagNormalizeLexicalScore(rawScore, minScore, maxScore) {
  if (typeof rawScore !== 'number' || !isFinite(rawScore) || rawScore <= 0) {
    return 0;
  }

  if (maxScore <= minScore) {
    return 1;
  }

  return (rawScore - minScore) / (maxScore - minScore);
}

function astRagNormalizeVectorScore(vectorScore) {
  if (typeof vectorScore !== 'number' || !isFinite(vectorScore)) {
    return 0;
  }

  return Math.max(0, Math.min(1, (vectorScore + 1) / 2));
}

function astRagFuseRetrievalScores(scoredChunks = [], retrieval = {}) {
  const mode = retrieval.mode === 'hybrid'
    ? 'hybrid'
    : (retrieval.mode === 'lexical' ? 'lexical' : 'vector');
  const lexicalValues = scoredChunks
    .map(item => (typeof item.lexicalScore === 'number' && isFinite(item.lexicalScore)) ? item.lexicalScore : 0);
  const lexicalMin = lexicalValues.length > 0 ? Math.min.apply(null, lexicalValues) : 0;
  const lexicalMax = lexicalValues.length > 0 ? Math.max.apply(null, lexicalValues) : 0;
  const weights = astRagResolveHybridWeights(retrieval);

  return scoredChunks.map(item => {
    const vectorScore = typeof item.vectorScore === 'number' && isFinite(item.vectorScore) ? item.vectorScore : 0;
    const lexicalScore = typeof item.lexicalScore === 'number' && isFinite(item.lexicalScore) ? item.lexicalScore : 0;

    if (mode === 'vector') {
      return Object.assign({}, item, {
        lexicalScore: null,
        finalScore: vectorScore
      });
    }

    if (mode === 'lexical') {
      const lexicalNormalized = astRagNormalizeLexicalScore(lexicalScore, lexicalMin, lexicalMax);
      return Object.assign({}, item, {
        vectorScore: null,
        finalScore: lexicalNormalized
      });
    }

    const vectorNormalized = astRagNormalizeVectorScore(vectorScore);
    const lexicalNormalized = astRagNormalizeLexicalScore(lexicalScore, lexicalMin, lexicalMax);
    const finalScore = (weights.vectorWeight * vectorNormalized) + (weights.lexicalWeight * lexicalNormalized);

    return Object.assign({}, item, {
      finalScore
    });
  });
}

function astRagSortScoredResults(scoredResults = []) {
  return scoredResults.slice().sort((left, right) => {
    const scoreDiff = (right.finalScore || 0) - (left.finalScore || 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    const vectorDiff = (right.vectorScore || 0) - (left.vectorScore || 0);
    if (vectorDiff !== 0) {
      return vectorDiff;
    }

    const lexicalDiff = (right.lexicalScore || 0) - (left.lexicalScore || 0);
    if (lexicalDiff !== 0) {
      return lexicalDiff;
    }

    const leftId = astRagNormalizeString(left.chunkId, '');
    const rightId = astRagNormalizeString(right.chunkId, '');
    return leftId < rightId ? -1 : (leftId > rightId ? 1 : 0);
  });
}
