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

function astRagNormalizeRerankScoreOutput(output, candidates) {
  if (Array.isArray(output)) {
    if (
      output.length === candidates.length &&
      output.every(value => typeof value === 'number' && isFinite(value))
    ) {
      return output.map((score, idx) => ({
        chunkId: candidates[idx].chunkId,
        score
      }));
    }

    return output.map(item => {
      if (!astRagIsPlainObject(item)) {
        throw new AstRagValidationError('Reranker output array items must be score objects', {
          field: 'reranker.output'
        });
      }
      return {
        chunkId: astRagNormalizeString(item.chunkId, null),
        score: item.score
      };
    });
  }

  if (astRagIsPlainObject(output)) {
    return Object.keys(output).map(chunkId => ({
      chunkId,
      score: output[chunkId]
    }));
  }

  throw new AstRagValidationError('Reranker output must be an array or object map', {
    field: 'reranker.output'
  });
}

function astRagBuildRerankAssignmentMap(rawAssignments, candidates, rerankerName) {
  const assignments = astRagNormalizeRerankScoreOutput(rawAssignments, candidates);
  const assignmentMap = {};

  assignments.forEach(item => {
    if (!item || !item.chunkId) {
      return;
    }
    if (typeof item.score !== 'number' || !isFinite(item.score)) {
      throw new AstRagValidationError('Reranker score must be a finite number', {
        reranker: rerankerName,
        chunkId: item.chunkId
      });
    }
    assignmentMap[item.chunkId] = item.score;
  });

  return assignmentMap;
}

function astRagNormalizeRerankScores(results = []) {
  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  let minScore = Infinity;
  let maxScore = -Infinity;
  results.forEach(result => {
    const score = typeof result.rerankScore === 'number' && isFinite(result.rerankScore)
      ? result.rerankScore
      : 0;
    if (score < minScore) {
      minScore = score;
    }
    if (score > maxScore) {
      maxScore = score;
    }
  });

  const spread = maxScore - minScore;
  return results.map(result => {
    const score = typeof result.rerankScore === 'number' && isFinite(result.rerankScore)
      ? result.rerankScore
      : 0;
    const rerankScoreNormalized = spread <= 0
      ? 1
      : (score - minScore) / spread;
    return Object.assign({}, result, {
      rerankScore: score,
      rerankScoreNormalized
    });
  });
}

function astRagHeuristicRerank(request = {}) {
  const query = astRagNormalizeString(request.query, '');
  const candidates = Array.isArray(request.candidates) ? request.candidates : [];
  return candidates.map(candidate => ({
    chunkId: candidate.chunkId,
    score: astRagComputeRerankScore(query, candidate)
  }));
}

function astRagRunRegisteredReranker(query, headCandidates, rerankConfig = {}) {
  const rerankerName = astRagNormalizeString(
    rerankConfig.provider,
    AST_RAG_DEFAULT_RETRIEVAL.rerank.provider
  ).toLowerCase();
  const reranker = astRagGetReranker(rerankerName);

  let rawOutput = null;
  try {
    rawOutput = reranker.adapter.rerank({
      query,
      candidates: headCandidates.map(candidate => astRagCloneObject(candidate)),
      topN: headCandidates.length,
      rerank: astRagCloneObject(rerankConfig)
    });
  } catch (error) {
    throw new AstRagError('Reranker execution failed', {
      reranker: rerankerName,
      cause: error && error.message ? String(error.message) : String(error)
    });
  }

  const assignmentMap = astRagBuildRerankAssignmentMap(rawOutput, headCandidates, rerankerName);
  const scoredHead = headCandidates.map(candidate => Object.assign({}, candidate, {
    rerankProvider: rerankerName,
    rerankScore: Object.prototype.hasOwnProperty.call(assignmentMap, candidate.chunkId)
      ? assignmentMap[candidate.chunkId]
      : 0
  }));
  return astRagNormalizeRerankScores(scoredHead);
}

