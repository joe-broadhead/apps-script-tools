const AST_TELEMETRY_DEFAULT_CONFIG = Object.freeze({
  sink: 'logger',
  redactSecrets: true,
  sampleRate: 1,
  driveFolderId: '',
  driveFileName: 'ast-telemetry.ndjson',
  storageUri: '',
  storageAuth: null,
  storageProviderOptions: null,
  flushMode: 'threshold',
  batchMaxEvents: 25,
  batchMaxBytes: 65536,
  partitionByHour: true,
  storageTimeoutMs: 45000,
  storageRetries: 2,
  lockTimeoutMs: 30000,
  maxTraceCount: 200,
  maxSpansPerTrace: 200
});

let AST_TELEMETRY_RUNTIME_CONFIG = {};
let AST_TELEMETRY_TRACES = {};
let AST_TELEMETRY_TRACE_ORDER = [];
let AST_TELEMETRY_SPAN_INDEX = {};

function astTelemetryNormalizeSink(value) {
  const normalized = astTelemetryNormalizeString(value, AST_TELEMETRY_DEFAULT_CONFIG.sink);
  if (normalized === 'logger' || normalized === 'drive_json' || normalized === 'storage_json') {
    return normalized;
  }

  return AST_TELEMETRY_DEFAULT_CONFIG.sink;
}

function astTelemetryNormalizeConfig(config = {}) {
  if (!astTelemetryIsPlainObject(config)) {
    throw new AstTelemetryValidationError('Telemetry config must be an object');
  }

  const output = {};

  if (typeof config.sink !== 'undefined') {
    output.sink = astTelemetryNormalizeSink(config.sink);
  }

  if (typeof config.redactSecrets !== 'undefined') {
    output.redactSecrets = astTelemetryNormalizeBoolean(
      config.redactSecrets,
      AST_TELEMETRY_DEFAULT_CONFIG.redactSecrets
    );
  }

  if (typeof config.sampleRate !== 'undefined') {
    output.sampleRate = astTelemetryNormalizeNumber(
      config.sampleRate,
      AST_TELEMETRY_DEFAULT_CONFIG.sampleRate,
      0,
      1
    );
  }

  if (typeof config.driveFolderId !== 'undefined') {
    output.driveFolderId = astTelemetryNormalizeString(config.driveFolderId, '');
  }

  if (typeof config.driveFileName !== 'undefined') {
    output.driveFileName = astTelemetryNormalizeString(
      config.driveFileName,
      AST_TELEMETRY_DEFAULT_CONFIG.driveFileName
    );
  }

  if (typeof config.storageUri !== 'undefined') {
    output.storageUri = astTelemetryNormalizeString(config.storageUri, '');
  }

  if (typeof config.storageAuth !== 'undefined') {
    output.storageAuth = astTelemetryIsPlainObject(config.storageAuth)
      ? astTelemetryDeepClone(config.storageAuth)
      : null;
  }

  if (typeof config.storageProviderOptions !== 'undefined') {
    output.storageProviderOptions = astTelemetryIsPlainObject(config.storageProviderOptions)
      ? astTelemetryDeepClone(config.storageProviderOptions)
      : null;
  }

  if (typeof config.flushMode !== 'undefined') {
    const flushMode = astTelemetryNormalizeString(config.flushMode, AST_TELEMETRY_DEFAULT_CONFIG.flushMode);
    if (!['immediate', 'threshold', 'manual'].includes(flushMode)) {
      throw new AstTelemetryValidationError(
        'Telemetry flushMode must be one of: immediate, threshold, manual',
        { flushMode }
      );
    }
    output.flushMode = flushMode;
  }

  if (typeof config.batchMaxEvents !== 'undefined') {
    output.batchMaxEvents = astTelemetryNormalizeNumber(config.batchMaxEvents, AST_TELEMETRY_DEFAULT_CONFIG.batchMaxEvents, 1, 10000);
  }

  if (typeof config.batchMaxBytes !== 'undefined') {
    output.batchMaxBytes = astTelemetryNormalizeNumber(config.batchMaxBytes, AST_TELEMETRY_DEFAULT_CONFIG.batchMaxBytes, 512, 5 * 1024 * 1024);
  }

  if (typeof config.partitionByHour !== 'undefined') {
    output.partitionByHour = astTelemetryNormalizeBoolean(
      config.partitionByHour,
      AST_TELEMETRY_DEFAULT_CONFIG.partitionByHour
    );
  }

  if (typeof config.storageTimeoutMs !== 'undefined') {
    output.storageTimeoutMs = astTelemetryNormalizeNumber(config.storageTimeoutMs, AST_TELEMETRY_DEFAULT_CONFIG.storageTimeoutMs, 1, 300000);
  }

  if (typeof config.storageRetries !== 'undefined') {
    output.storageRetries = astTelemetryNormalizeNumber(config.storageRetries, AST_TELEMETRY_DEFAULT_CONFIG.storageRetries, 0, 10);
  }

  if (typeof config.lockTimeoutMs !== 'undefined') {
    output.lockTimeoutMs = astTelemetryNormalizeNumber(config.lockTimeoutMs, AST_TELEMETRY_DEFAULT_CONFIG.lockTimeoutMs, 1, 300000);
  }

  if (typeof config.maxTraceCount !== 'undefined') {
    output.maxTraceCount = astTelemetryNormalizeNumber(
      config.maxTraceCount,
      AST_TELEMETRY_DEFAULT_CONFIG.maxTraceCount,
      10,
      10000
    );
  }

  if (typeof config.maxSpansPerTrace !== 'undefined') {
    output.maxSpansPerTrace = astTelemetryNormalizeNumber(
      config.maxSpansPerTrace,
      AST_TELEMETRY_DEFAULT_CONFIG.maxSpansPerTrace,
      10,
      10000
    );
  }

  return output;
}

