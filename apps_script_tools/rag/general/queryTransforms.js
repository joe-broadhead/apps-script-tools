const AST_RAG_QUERY_REWRITE_STOPWORDS = Object.freeze(new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'for', 'of', 'on', 'in', 'at', 'by',
  'from', 'and', 'or', 'with', 'without', 'about', 'into', 'over', 'under', 'after', 'before', 'between',
  'what', 'which', 'who', 'where', 'when', 'why', 'how', 'please', 'tell', 'me'
]));

function astRagCollapseWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function astRagApplyRewritePolicy(query, rewrite = {}) {
  const normalized = astRagCollapseWhitespace(query);
  const policy = astRagNormalizeString(rewrite.policy, 'normalize');
  const preserveCase = astRagNormalizeBoolean(rewrite.preserveCase, true);

  if (!normalized || policy === 'none') {
    return normalized;
  }

  if (policy === 'keywords') {
    const keywordSource = preserveCase ? normalized : normalized.toLowerCase();
    const sourceTokens = keywordSource
      .split(/[^A-Za-z0-9]+/g)
      .map(token => token.trim())
      .filter(Boolean);
    const kept = [];
    const seen = new Set();

    for (let idx = 0; idx < sourceTokens.length; idx += 1) {
      const token = sourceTokens[idx];
      const tokenKey = token.toLowerCase();
      if (!token) {
        continue;
      }
      if (AST_RAG_QUERY_REWRITE_STOPWORDS.has(tokenKey)) {
        continue;
      }
      if (seen.has(tokenKey)) {
        continue;
      }
      seen.add(tokenKey);
      kept.push(token);
    }

    if (kept.length === 0) {
      return keywordSource;
    }
    return kept.join(' ');
  }

  let output = normalized
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s*([,;:.!?])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!preserveCase) {
    output = output.toLowerCase();
  }
  return output;
}

function astRagDecomposeQueryByPolicy(query, decompose = {}) {
  const normalized = astRagCollapseWhitespace(query);
  const policy = astRagNormalizeString(decompose.policy, 'clauses');
  if (!normalized || policy === 'none') {
    return [];
  }

  let parts = [];
  if (policy === 'sentences') {
    parts = normalized
      .split(/(?<=[.?!])\s+/g)
      .map(part => astRagCollapseWhitespace(part.replace(/[.?!]+$/g, '')));
  } else {
    parts = normalized
      .replace(/[?]/g, '.')
      .split(/\b(?:and|then|also|plus|versus|vs)\b|[.;\n]+/gi)
      .map(part => astRagCollapseWhitespace(part));
    if (parts.length <= 1) {
      parts = normalized.split(',').map(part => astRagCollapseWhitespace(part));
    }
  }

  const minChars = 4;
  const unique = [];
  const seen = new Set();
  for (let idx = 0; idx < parts.length; idx += 1) {
    const candidate = parts[idx];
    if (!candidate || candidate.length < minChars) {
      continue;
    }
    const dedupeKey = candidate.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    unique.push(candidate);
  }

  return unique;
}