function astRagSortRerankedHead(results = []) {
  return results.slice().sort((left, right) => {
    const normDiff = (right.rerankScoreNormalized || 0) - (left.rerankScoreNormalized || 0);
    if (normDiff !== 0) {
      return normDiff;
    }

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
}

function astRagRerankResults(query, scoredResults = [], rerank = {}, runtime = {}) {
  if (!rerank || rerank.enabled !== true || scoredResults.length <= 1) {
    return scoredResults.slice();
  }

  const diagnostics = astRagIsPlainObject(runtime) ? runtime.diagnostics : null;
  const rerankStartedAtMs = new Date().getTime();
  const topN = Math.min(
    scoredResults.length,
    astRagNormalizePositiveInt(rerank.topN, AST_RAG_DEFAULT_RETRIEVAL.rerank.topN, 1)
  );
  const headCandidates = scoredResults.slice(0, topN);
  const rerankedHead = astRagSortRerankedHead(
    astRagRunRegisteredReranker(query, headCandidates, rerank)
  );

  if (astRagIsPlainObject(diagnostics)) {
    if (!astRagIsPlainObject(diagnostics.timings)) {
      diagnostics.timings = {};
    }
    if (!astRagIsPlainObject(diagnostics.retrieval)) {
      diagnostics.retrieval = {};
    }
    diagnostics.timings.rerankMs = (
      diagnostics.timings.rerankMs || 0
    ) + Math.max(0, new Date().getTime() - rerankStartedAtMs);
    diagnostics.retrieval.reranker = astRagNormalizeString(
      rerank.provider,
      AST_RAG_DEFAULT_RETRIEVAL.rerank.provider
    );
    diagnostics.retrieval.rerankTopN = topN;
  }

  return rerankedHead.concat(scoredResults.slice(topN));
}

function astRagValidateDirectRerankRequest(request = {}) {
  if (!astRagIsPlainObject(request)) {
    throw new AstRagValidationError('rerank request must be an object');
  }

  const query = astRagNormalizeString(request.query, '');
  const inputResults = Array.isArray(request.results)
    ? request.results
    : (Array.isArray(request.candidates) ? request.candidates : []);
  if (inputResults.length === 0) {
    throw new AstRagValidationError('rerank request requires a non-empty results array');
  }

  const normalizedResults = inputResults.map((result, idx) => {
    if (!astRagIsPlainObject(result)) {
      throw new AstRagValidationError('rerank results must contain objects', {
        index: idx
      });
    }
    const chunkId = astRagNormalizeString(result.chunkId, null);
    if (!chunkId) {
      throw new AstRagValidationError('rerank result is missing chunkId', {
        index: idx
      });
    }
    return Object.assign({}, result, {
      chunkId,
      finalScore: typeof result.finalScore === 'number' && isFinite(result.finalScore)
        ? result.finalScore
        : (
          typeof result.score === 'number' && isFinite(result.score)
            ? result.score
            : 0
        ),
      lexicalScore: typeof result.lexicalScore === 'number' && isFinite(result.lexicalScore)
        ? result.lexicalScore
        : 0,
      vectorScore: typeof result.vectorScore === 'number' && isFinite(result.vectorScore)
        ? result.vectorScore
        : 0
    });
  });

  const rerankInput = astRagIsPlainObject(request.rerank)
    ? astRagCloneObject(request.rerank)
    : {};
  if (typeof rerankInput.enabled === 'undefined') {
    rerankInput.enabled = astRagNormalizeBoolean(request.enabled, true);
  }
  if (typeof rerankInput.topN === 'undefined') {
    rerankInput.topN = request.topN;
  }
  if (typeof rerankInput.provider === 'undefined') {
    rerankInput.provider = request.provider;
  }

  const rerankDefaults = Object.assign({}, AST_RAG_DEFAULT_RETRIEVAL.rerank, {
    enabled: true
  });
  const rerankConfig = astRagNormalizeRetrievalRerank(
    rerankInput,
    rerankDefaults,
    'rerank'
  );

  return {
    query,
    results: normalizedResults,
    rerank: rerankConfig
  };
}

function astRagRerankCore(request = {}) {
  const normalized = astRagValidateDirectRerankRequest(request);
  const reranked = astRagRerankResults(
    normalized.query,
    normalized.results,
    normalized.rerank
  );
  return {
    status: 'ok',
    query: normalized.query,
    rerank: normalized.rerank,
    totalCandidates: normalized.results.length,
    returned: reranked.length,
    results: reranked
  };
}
