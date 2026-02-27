const AST_CONFIG_VALIDATION_ERROR_CLASS_NORMALIZATION = typeof AstConfigValidationError === 'function'
  ? AstConfigValidationError
  : class AstConfigValidationErrorFallback extends Error {
    constructor(message, details = {}, cause = null) {
      super(message);
      this.name = 'AstConfigValidationError';
      this.details = details;
      if (cause) {
        this.cause = cause;
      }
    }
  };

function astConfigIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astConfigIsLiteralObject(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const constructor = value.constructor;
  if (typeof constructor === 'undefined') {
    return true;
  }

  if (typeof constructor !== 'function') {
    return false;
  }

  return constructor === Object || constructor.name === 'Object';
}

function astConfigNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astConfigNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function astConfigNormalizeKeys(keys) {
  if (!Array.isArray(keys)) {
    return null;
  }

  const output = [];
  const seen = {};

  for (let idx = 0; idx < keys.length; idx += 1) {
    const normalized = astConfigNormalizeString(keys[idx], '');
    if (!normalized || seen[normalized]) {
      continue;
    }

    seen[normalized] = true;
    output.push(normalized);
  }

  return output;
}

function astConfigNormalizeValue(value, includeEmpty = false) {
  if (value == null) {
    return includeEmpty ? '' : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }

    return includeEmpty ? '' : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function astConfigResolveFirstString(candidates = [], fallback = null) {
  if (!Array.isArray(candidates)) {
    return fallback;
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    if (typeof candidates[idx] !== 'string') {
      continue;
    }

    const normalized = astConfigNormalizeString(candidates[idx], '');
    if (normalized) {
      return normalized;
    }
  }

  return fallback;
}

function astConfigResolveFirstBoolean(candidates = [], fallback = false) {
  if (!Array.isArray(candidates)) {
    return fallback;
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const value = candidates[idx];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      continue;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    }
  }

  return fallback;
}

function astConfigResolveFirstInteger(candidates = [], options = {}) {
  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback')
    ? options.fallback
    : null;
  const min = Number.isInteger(options.min) ? options.min : 1;
  const max = Number.isInteger(options.max) ? options.max : null;
  const onInvalid = typeof options.onInvalid === 'function' ? options.onInvalid : null;
  const strict = options.strict !== false;

  if (!Array.isArray(candidates)) {
    return fallback;
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const value = candidates[idx];
    if (value == null || value === '') {
      continue;
    }

    if (typeof value === 'boolean') {
      if (onInvalid) {
        onInvalid(value, { min, max });
      }
      if (strict) {
        throw new AST_CONFIG_VALIDATION_ERROR_CLASS_NORMALIZATION('Expected integer configuration value', {
          value,
          min,
          max
        });
      }
      continue;
    }

    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < min || (max != null && numeric > max)) {
      if (onInvalid) {
        onInvalid(value, { min, max });
      }
      if (strict) {
        throw new AST_CONFIG_VALIDATION_ERROR_CLASS_NORMALIZATION('Expected integer configuration value', {
          value,
          min,
          max
        });
      }
      continue;
    }

    return numeric;
  }

  return fallback;
}

function astConfigMergeNormalizedConfig(baseConfig = {}, incomingConfig = {}, options = {}) {
  if (!astConfigIsPlainObject(baseConfig)) {
    throw new AST_CONFIG_VALIDATION_ERROR_CLASS_NORMALIZATION('Base runtime config must be an object');
  }

  if (!astConfigIsPlainObject(incomingConfig)) {
    throw new AST_CONFIG_VALIDATION_ERROR_CLASS_NORMALIZATION('Incoming runtime config must be an object');
  }

  const merge = options.merge !== false;
  const next = merge ? astConfigCloneEntries(baseConfig) : {};
  const keys = Object.keys(incomingConfig);

  for (let idx = 0; idx < keys.length; idx += 1) {
    const sourceKey = keys[idx];
    const normalizedKey = astConfigNormalizeString(sourceKey, '');
    if (!normalizedKey) {
      continue;
    }

    const normalizedValue = astConfigNormalizeValue(incomingConfig[sourceKey], false);
    if (normalizedValue == null) {
      delete next[normalizedKey];
      continue;
    }

    next[normalizedKey] = normalizedValue;
  }

  return next;
}

function astConfigParseJsonSafe(text, fallback = null) {
  if (typeof text !== 'string' || text.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return fallback;
  }
}

function astConfigSleep(milliseconds) {
  const ms = Math.max(0, Math.floor(milliseconds || 0));
  if (ms === 0) {
    return;
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.sleep === 'function') {
    Utilities.sleep(ms);
  }
}

function astConfigNormalizeTimeoutMs(value) {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(numeric));
}

function astConfigElapsedMs(startedAtMs) {
  return Math.max(0, Date.now() - startedAtMs);
}

function astConfigRemainingMs(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return null;
  }
  return Math.max(0, timeoutMs - astConfigElapsedMs(startedAtMs));
}

function astConfigTimedOut(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return false;
  }
  return astConfigElapsedMs(startedAtMs) >= timeoutMs;
}

function astConfigIsTransientHttpStatus(statusCode) {
  const code = Number(statusCode);
  return code === 429 || code >= 500;
}