function astTelemetryGetRuntimeConfig() {
  return astTelemetryDeepClone(AST_TELEMETRY_RUNTIME_CONFIG);
}

function astTelemetrySetRuntimeConfig(config = {}, options = {}) {
  const normalized = astTelemetryNormalizeConfig(config);
  if (!astTelemetryIsPlainObject(options)) {
    throw new AstTelemetryValidationError('Telemetry configure options must be an object');
  }

  const merge = options.merge !== false;
  const next = merge ? astTelemetryGetRuntimeConfig() : {};

  Object.keys(normalized).forEach(key => {
    next[key] = normalized[key];
  });

  AST_TELEMETRY_RUNTIME_CONFIG = next;
  return astTelemetryGetRuntimeConfig();
}

function astTelemetryClearRuntimeConfig() {
  AST_TELEMETRY_RUNTIME_CONFIG = {};
  return {};
}

function astTelemetryGetResolvedConfig(overrides = {}) {
  const runtimeConfig = astTelemetryGetRuntimeConfig();
  const normalizedOverrides = astTelemetryTryOrFallback(
    () => astTelemetryNormalizeConfig(overrides),
    {}
  );

  return Object.assign({}, AST_TELEMETRY_DEFAULT_CONFIG, runtimeConfig, normalizedOverrides);
}

function astTelemetryEmitRecord(record, config) {
  const sink = astTelemetryNormalizeSink(config.sink);

  try {
    if (sink === 'drive_json') {
      astTelemetrySinkDriveJson(record, config);
      return;
    }

    if (sink === 'storage_json') {
      astTelemetrySinkStorageJson(record, config);
      return;
    }

    astTelemetrySinkLogger(record, config);
  } catch (_error) {
    // Telemetry should never block runtime behavior.
  }
}

function astTelemetryFlush(options = {}) {
  if (!astTelemetryIsPlainObject(options)) {
    throw new AstTelemetryValidationError('Telemetry flush options must be an object');
  }

  const config = astTelemetryGetResolvedConfig(options.config || {});
  const sink = astTelemetryNormalizeSink(config.sink);

  try {
    if (sink === 'drive_json' && typeof astTelemetryFlushDriveJson === 'function') {
      return astTelemetryFlushDriveJson(config, options);
    }

    if (sink === 'storage_json' && typeof astTelemetryFlushStorageJson === 'function') {
      return astTelemetryFlushStorageJson(config, options);
    }
  } catch (_error) {
    // Telemetry flushing is best-effort.
  }

  return {
    flushed: 0,
    pending: 0,
    bytes: 0,
    uri: null
  };
}

