function astTelemetryIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astTelemetryNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astTelemetryNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function astTelemetryNormalizeNumber(value, fallback, min = -Infinity, max = Infinity) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }

  if (normalized < min) {
    return fallback;
  }

  return Math.min(normalized, max);
}

function astTelemetryNowIsoString() {
  return new Date().toISOString();
}

function astTelemetryGenerateId(prefix = 'telemetry') {
  const safePrefix = astTelemetryNormalizeString(prefix, 'telemetry');
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${safePrefix}_${new Date().getTime()}_${randomPart}`;
}

function astTelemetryDeepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function astTelemetryTryOrFallback(task, fallback = null) {
  try {
    return task();
  } catch (error) {
    return fallback;
  }
}

const __astTelemetryHelpersRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryHelpersRoot.astTelemetryIsPlainObject = astTelemetryIsPlainObject;
__astTelemetryHelpersRoot.astTelemetryNormalizeString = astTelemetryNormalizeString;
__astTelemetryHelpersRoot.astTelemetryNormalizeBoolean = astTelemetryNormalizeBoolean;
__astTelemetryHelpersRoot.astTelemetryNormalizeNumber = astTelemetryNormalizeNumber;
__astTelemetryHelpersRoot.astTelemetryNowIsoString = astTelemetryNowIsoString;
__astTelemetryHelpersRoot.astTelemetryGenerateId = astTelemetryGenerateId;
__astTelemetryHelpersRoot.astTelemetryDeepClone = astTelemetryDeepClone;
__astTelemetryHelpersRoot.astTelemetryTryOrFallback = astTelemetryTryOrFallback;
this.astTelemetryIsPlainObject = astTelemetryIsPlainObject;
this.astTelemetryNormalizeString = astTelemetryNormalizeString;
this.astTelemetryNormalizeBoolean = astTelemetryNormalizeBoolean;
this.astTelemetryNormalizeNumber = astTelemetryNormalizeNumber;
this.astTelemetryNowIsoString = astTelemetryNowIsoString;
this.astTelemetryGenerateId = astTelemetryGenerateId;
this.astTelemetryDeepClone = astTelemetryDeepClone;
this.astTelemetryTryOrFallback = astTelemetryTryOrFallback;
