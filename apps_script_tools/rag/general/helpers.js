function astRagIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astRagCloneObject(value) {
  return Object.assign({}, value || {});
}

function astRagNormalizeString(value, fallback = null) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
}

function astRagNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function astRagNormalizePositiveInt(value, fallback, minValue = 1) {
  if (typeof value === 'number' && isFinite(value)) {
    const rounded = Math.floor(value);
    if (rounded >= minValue) {
      return rounded;
    }
  }

  if (typeof value === 'string' && value.trim().length > 0 && !isNaN(Number(value))) {
    const rounded = Math.floor(Number(value));
    if (rounded >= minValue) {
      return rounded;
    }
  }

  return fallback;
}

function astRagStableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(astRagStableStringify).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${astRagStableStringify(value[key])}`).join(',')}}`;
}

function astRagSafeJsonParse(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function astRagNowIsoString() {
  return new Date().toISOString();
}

function astRagUniqueId(prefix = 'id') {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${new Date().getTime()}_${randomPart}`;
}

function astRagBuildIndexVersion() {
  return `idxv_${new Date().getTime()}_${Math.floor(Math.random() * 1000000)}`;
}

function astRagTruncate(text, maxChars) {
  if (typeof text !== 'string') {
    return '';
  }

  if (!Number.isInteger(maxChars) || maxChars < 0 || text.length <= maxChars) {
    return text;
  }

  return text.slice(0, maxChars);
}

function astRagToScriptPropertiesSnapshot(allowedKeys, options = {}) {
  const forceRefresh = Boolean(options && options.forceRefresh);

  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized({
      keys: Array.isArray(allowedKeys) ? allowedKeys : [],
      forceRefresh,
      cacheDefaultHandle: true
    });
  }

  const output = {};
  const keys = Array.isArray(allowedKeys) ? allowedKeys : [];

  try {
    if (
      typeof PropertiesService !== 'undefined' &&
      PropertiesService &&
      typeof PropertiesService.getScriptProperties === 'function'
    ) {
      const scriptProperties = PropertiesService.getScriptProperties();
      let map = {};

      if (scriptProperties && typeof scriptProperties.getProperties === 'function') {
        map = scriptProperties.getProperties() || {};
      }

      keys.forEach(key => {
        if (typeof map[key] === 'string' && map[key].trim().length > 0) {
          output[key] = map[key].trim();
          return;
        }

        if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
          const value = scriptProperties.getProperty(key);
          if (typeof value === 'string' && value.trim().length > 0) {
            output[key] = value.trim();
          }
        }
      });
    }
  } catch (_error) {
    // Intentionally ignore script property access failures.
  }

  return output;
}

function astRagTelemetryStartSpan(name, context = {}) {
  if (typeof astTelemetryStartSpanSafe !== 'function') {
    return null;
  }

  return astTelemetryStartSpanSafe(name, context);
}

function astRagTelemetryEndSpan(spanId, result = {}, error = null) {
  if (!spanId || typeof astTelemetryEndSpanSafe !== 'function') {
    return;
  }

  if (error) {
    astTelemetryEndSpanSafe(spanId, {
      status: 'error',
      error,
      result
    });
    return;
  }

  astTelemetryEndSpanSafe(spanId, {
    status: 'ok',
    result
  });
}
