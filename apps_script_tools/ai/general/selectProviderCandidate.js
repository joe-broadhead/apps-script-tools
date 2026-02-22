const AST_AI_ROUTING_DEFAULT_LATENCY_MS = Object.freeze({
  openai: 3200,
  gemini: 2800,
  vertex_gemini: 2600,
  openrouter: 3000,
  perplexity: 3400
});

const AST_AI_ROUTING_DEFAULT_COST_SCORE = Object.freeze({
  openai: 3,
  gemini: 2,
  vertex_gemini: 2,
  openrouter: 1,
  perplexity: 2
});

function astAiGetCandidatePriority(candidate = {}) {
  if (Number.isInteger(candidate.priority) && candidate.priority >= 0) {
    return candidate.priority;
  }

  if (typeof candidate.priority === 'number' && isFinite(candidate.priority) && candidate.priority >= 0) {
    return candidate.priority;
  }

  return Number.isInteger(candidate.index) ? candidate.index : 0;
}

function astAiGetCandidateLatencyMs(candidate = {}) {
  if (typeof candidate.latencyMs === 'number' && isFinite(candidate.latencyMs) && candidate.latencyMs > 0) {
    return candidate.latencyMs;
  }

  const provider = String(candidate.provider || '').trim();
  return AST_AI_ROUTING_DEFAULT_LATENCY_MS[provider] || 10000;
}

function astAiGetCandidateCostScore(candidate = {}) {
  if (typeof candidate.unitCost === 'number' && isFinite(candidate.unitCost) && candidate.unitCost >= 0) {
    return candidate.unitCost;
  }

  const provider = String(candidate.provider || '').trim();
  return AST_AI_ROUTING_DEFAULT_COST_SCORE[provider] || 100;
}

function astAiSortRoutingCandidates(candidates = [], strategy = 'priority') {
  const list = Array.isArray(candidates) ? candidates.slice() : [];

  if (strategy === 'priority') {
    return list.sort((left, right) => {
      const priorityDiff = astAiGetCandidatePriority(left) - astAiGetCandidatePriority(right);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left.index - right.index;
    });
  }

  if (strategy === 'fastest') {
    return list.sort((left, right) => {
      const latencyDiff = astAiGetCandidateLatencyMs(left) - astAiGetCandidateLatencyMs(right);
      if (latencyDiff !== 0) {
        return latencyDiff;
      }
      return left.index - right.index;
    });
  }

  if (strategy === 'cost_first') {
    return list.sort((left, right) => {
      const costDiff = astAiGetCandidateCostScore(left) - astAiGetCandidateCostScore(right);
      if (costDiff !== 0) {
        return costDiff;
      }
      const latencyDiff = astAiGetCandidateLatencyMs(left) - astAiGetCandidateLatencyMs(right);
      if (latencyDiff !== 0) {
        return latencyDiff;
      }
      return left.index - right.index;
    });
  }

  return list;
}
