function astRagEvalRound(value, digits = 6) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return null;
  }
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function astRagEvalNormalizeSet(values) {
  const output = {};
  (Array.isArray(values) ? values : []).forEach(value => {
    const normalized = astRagNormalizeString(value, '').toLowerCase();
    if (normalized) {
      output[normalized] = true;
    }
  });
  return output;
}

function astRagEvalSetSize(setObject) {
  return Object.keys(setObject || {}).length;
}

function astRagEvalSetIntersectionSize(left, right) {
  const keys = Object.keys(left || {});
  let count = 0;
  for (let idx = 0; idx < keys.length; idx += 1) {
    if (right && right[keys[idx]]) {
      count += 1;
    }
  }
  return count;
}

function astRagEvalSourceSetFromSearchResults(results) {
  const tokens = {};

  (Array.isArray(results) ? results : []).forEach(item => {
    const fileId = astRagNormalizeString(item && item.fileId, '').toLowerCase();
    const fileName = astRagNormalizeString(item && item.fileName, '').toLowerCase();
    const sourceUri = astRagNormalizeString(item && item.sourceUri, '').toLowerCase();

    if (fileId) tokens[fileId] = true;
    if (fileName) tokens[fileName] = true;
    if (sourceUri) tokens[sourceUri] = true;
  });

  return tokens;
}

function astRagEvalSourceSetFromCitations(citations) {
  const tokens = {};

  (Array.isArray(citations) ? citations : []).forEach(item => {
    const fileId = astRagNormalizeString(item && item.fileId, '').toLowerCase();
    const fileName = astRagNormalizeString(item && item.fileName, '').toLowerCase();
    const sourceUri = astRagNormalizeString(item && item.sourceUri, '').toLowerCase();

    if (fileId) tokens[fileId] = true;
    if (fileName) tokens[fileName] = true;
    if (sourceUri) tokens[sourceUri] = true;
  });

  return tokens;
}

function astRagEvalSourceMetrics(expectedSources, observedSourceSet) {
  const expectedSet = astRagEvalNormalizeSet(expectedSources);
  const expectedCount = astRagEvalSetSize(expectedSet);
  const observedCount = astRagEvalSetSize(observedSourceSet);
  const matchedCount = astRagEvalSetIntersectionSize(expectedSet, observedSourceSet);

  const hitAtK = expectedCount > 0 ? (matchedCount > 0 ? 1 : 0) : null;
  const precision = expectedCount > 0 ? (observedCount > 0 ? matchedCount / observedCount : 0) : null;
  const recall = expectedCount > 0 ? matchedCount / expectedCount : null;

  return {
    hitAtK,
    precision,
    recall,
    counts: {
      expected: expectedCount,
      observed: observedCount,
      matched: matchedCount
    }
  };
}

function astRagEvalFactRecall(expectedFacts, answerText) {
  const facts = astRagNormalizeStringArray(expectedFacts, 'evaluate.dataset.expectedFacts', true);
  const factCount = facts.length;
  if (factCount === 0) {
    return {
      recall: null,
      matched: 0,
      expected: 0
    };
  }

  const haystack = astRagNormalizeString(answerText, '').toLowerCase();
  let matched = 0;
  for (let idx = 0; idx < facts.length; idx += 1) {
    const needle = astRagNormalizeString(facts[idx], '').toLowerCase();
    if (!needle) {
      continue;
    }
    if (haystack.indexOf(needle) !== -1) {
      matched += 1;
    }
  }

  return {
    recall: matched / factCount,
    matched,
    expected: factCount
  };
}

function astRagEvalOrderDataset(dataset, options = {}) {
  const ordered = Array.isArray(dataset) ? dataset.slice() : [];
  if (options.order !== 'seeded') {
    return ordered;
  }

  const seed = astRagNormalizeString(options.fixedSeed, 'ast-rag-eval-v1');
  ordered.sort((left, right) => {
    const leftKey = astRagComputeChecksum(`${seed}::${left.id}::${left.question}`);
    const rightKey = astRagComputeChecksum(`${seed}::${right.id}::${right.question}`);
    if (leftKey < rightKey) return -1;
    if (leftKey > rightKey) return 1;
    return left.question.localeCompare(right.question);
  });

  return ordered;
}