function astTelemetryTrimTraceStore(config) {
  const maxTraceCount = astTelemetryNormalizeNumber(
    config.maxTraceCount,
    AST_TELEMETRY_DEFAULT_CONFIG.maxTraceCount,
    10,
    10000
  );

  while (AST_TELEMETRY_TRACE_ORDER.length > maxTraceCount) {
    let evictionIndex = -1;

    for (let idx = 0; idx < AST_TELEMETRY_TRACE_ORDER.length; idx += 1) {
      const traceId = AST_TELEMETRY_TRACE_ORDER[idx];
      const trace = AST_TELEMETRY_TRACES[traceId];
      const hasRunningSpans = trace
        && Array.isArray(trace.spans)
        && trace.spans.some(span => span && span.status === 'running');

      if (!hasRunningSpans) {
        evictionIndex = idx;
        break;
      }
    }

    if (evictionIndex === -1) {
      // Keep active traces so endSpan can complete and emit final records.
      break;
    }

    const traceIdToEvict = AST_TELEMETRY_TRACE_ORDER.splice(evictionIndex, 1)[0];
    const traceToEvict = AST_TELEMETRY_TRACES[traceIdToEvict];
    if (traceToEvict && Array.isArray(traceToEvict.spans)) {
      for (let idx = 0; idx < traceToEvict.spans.length; idx += 1) {
        delete AST_TELEMETRY_SPAN_INDEX[traceToEvict.spans[idx].spanId];
      }
    }
    delete AST_TELEMETRY_TRACES[traceIdToEvict];
  }
}

function astTelemetryGetOrCreateTrace(traceId, nowIso) {
  let trace = AST_TELEMETRY_TRACES[traceId];
  if (trace) {
    return trace;
  }

  trace = {
    traceId,
    status: 'running',
    startedAt: nowIso,
    updatedAt: nowIso,
    endedAt: null,
    spans: [],
    events: []
  };

  AST_TELEMETRY_TRACES[traceId] = trace;
  AST_TELEMETRY_TRACE_ORDER.push(traceId);
  return trace;
}

function astTelemetryGetSpanById(spanId) {
  const normalizedSpanId = astTelemetryNormalizeString(spanId, null);
  if (!normalizedSpanId) {
    return null;
  }

  const location = AST_TELEMETRY_SPAN_INDEX[normalizedSpanId];
  if (!location) {
    return null;
  }

  const trace = AST_TELEMETRY_TRACES[location.traceId];
  if (!trace || !Array.isArray(trace.spans)) {
    return null;
  }

  const span = trace.spans[location.spanIndex];
  if (!span || span.spanId !== normalizedSpanId) {
    return null;
  }

  return {
    trace,
    span
  };
}

function astTelemetryDeriveTraceStatus(trace) {
  if (!trace || !Array.isArray(trace.spans)) {
    return 'unknown';
  }

  if (trace.spans.some(span => span.status === 'running')) {
    return 'running';
  }

  if (trace.spans.some(span => span.status === 'error')) {
    return 'error';
  }

  if (trace.spans.length === 0) {
    return 'ok';
  }

  return 'ok';
}

function astTelemetryStartSpan(name, context = {}, options = {}) {
  const spanName = astTelemetryNormalizeString(name, null);
  if (!spanName) {
    throw new AstTelemetryValidationError('Telemetry span name is required');
  }

  if (!astTelemetryIsPlainObject(context)) {
    throw new AstTelemetryValidationError('Telemetry span context must be an object');
  }

  if (!astTelemetryIsPlainObject(options)) {
    throw new AstTelemetryValidationError('Telemetry start options must be an object');
  }

  const config = astTelemetryGetResolvedConfig(options.config || {});
  const nowIso = astTelemetryNowIsoString();
  const traceId = astTelemetryNormalizeString(context.traceId, null) || astTelemetryGenerateId('trace');
  const spanId = astTelemetryGenerateId('span');
  const sampled = Math.random() <= config.sampleRate;
  const trace = astTelemetryGetOrCreateTrace(traceId, nowIso);
  const parentSpanId = astTelemetryNormalizeString(context.parentSpanId, null);

  const span = {
    spanId,
    traceId,
    parentSpanId,
    name: spanName,
    sampled,
    status: 'running',
    startedAt: nowIso,
    endedAt: null,
    durationMs: null,
    context: astTelemetryRedactValue(context, config),
    result: null,
    error: null
  };

  trace.spans.push(span);
  trace.updatedAt = nowIso;
  trace.status = astTelemetryDeriveTraceStatus(trace);
  AST_TELEMETRY_SPAN_INDEX[spanId] = {
    traceId,
    spanIndex: trace.spans.length - 1
  };

  const maxSpansPerTrace = astTelemetryNormalizeNumber(
    config.maxSpansPerTrace,
    AST_TELEMETRY_DEFAULT_CONFIG.maxSpansPerTrace,
    10,
    10000
  );
  if (trace.spans.length > maxSpansPerTrace) {
    trace.status = 'error';
    span.status = 'error';
    span.error = {
      name: 'AstTelemetryError',
      message: 'maxSpansPerTrace exceeded',
      details: {
        maxSpansPerTrace
      }
    };
  }

  astTelemetryTrimTraceStore(config);
  return spanId;
}

