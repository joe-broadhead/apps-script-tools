function astRagPipelineNowMs() {
  return new Date().getTime();
}

function astRagApplyCacheOperationDiagnosticsShared(diagnostics, operationMeta) {
  if (!astRagIsPlainObject(diagnostics) || !astRagIsPlainObject(operationMeta)) {
    return;
  }

  if (!astRagIsPlainObject(diagnostics.timings)) {
    diagnostics.timings = {};
  }
  if (!astRagIsPlainObject(diagnostics.cache)) {
    diagnostics.cache = {};
  }

  const durationMs = typeof operationMeta.durationMs === 'number' && isFinite(operationMeta.durationMs)
    ? Math.max(0, operationMeta.durationMs)
    : 0;
  const lockWaitMs = typeof operationMeta.lockWaitMs === 'number' && isFinite(operationMeta.lockWaitMs)
    ? Math.max(0, operationMeta.lockWaitMs)
    : 0;
  const lockContention = typeof operationMeta.lockContention === 'number' && isFinite(operationMeta.lockContention)
    ? Math.max(0, operationMeta.lockContention)
    : 0;

  if (operationMeta.operation === 'set') {
    diagnostics.timings.cacheSetMs = (diagnostics.timings.cacheSetMs || 0) + durationMs;
  } else if (operationMeta.operation === 'delete') {
    diagnostics.timings.cacheDeleteMs = (diagnostics.timings.cacheDeleteMs || 0) + durationMs;
  } else {
    diagnostics.timings.cacheGetMs = (diagnostics.timings.cacheGetMs || 0) + durationMs;
  }

  diagnostics.timings.lockWaitMs = (diagnostics.timings.lockWaitMs || 0) + lockWaitMs;
  diagnostics.cache.lockContention = (diagnostics.cache.lockContention || 0) + lockContention;
  diagnostics.cache.backend = astRagNormalizeString(operationMeta.backend, diagnostics.cache.backend);
  diagnostics.cache.namespace = astRagNormalizeString(operationMeta.namespace, diagnostics.cache.namespace);
  diagnostics.cache.lockScope = astRagNormalizeString(operationMeta.lockScope, diagnostics.cache.lockScope);
  if (!diagnostics.cache.hitPath && operationMeta.hit && operationMeta.path) {
    diagnostics.cache.hitPath = operationMeta.path;
  }
}

function astRagBuildRetrievalTimeoutErrorShared(timeoutMs, stage, startedAtMs) {
  return new AstRagRetrievalError('RAG retrieval exceeded maxRetrievalMs budget', {
    timedOut: true,
    timeoutMs,
    timeoutStage: astRagNormalizeString(stage, 'retrieval'),
    elapsedMs: Math.max(0, astRagPipelineNowMs() - startedAtMs)
  });
}

function astRagMarkRetrievalTimeoutDiagnosticsShared(diagnostics, timeoutMs, stage) {
  if (!astRagIsPlainObject(diagnostics) || !astRagIsPlainObject(diagnostics.retrieval)) {
    return;
  }

  diagnostics.retrieval.timedOut = true;
  diagnostics.retrieval.timeoutMs = timeoutMs;
  diagnostics.retrieval.timeoutStage = astRagNormalizeString(stage, 'retrieval');
}

function astRagAssertRetrievalWithinBudgetShared(timeoutMs, startedAtMs, stage, diagnostics = null) {
  if (!(typeof timeoutMs === 'number' && isFinite(timeoutMs) && timeoutMs > 0)) {
    return;
  }

  const elapsedMs = Math.max(0, astRagPipelineNowMs() - startedAtMs);
  if (elapsedMs <= timeoutMs) {
    return;
  }

  astRagMarkRetrievalTimeoutDiagnosticsShared(diagnostics, timeoutMs, stage);
  throw astRagBuildRetrievalTimeoutErrorShared(timeoutMs, stage, startedAtMs);
}