function astRagEvalCreateAccumulator() {
  return {
    evaluated: 0,
    errors: 0,
    totalLatencyMs: 0,
    totalRetrievalMs: 0,
    totalGenerationMs: 0,
    retrievalMsSamples: 0,
    generationMsSamples: 0,
    hitAtKSum: 0,
    hitAtKDenom: 0,
    sourcePrecisionSum: 0,
    sourcePrecisionDenom: 0,
    sourceRecallSum: 0,
    sourceRecallDenom: 0,
    factRecallSum: 0,
    factRecallDenom: 0,
    abstentionCorrect: 0,
    abstentionDenom: 0
  };
}

function astRagEvalAccumulate(acc, metrics = {}, timings = {}) {
  acc.evaluated += 1;
  acc.totalLatencyMs += astRagNormalizePositiveInt(Math.max(1, Math.round(timings.latencyMs || 0)), 0, 0);

  if (typeof timings.retrievalMs === 'number' && isFinite(timings.retrievalMs) && timings.retrievalMs >= 0) {
    acc.totalRetrievalMs += timings.retrievalMs;
    acc.retrievalMsSamples += 1;
  }

  if (typeof timings.generationMs === 'number' && isFinite(timings.generationMs) && timings.generationMs >= 0) {
    acc.totalGenerationMs += timings.generationMs;
    acc.generationMsSamples += 1;
  }

  if (typeof metrics.hitAtK === 'number') {
    acc.hitAtKSum += metrics.hitAtK;
    acc.hitAtKDenom += 1;
  }
  if (typeof metrics.sourcePrecision === 'number') {
    acc.sourcePrecisionSum += metrics.sourcePrecision;
    acc.sourcePrecisionDenom += 1;
  }
  if (typeof metrics.sourceRecall === 'number') {
    acc.sourceRecallSum += metrics.sourceRecall;
    acc.sourceRecallDenom += 1;
  }
  if (typeof metrics.factRecall === 'number') {
    acc.factRecallSum += metrics.factRecall;
    acc.factRecallDenom += 1;
  }
  if (typeof metrics.abstentionCorrect === 'number') {
    acc.abstentionCorrect += metrics.abstentionCorrect;
    acc.abstentionDenom += 1;
  }
}

function astRagEvalFinalizeMetrics(acc) {
  return {
    hitAtK: acc.hitAtKDenom > 0 ? astRagEvalRound(acc.hitAtKSum / acc.hitAtKDenom) : null,
    sourcePrecision: acc.sourcePrecisionDenom > 0 ? astRagEvalRound(acc.sourcePrecisionSum / acc.sourcePrecisionDenom) : null,
    sourceRecall: acc.sourceRecallDenom > 0 ? astRagEvalRound(acc.sourceRecallSum / acc.sourceRecallDenom) : null,
    factRecall: acc.factRecallDenom > 0 ? astRagEvalRound(acc.factRecallSum / acc.factRecallDenom) : null,
    abstentionAccuracy: acc.abstentionDenom > 0 ? astRagEvalRound(acc.abstentionCorrect / acc.abstentionDenom) : null,
    avgLatencyMs: acc.evaluated > 0 ? astRagEvalRound(acc.totalLatencyMs / acc.evaluated) : null,
    avgRetrievalMs: acc.retrievalMsSamples > 0 ? astRagEvalRound(acc.totalRetrievalMs / acc.retrievalMsSamples) : null,
    avgGenerationMs: acc.generationMsSamples > 0 ? astRagEvalRound(acc.totalGenerationMs / acc.generationMsSamples) : null
  };
}