function astTelemetryEndSpan(spanId, result = {}, options = {}) {
  if (!astTelemetryIsPlainObject(options)) {
    throw new AstTelemetryValidationError('Telemetry end options must be an object');
  }

  const resolved = astTelemetryGetSpanById(spanId);
  if (!resolved) {
    return null;
  }

  const config = astTelemetryGetResolvedConfig(options.config || {});
  const nowIso = astTelemetryNowIsoString();
  const span = resolved.span;
  const trace = resolved.trace;

  if (span.status !== 'running') {
    return astTelemetryDeepClone(span);
  }

  const normalizedResult = astTelemetryIsPlainObject(result) ? result : { value: result };
  const status = astTelemetryNormalizeString(
    normalizedResult.status,
    normalizedResult.error ? 'error' : 'ok'
  );

  span.status = status === 'error' ? 'error' : 'ok';
  span.endedAt = nowIso;
  span.durationMs = astTelemetryTryOrFallback(() => {
    return new Date(span.endedAt).getTime() - new Date(span.startedAt).getTime();
  }, null);
  span.result = astTelemetryRedactValue(normalizedResult, config);
  span.error = normalizedResult.error
    ? astTelemetryNormalizeError(normalizedResult.error, config)
    : null;

  trace.updatedAt = nowIso;
  trace.status = astTelemetryDeriveTraceStatus(trace);
  if (trace.status !== 'running') {
    trace.endedAt = nowIso;
  }

  astTelemetryTrimTraceStore(config);

  if (span.sampled) {
    astTelemetryEmitRecord({
      type: 'span_end',
      traceId: span.traceId,
      spanId: span.spanId,
      timestamp: nowIso,
      span: astTelemetryDeepClone(span)
    }, config);
  }

  return astTelemetryDeepClone(span);
}

function astTelemetryRecordEvent(event = {}, options = {}) {
  if (!astTelemetryIsPlainObject(event)) {
    throw new AstTelemetryValidationError('Telemetry event must be an object');
  }

  if (!astTelemetryIsPlainObject(options)) {
    throw new AstTelemetryValidationError('Telemetry recordEvent options must be an object');
  }

  const config = astTelemetryGetResolvedConfig(options.config || {});
  const nowIso = astTelemetryNowIsoString();
  const traceId = astTelemetryNormalizeString(event.traceId, null);
  const spanId = astTelemetryNormalizeString(event.spanId, null);

  const normalizedEvent = {
    eventId: astTelemetryGenerateId('event'),
    traceId,
    spanId,
    name: astTelemetryNormalizeString(event.name, 'event'),
    level: astTelemetryNormalizeString(event.level, 'info'),
    timestamp: nowIso,
    payload: astTelemetryRedactValue(
      astTelemetryIsPlainObject(event.payload) ? event.payload : { value: event.payload },
      config
    )
  };

  if (traceId && AST_TELEMETRY_TRACES[traceId]) {
    AST_TELEMETRY_TRACES[traceId].events.push(normalizedEvent);
    AST_TELEMETRY_TRACES[traceId].updatedAt = nowIso;
  }

  astTelemetryEmitRecord({
    type: 'event',
    timestamp: nowIso,
    event: normalizedEvent
  }, config);

  return astTelemetryDeepClone(normalizedEvent);
}

