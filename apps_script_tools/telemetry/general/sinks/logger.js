function astTelemetrySinkLogger(record) {
  const payload = astTelemetryTryOrFallback(() => JSON.stringify(record), '{"error":"telemetry-serialize-failed"}');

  if (typeof Logger !== 'undefined' && Logger && typeof Logger.log === 'function') {
    Logger.log(payload);
    return;
  }

  if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
    console.log(payload);
  }
}

const __astTelemetrySinkLoggerRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetrySinkLoggerRoot.astTelemetrySinkLogger = astTelemetrySinkLogger;
this.astTelemetrySinkLogger = astTelemetrySinkLogger;