function astRagEvalBuildAnswerRequest(normalized, sample) {
  return {
    indexFileId: normalized.indexFileId,
    question: sample.question,
    history: [],
    retrieval: normalized.retrieval,
    generation: normalized.generation,
    options: {
      requireCitations: true,
      enforceAccessControl: normalized.options.enforceAccessControl,
      diagnostics: true,
      maxRetrievalMs: normalized.options.maxRetrievalMs,
      onRetrievalTimeout: 'insufficient_context',
      insufficientEvidenceMessage: 'I do not have enough grounded context to answer that.'
    },
    auth: normalized.auth,
    cache: normalized.cache
  };
}

function astRagEvalBuildSearchRequest(normalized, sample) {
  return {
    indexFileId: normalized.indexFileId,
    query: sample.question,
    retrieval: normalized.retrieval,
    options: {
      diagnostics: true,
      enforceAccessControl: normalized.options.enforceAccessControl,
      maxRetrievalMs: normalized.options.maxRetrievalMs
    },
    auth: normalized.auth,
    cache: normalized.cache
  };
}

function astRagEvaluateCore(request = {}) {
  const normalized = astRagValidateEvaluateRequest(request);
  const startedAt = new Date().toISOString();
  const ordered = astRagEvalOrderDataset(normalized.dataset, normalized.options)
    .slice(0, normalized.options.maxItems);

  const items = [];
  const accumulator = astRagEvalCreateAccumulator();

  for (let idx = 0; idx < ordered.length; idx += 1) {
    const sample = ordered[idx];
    const itemStartedAt = Date.now();

    try {
      if (normalized.mode === 'retrieval') {
        const searchResponse = astRagSearchCore(astRagEvalBuildSearchRequest(normalized, sample));
        const observed = astRagEvalSourceSetFromSearchResults(searchResponse.results || []);
        const sourceMetrics = astRagEvalSourceMetrics(sample.expectedSources, observed);

        const retrievalMs = searchResponse && searchResponse.diagnostics && searchResponse.diagnostics.timings
          ? searchResponse.diagnostics.timings.retrievalMs
          : null;
        const latencyMs = Date.now() - itemStartedAt;

        const metrics = {
          hitAtK: sourceMetrics.hitAtK,
          sourcePrecision: sourceMetrics.precision,
          sourceRecall: sourceMetrics.recall,
          factRecall: null,
          abstentionCorrect: null
        };

        astRagEvalAccumulate(accumulator, metrics, {
          latencyMs,
          retrievalMs,
          generationMs: null
        });

        items.push({
          index: idx,
          id: sample.id,
          question: sample.question,
          status: 'ok',
          mode: normalized.mode,
          metrics: {
            hitAtK: sourceMetrics.hitAtK,
            sourcePrecision: astRagEvalRound(sourceMetrics.precision),
            sourceRecall: astRagEvalRound(sourceMetrics.recall),
            sourceCounts: sourceMetrics.counts
          },
          timings: {
            latencyMs,
            retrievalMs,
            generationMs: null
          },
          output: normalized.options.includeItemOutputs
            ? { returned: Array.isArray(searchResponse.results) ? searchResponse.results.length : 0 }
            : null
        });
        continue;
      }

      const answerResponse = astRagAnswerCore(astRagEvalBuildAnswerRequest(normalized, sample));
      const observed = astRagEvalSourceSetFromCitations(answerResponse.citations || []);
      const sourceMetrics = astRagEvalSourceMetrics(sample.expectedSources, observed);
      const facts = astRagEvalFactRecall(sample.expectedFacts, answerResponse.answer);

      let abstentionCorrect = null;
      if (typeof sample.expectedAnswerable === 'boolean') {
        const abstained = answerResponse.status === 'insufficient_context';
        abstentionCorrect = sample.expectedAnswerable ? (abstained ? 0 : 1) : (abstained ? 1 : 0);
      }

      const retrievalMs = answerResponse && answerResponse.diagnostics && answerResponse.diagnostics.timings
        ? answerResponse.diagnostics.timings.retrievalMs
        : null;
      const generationMs = answerResponse && answerResponse.diagnostics && answerResponse.diagnostics.timings
        ? answerResponse.diagnostics.timings.generationMs
        : null;
      const latencyMs = Date.now() - itemStartedAt;

      const metrics = {
        hitAtK: sourceMetrics.hitAtK,
        sourcePrecision: sourceMetrics.precision,
        sourceRecall: sourceMetrics.recall,
        factRecall: facts.recall,
        abstentionCorrect
      };

      astRagEvalAccumulate(accumulator, metrics, {
        latencyMs,
        retrievalMs,
        generationMs
      });

      items.push({
        index: idx,
        id: sample.id,
        question: sample.question,
        status: 'ok',
        mode: normalized.mode,
        answerStatus: answerResponse.status,
        metrics: {
          hitAtK: sourceMetrics.hitAtK,
          sourcePrecision: astRagEvalRound(sourceMetrics.precision),
          sourceRecall: astRagEvalRound(sourceMetrics.recall),
          sourceCounts: sourceMetrics.counts,
          factRecall: astRagEvalRound(facts.recall),
          factCounts: {
            matched: facts.matched,
            expected: facts.expected
          },
          abstentionCorrect
        },
        timings: {
          latencyMs,
          retrievalMs,
          generationMs
        },
        output: normalized.options.includeItemOutputs
          ? {
              answer: answerResponse.answer,
              citations: answerResponse.citations || []
            }
          : null
      });
    } catch (error) {
      accumulator.errors += 1;
      items.push({
        index: idx,
        id: sample.id,
        question: sample.question,
        status: 'error',
        mode: normalized.mode,
        error: {
          name: error && error.name ? String(error.name) : 'Error',
          message: error && error.message ? String(error.message) : String(error)
        },
        timings: {
          latencyMs: Date.now() - itemStartedAt,
          retrievalMs: null,
          generationMs: null
        }
      });

      if (!normalized.options.continueOnError) {
        throw error;
      }
    }
  }

  const finishedAt = new Date().toISOString();

  return {
    status: 'ok',
    mode: normalized.mode,
    startedAt,
    finishedAt,
    config: {
      indexFileId: normalized.indexFileId,
      order: normalized.options.order,
      fixedSeed: normalized.options.fixedSeed,
      maxItems: normalized.options.maxItems
    },
    stats: {
      total: ordered.length,
      evaluated: accumulator.evaluated,
      errors: accumulator.errors
    },
    metrics: astRagEvalFinalizeMetrics(accumulator),
    items
  };
}