function astTelemetryGetTrace(traceId) {
  const normalizedTraceId = astTelemetryNormalizeString(traceId, null);
  if (!normalizedTraceId) {
    throw new AstTelemetryValidationError('Telemetry traceId is required');
  }

  const trace = AST_TELEMETRY_TRACES[normalizedTraceId];
  if (!trace) {
    return null;
  }

  return astTelemetryDeepClone(trace);
}

function astTelemetryResetStore() {
  AST_TELEMETRY_TRACES = {};
  AST_TELEMETRY_TRACE_ORDER = [];
  AST_TELEMETRY_SPAN_INDEX = {};

  if (typeof astTelemetryResetDriveSinkBuffers === 'function') {
    astTelemetryResetDriveSinkBuffers();
  }

  if (typeof astTelemetryResetStorageSinkBuffers === 'function') {
    astTelemetryResetStorageSinkBuffers();
  }
}

function astTelemetryStartSpanSafe(name, context = {}, options = {}) {
  return astTelemetryTryOrFallback(
    () => astTelemetryStartSpan(name, context, options),
    null
  );
}

function astTelemetryEndSpanSafe(spanId, result = {}, options = {}) {
  if (!spanId) {
    return null;
  }

  return astTelemetryTryOrFallback(
    () => astTelemetryEndSpan(spanId, result, options),
    null
  );
}

function astTelemetryRecordEventSafe(event = {}, options = {}) {
  return astTelemetryTryOrFallback(
    () => astTelemetryRecordEvent(event, options),
    null
  );
}

const __astTelemetrySpanStoreRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetrySpanStoreRoot.AST_TELEMETRY_DEFAULT_CONFIG = AST_TELEMETRY_DEFAULT_CONFIG;
__astTelemetrySpanStoreRoot.astTelemetryGetRuntimeConfig = astTelemetryGetRuntimeConfig;
__astTelemetrySpanStoreRoot.astTelemetrySetRuntimeConfig = astTelemetrySetRuntimeConfig;
__astTelemetrySpanStoreRoot.astTelemetryClearRuntimeConfig = astTelemetryClearRuntimeConfig;
__astTelemetrySpanStoreRoot.astTelemetryGetResolvedConfig = astTelemetryGetResolvedConfig;
__astTelemetrySpanStoreRoot.astTelemetryStartSpan = astTelemetryStartSpan;
__astTelemetrySpanStoreRoot.astTelemetryEndSpan = astTelemetryEndSpan;
__astTelemetrySpanStoreRoot.astTelemetryRecordEvent = astTelemetryRecordEvent;
__astTelemetrySpanStoreRoot.astTelemetryGetTrace = astTelemetryGetTrace;
__astTelemetrySpanStoreRoot.astTelemetryFlush = astTelemetryFlush;
__astTelemetrySpanStoreRoot.astTelemetryResetStore = astTelemetryResetStore;
__astTelemetrySpanStoreRoot.astTelemetryStartSpanSafe = astTelemetryStartSpanSafe;
__astTelemetrySpanStoreRoot.astTelemetryEndSpanSafe = astTelemetryEndSpanSafe;
__astTelemetrySpanStoreRoot.astTelemetryRecordEventSafe = astTelemetryRecordEventSafe;
this.AST_TELEMETRY_DEFAULT_CONFIG = AST_TELEMETRY_DEFAULT_CONFIG;
this.astTelemetryGetRuntimeConfig = astTelemetryGetRuntimeConfig;
this.astTelemetrySetRuntimeConfig = astTelemetrySetRuntimeConfig;
this.astTelemetryClearRuntimeConfig = astTelemetryClearRuntimeConfig;
this.astTelemetryGetResolvedConfig = astTelemetryGetResolvedConfig;
this.astTelemetryStartSpan = astTelemetryStartSpan;
this.astTelemetryEndSpan = astTelemetryEndSpan;
this.astTelemetryRecordEvent = astTelemetryRecordEvent;
this.astTelemetryGetTrace = astTelemetryGetTrace;
this.astTelemetryFlush = astTelemetryFlush;
this.astTelemetryResetStore = astTelemetryResetStore;
this.astTelemetryStartSpanSafe = astTelemetryStartSpanSafe;
this.astTelemetryEndSpanSafe = astTelemetryEndSpanSafe;
this.astTelemetryRecordEventSafe = astTelemetryRecordEventSafe;
