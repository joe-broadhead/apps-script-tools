function astRagComputeCoverageScore(queryTokens, textTokens) {
  if (!Array.isArray(queryTokens) || queryTokens.length === 0) {
    return 0;
  }

  const tokenSet = new Set(textTokens || []);
  let matched = 0;

  queryTokens.forEach(token => {
    if (tokenSet.has(token)) {
      matched += 1;
    }
  });

  return matched / queryTokens.length;
}

function astRagComputeRerankScore(query, result) {
  const queryText = astRagNormalizeString(query, '').toLowerCase();
  const text = astRagNormalizeString(result && result.text, '').toLowerCase();
  const queryTokens = astRagTokenizeLexicalText(queryText);
  const textTokens = astRagTokenizeLexicalText(text);

  const coverage = astRagComputeCoverageScore(queryTokens, textTokens);
  const phraseBonus = queryText.length >= 8 && text.includes(queryText) ? 0.2 : 0;
  const baseScore = typeof result.finalScore === 'number' && isFinite(result.finalScore)
    ? result.finalScore
    : 0;

  return baseScore + (coverage * 0.25) + phraseBonus;
}

function astRagRerankResults(query, scoredResults = [], rerank = {}) {
  if (!rerank || rerank.enabled !== true || scoredResults.length <= 1) {
    return scoredResults.slice();
  }

  const topN = Math.min(
    scoredResults.length,
    astRagNormalizePositiveInt(rerank.topN, AST_RAG_DEFAULT_RETRIEVAL.rerank.topN, 1)
  );
  const head = scoredResults
    .slice(0, topN)
    .map(result => Object.assign({}, result, {
      rerankScore: astRagComputeRerankScore(query, result)
    }))
    .sort((left, right) => {
      const rerankDiff = (right.rerankScore || 0) - (left.rerankScore || 0);
      if (rerankDiff !== 0) {
        return rerankDiff;
      }

      const finalDiff = (right.finalScore || 0) - (left.finalScore || 0);
      if (finalDiff !== 0) {
        return finalDiff;
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

  return head.concat(scoredResults.slice(topN));
}
