const AST_TELEMETRY_REDACTED_TOKEN = '[REDACTED]';
const AST_TELEMETRY_SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie|service[_-]?account|private[_-]?key)/i;
const AST_TELEMETRY_MAX_REDACTION_DEPTH = 8;

function astTelemetryShouldRedactKey(key) {
  const normalized = astTelemetryNormalizeString(String(key || ''), '');
  if (!normalized) {
    return false;
  }

  return AST_TELEMETRY_SENSITIVE_KEY_PATTERN.test(normalized);
}

function astTelemetryRedactString(value) {
  const normalized = String(value);
  if (/^bearer\s+/i.test(normalized)) {
    return 'Bearer [REDACTED]';
  }

  if (/AIza[0-9A-Za-z\-_]{10,}/.test(normalized)) {
    return normalized.replace(/AIza[0-9A-Za-z\-_]{10,}/g, AST_TELEMETRY_REDACTED_TOKEN);
  }

  return normalized;
}

function astTelemetrySanitizePrimitive(value, options = {}) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value === 'symbol') {
    return String(value);
  }

  if (typeof value === 'string' && astTelemetryNormalizeBoolean(options.redactSecrets, true)) {
    return astTelemetryRedactString(value);
  }

  return value;
}

function astTelemetryRedactValue(value, options = {}, path = [], depth = 0, seen = null) {
  const maxDepth = astTelemetryNormalizeNumber(
    options.maxDepth,
    AST_TELEMETRY_MAX_REDACTION_DEPTH,
    1,
    50
  );

  if (value == null || typeof value !== 'object') {
    return astTelemetrySanitizePrimitive(value, options);
  }

  if (depth >= maxDepth) {
    return '[DepthLimit]';
  }

  const visited = seen || new WeakSet();
  if (visited.has(value)) {
    return '[Circular]';
  }
  visited.add(value);

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      return astTelemetryRedactValue(item, options, path.concat(String(index)), depth + 1, visited);
    });
  }

  const output = {};
  const keys = Object.keys(value);

  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const itemPath = path.concat(key);
    const shouldRedact = astTelemetryNormalizeBoolean(options.redactSecrets, true)
      && astTelemetryShouldRedactKey(key);

    if (shouldRedact) {
      output[key] = AST_TELEMETRY_REDACTED_TOKEN;
      continue;
    }

    output[key] = astTelemetryRedactValue(value[key], options, itemPath, depth + 1, visited);
  }

  return output;
}

function astTelemetryNormalizeError(error, options = {}) {
  if (!error) {
    return null;
  }

  const serialized = {
    name: astTelemetryNormalizeString(error.name, 'Error'),
    message: astTelemetryNormalizeString(error.message, 'Unknown error')
  };

  if (astTelemetryIsPlainObject(error.details)) {
    serialized.details = astTelemetryRedactValue(error.details, options);
  } else {
    serialized.details = {};
  }

  if (typeof error.stack === 'string' && error.stack.length > 0) {
    serialized.stack = error.stack;
  }

  return serialized;
}

const __astTelemetryRedactionRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryRedactionRoot.AST_TELEMETRY_REDACTED_TOKEN = AST_TELEMETRY_REDACTED_TOKEN;
__astTelemetryRedactionRoot.astTelemetryShouldRedactKey = astTelemetryShouldRedactKey;
__astTelemetryRedactionRoot.astTelemetryRedactValue = astTelemetryRedactValue;
__astTelemetryRedactionRoot.astTelemetryNormalizeError = astTelemetryNormalizeError;
this.AST_TELEMETRY_REDACTED_TOKEN = AST_TELEMETRY_REDACTED_TOKEN;
this.astTelemetryShouldRedactKey = astTelemetryShouldRedactKey;
this.astTelemetryRedactValue = astTelemetryRedactValue;
this.astTelemetryNormalizeError = astTelemetryNormalizeError;