function astRagBuildQueryTransformPlan(query, queryTransform = {}) {
  const originalQuery = astRagNormalizeString(query, '');
  const transform = astRagIsPlainObject(queryTransform)
    ? astRagCloneObject(queryTransform)
    : {};
  const rewrite = astRagIsPlainObject(transform.rewrite)
    ? astRagCloneObject(transform.rewrite)
    : {};
  const decompose = astRagIsPlainObject(transform.decompose)
    ? astRagCloneObject(transform.decompose)
    : {};
  const maxQueries = astRagNormalizePositiveInt(transform.maxQueries, 4, 1);
  const maxSubqueries = astRagNormalizePositiveInt(
    decompose.maxSubqueries,
    (
      AST_RAG_DEFAULT_RETRIEVAL
      && AST_RAG_DEFAULT_RETRIEVAL.queryTransform
      && AST_RAG_DEFAULT_RETRIEVAL.queryTransform.decompose
      && AST_RAG_DEFAULT_RETRIEVAL.queryTransform.decompose.maxSubqueries
    ) || 3,
    1
  );

  const rewriteEnabled = transform.enabled === true || rewrite.enabled === true;
  const rewrittenQuery = rewriteEnabled
    ? astRagApplyRewritePolicy(originalQuery, rewrite)
    : originalQuery;
  const rewriteApplied = rewrittenQuery !== originalQuery;

  const decomposeEnabled = transform.enabled === true || decompose.enabled === true;
  const decompositionRaw = decomposeEnabled
    ? astRagDecomposeQueryByPolicy(rewrittenQuery, decompose)
    : [];
  const decomposition = decompositionRaw.slice(0, maxSubqueries);
  const decomposeApplied = decomposition.length > 0
    && !(
      decomposition.length === 1
      && decomposition[0].toLowerCase() === rewrittenQuery.toLowerCase()
    );

  let retrievalQueries = decomposeApplied ? decomposition.slice() : [rewrittenQuery];
  if (decomposeEnabled && astRagNormalizeBoolean(decompose.includeOriginal, true)) {
    retrievalQueries.unshift(originalQuery);
  }

  const deduped = [];
  const dedupeSeen = new Set();
  for (let idx = 0; idx < retrievalQueries.length; idx += 1) {
    const candidate = astRagNormalizeString(retrievalQueries[idx], null);
    if (!candidate) {
      continue;
    }
    const dedupeKey = candidate.toLowerCase();
    if (dedupeSeen.has(dedupeKey)) {
      continue;
    }
    dedupeSeen.add(dedupeKey);
    deduped.push(candidate);
  }

  retrievalQueries = deduped.length > 0 ? deduped.slice(0, maxQueries) : [rewrittenQuery || originalQuery];

  return {
    originalQuery,
    rewrittenQuery,
    rewriteApplied,
    rewritePolicy: astRagNormalizeString(rewrite.policy, 'normalize'),
    decomposePolicy: astRagNormalizeString(decompose.policy, 'clauses'),
    decomposeApplied,
    retrievalQueries,
    transformed: rewriteApplied || decomposeApplied,
    maxQueries,
    maxSubqueries,
    truncated: deduped.length > maxQueries
  };
}

function astRagRewriteQueryCore(request = {}) {
  const normalized = astRagValidateRewriteQueryRequest(request);
  const plan = astRagBuildQueryTransformPlan(normalized.query, normalized.queryTransform);
  const rewriteEnabled = Boolean(
    normalized.queryTransform
    && (
      (
        normalized.queryTransform.enabled === true
        && plan.rewritePolicy !== 'none'
      )
      || (
        normalized.queryTransform.rewrite
        && normalized.queryTransform.rewrite.enabled === true
      )
    )
  );

  return {
    status: 'ok',
    query: plan.originalQuery,
    rewrittenQuery: plan.rewrittenQuery,
    rewriteApplied: plan.rewriteApplied,
    rewrite: {
      policy: plan.rewritePolicy,
      enabled: rewriteEnabled
    },
    provenance: plan
  };
}

function astRagDecomposeQuestionCore(request = {}) {
  const normalized = astRagValidateDecomposeQuestionRequest(request);
  const plan = astRagBuildQueryTransformPlan(normalized.question, normalized.queryTransform);
  const decomposeEnabled = Boolean(
    normalized.queryTransform
    && (
      (
        normalized.queryTransform.enabled === true
        && plan.decomposePolicy !== 'none'
      )
      || (
        normalized.queryTransform.decompose
        && normalized.queryTransform.decompose.enabled === true
      )
    )
  );

  return {
    status: 'ok',
    question: plan.originalQuery,
    rewrittenQuestion: plan.rewrittenQuery,
    subqueries: plan.retrievalQueries.slice(),
    decompose: {
      policy: plan.decomposePolicy,
      enabled: decomposeEnabled
    },
    provenance: plan
  };
}