function astRagEvalMetricDelta(baselineMetrics = {}, candidateMetrics = {}) {
  const keys = Array.from(new Set(
    Object.keys(baselineMetrics || {}).concat(Object.keys(candidateMetrics || {}))
  ));

  const output = {};
  keys.forEach(key => {
    const baseline = baselineMetrics[key];
    const candidate = candidateMetrics[key];
    if (typeof baseline === 'number' && typeof candidate === 'number') {
      output[key] = astRagEvalRound(candidate - baseline);
    } else {
      output[key] = null;
    }
  });
  return output;
}

function astRagCompareRunsCore(request = {}) {
  const normalized = astRagValidateCompareRunsRequest(request);
  const baseline = astRagEvaluateCore(normalized.baseline);
  const candidate = astRagEvaluateCore(normalized.candidate);

  const response = {
    status: 'ok',
    metricsDelta: astRagEvalMetricDelta(baseline.metrics, candidate.metrics),
    statsDelta: {
      total: candidate.stats.total - baseline.stats.total,
      evaluated: candidate.stats.evaluated - baseline.stats.evaluated,
      errors: candidate.stats.errors - baseline.stats.errors
    }
  };

  if (normalized.options.includeBaseline) {
    response.baseline = normalized.options.includeItems
      ? baseline
      : Object.assign({}, baseline, { items: [] });
  }
  if (normalized.options.includeCandidate) {
    response.candidate = normalized.options.includeItems
      ? candidate
      : Object.assign({}, candidate, { items: [] });
  }

  return response;
}
