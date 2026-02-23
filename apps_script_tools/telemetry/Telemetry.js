function astTelemetryApiConfigure(config = {}, options = {}) {
  return astTelemetrySetRuntimeConfig(config, options);
}

function astTelemetryApiGetConfig() {
  return astTelemetryGetRuntimeConfig();
}

function astTelemetryApiClearConfig() {
  return astTelemetryClearRuntimeConfig();
}

function astTelemetryApiStartSpan(name, context = {}, options = {}) {
  return astTelemetryStartSpan(name, context, options);
}

function astTelemetryApiEndSpan(spanId, result = {}, options = {}) {
  return astTelemetryEndSpan(spanId, result, options);
}

function astTelemetryApiRecordEvent(event = {}, options = {}) {
  return astTelemetryRecordEvent(event, options);
}

function astTelemetryApiGetTrace(traceId) {
  return astTelemetryGetTrace(traceId);
}

function astTelemetryApiFlush(options = {}) {
  return astTelemetryFlush(options);
}

function astTelemetryApiReset() {
  astTelemetryResetStore();
}

const AST_TELEMETRY = Object.freeze({
  configure: astTelemetryApiConfigure,
  getConfig: astTelemetryApiGetConfig,
  clearConfig: astTelemetryApiClearConfig,
  startSpan: astTelemetryApiStartSpan,
  endSpan: astTelemetryApiEndSpan,
  recordEvent: astTelemetryApiRecordEvent,
  getTrace: astTelemetryApiGetTrace,
  flush: astTelemetryApiFlush,
  _reset: astTelemetryApiReset
});
