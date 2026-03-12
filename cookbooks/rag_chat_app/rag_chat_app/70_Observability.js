function opsMetricsCacheKey_() {
  return 'ops_metrics_rollup';
}

function getOpsMetrics_(ASTX, cfg) {
  var current = runRuntimeCacheGet_(ASTX, cfg, opsMetricsCacheKey_(), 'ops');
  if (!current || typeof current !== 'object') {
    return {
      totals: {
        chatRequests: 0,
        chatFailures: 0,
        chatCachedResponses: 0,
        indexMutations: 0
      },
      latencyMs: {
        chatCount: 0,
        chatTotal: 0,
        chatMax: 0,
        chatAvg: 0
      },
      recentEvents: [],
      updatedAt: nowIso_()
    };
  }
  return current;
}

function saveOpsMetrics_(ASTX, cfg, metrics) {
  if (!metrics || typeof metrics !== 'object') return;
  var ttlSec = Math.max(60, integerOr_(
    cfg.runtime && cfg.runtime.metricsTtlSec,
    RAG_CHAT_DEFAULTS.runtime.metricsTtlSec
  ));
  runRuntimeCacheSet_(ASTX, cfg, opsMetricsCacheKey_(), metrics, 'ops', ttlSec);
}

function appendOpsEvent_(metrics, cfg, eventName, details) {
  metrics = metrics || {};
  var runtime = cfg.runtime || RAG_CHAT_DEFAULTS.runtime;
  var maxEvents = Math.max(1, integerOr_(runtime.metricsMaxEvents, RAG_CHAT_DEFAULTS.runtime.metricsMaxEvents));
  var events = Array.isArray(metrics.recentEvents) ? metrics.recentEvents.slice() : [];

  events.push({
    name: stringOrEmpty_(eventName),
    at: nowIso_(),
    details: details || {}
  });

  if (events.length > maxEvents) {
    events = events.slice(events.length - maxEvents);
  }

  metrics.recentEvents = events;
  metrics.updatedAt = nowIso_();
  return metrics;
}

function recordChatMetric_(ASTX, cfg, entry) {
  var metrics = getOpsMetrics_(ASTX, cfg);
  metrics.totals = metrics.totals || {};
  metrics.latencyMs = metrics.latencyMs || {};

  metrics.totals.chatRequests = integerOr_(metrics.totals.chatRequests, 0) + 1;
  if (entry && entry.failed === true) {
    metrics.totals.chatFailures = integerOr_(metrics.totals.chatFailures, 0) + 1;
  }
  if (entry && entry.cached === true) {
    metrics.totals.chatCachedResponses = integerOr_(metrics.totals.chatCachedResponses, 0) + 1;
  }

  var elapsedMs = Math.max(0, integerOr_(entry && entry.totalMs, 0));
  metrics.latencyMs.chatCount = integerOr_(metrics.latencyMs.chatCount, 0) + 1;
  metrics.latencyMs.chatTotal = integerOr_(metrics.latencyMs.chatTotal, 0) + elapsedMs;
  metrics.latencyMs.chatMax = Math.max(integerOr_(metrics.latencyMs.chatMax, 0), elapsedMs);
  metrics.latencyMs.chatAvg = metrics.latencyMs.chatCount > 0
    ? Math.round(metrics.latencyMs.chatTotal / metrics.latencyMs.chatCount)
    : 0;

  appendOpsEvent_(metrics, cfg, 'chat', {
    failed: entry && entry.failed === true,
    mode: stringOrEmpty_(entry && entry.mode),
    path: stringOrEmpty_(entry && entry.path),
    cached: entry && entry.cached === true,
    status: stringOrEmpty_(entry && entry.status),
    totalMs: elapsedMs
  });
  saveOpsMetrics_(ASTX, cfg, metrics);
}

function recordIndexMutationMetric_(ASTX, cfg, entry) {
  var metrics = getOpsMetrics_(ASTX, cfg);
  metrics.totals = metrics.totals || {};
  metrics.totals.indexMutations = integerOr_(metrics.totals.indexMutations, 0) + 1;

  appendOpsEvent_(metrics, cfg, 'index_mutation', {
    mode: stringOrEmpty_(entry && entry.mode),
    indexFileId: stringOrEmpty_(entry && entry.indexFileId),
    sourceCount: integerOr_(entry && entry.sourceCount, null),
    chunkCount: integerOr_(entry && entry.chunkCount, null),
    failed: entry && entry.failed === true
  });
  saveOpsMetrics_(ASTX, cfg, metrics);
}

function getOpsStatusWeb(request) {
  request = request || {};
  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'ops status');
  assertWebAppAdmin_(cfg, actor, 'ops status');

  configureAstRuntime_(ASTX, cfg);

  var runtime = resolveRuntime_(request);
  var settings = resolveIndexSettings_(cfg, request);
  var indexInfo = null;
  if (settings.indexFileId) {
    try {
      indexInfo = inspectIndexWithCache_(ASTX, cfg, settings.indexFileId);
    } catch (_error) {
      indexInfo = null;
    }
  }

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    runtime: {
      generationProvider: runtime.generationProvider,
      embeddingProvider: runtime.embeddingProvider,
      modelFast: runtime.modelFast,
      modelDeep: runtime.modelDeep,
      embeddingModel: runtime.embeddingModel
    },
    index: {
      indexFileId: settings.indexFileId || '',
      info: indexInfo,
      job: getCurrentIndexJobState_(ASTX, cfg)
    },
    metrics: getOpsMetrics_(ASTX, cfg)
  };
}
