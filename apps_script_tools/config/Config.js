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

    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < min || (max != null && numeric > max)) {
      if (onInvalid) {
        onInvalid(value, {
          min,
          max
        });
      }
      if (strict) {
        throw new Error('Expected integer configuration value');
      }
      continue;
    }

    return numeric;
  }

  return fallback;
}

function astConfigMergeNormalizedConfig(baseConfig = {}, incomingConfig = {}, options = {}) {
  if (!astConfigIsPlainObject(baseConfig)) {
    throw new Error('Base runtime config must be an object');
  }

  if (!astConfigIsPlainObject(incomingConfig)) {
    throw new Error('Incoming runtime config must be an object');
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

  if (!isFinite(value) || Number(value) <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(Number(value)));
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

function astConfigBuildHttpCoreError(code, message, details = {}, cause = null) {
  const error = new Error(message);
  error.name = 'AstConfigHttpCoreError';
  error.code = code;
  error.details = astConfigIsPlainObject(details) ? details : {};
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function astConfigHttpRequestWithRetryCore(config = {}) {
  if (!astConfigIsPlainObject(config)) {
    throw astConfigBuildHttpCoreError('validation', 'HTTP request config must be an object');
  }

  const url = astConfigNormalizeString(config.url, '');
  if (!url) {
    throw astConfigBuildHttpCoreError('validation', 'HTTP request requires a non-empty url');
  }

  if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw astConfigBuildHttpCoreError('unavailable', 'UrlFetchApp.fetch is not available in this runtime', {
      url
    });
  }

  const method = astConfigNormalizeString(config.method, 'post').toLowerCase();
  const retries = Number.isInteger(config.retries) ? Math.max(0, config.retries) : 0;
  const timeoutMs = astConfigNormalizeTimeoutMs(config.timeoutMs);
  const startedAtMs = Date.now();
  const isTransientStatus = typeof config.isTransientStatus === 'function'
    ? config.isTransientStatus
    : astConfigIsTransientHttpStatus;
  const parseJson = config.parseJson === false
    ? null
    : (typeof config.parseJson === 'function' ? config.parseJson : astConfigParseJsonSafe);
  const serializeJsonPayload = config.serializeJsonPayload !== false;

  let attempt = 0;
  let lastError = null;

  function buildTimeoutError(cause) {
    return astConfigBuildHttpCoreError(
      'timeout',
      `HTTP request exceeded timeout budget (${timeoutMs}ms)`,
      {
        url,
        timeoutMs,
        attempts: attempt + 1,
        elapsedMs: astConfigElapsedMs(startedAtMs)
      },
      cause
    );
  }

  function sleepWithTimeoutBudget(backoffMs) {
    if (!timeoutMs) {
      astConfigSleep(backoffMs);
      return;
    }

    const remainingMs = astConfigRemainingMs(startedAtMs, timeoutMs);
    if (remainingMs <= 0 || backoffMs >= remainingMs) {
      throw buildTimeoutError(lastError);
    }

    astConfigSleep(backoffMs);
  }

  while (attempt <= retries) {
    if (astConfigTimedOut(startedAtMs, timeoutMs)) {
      throw buildTimeoutError(lastError);
    }

    try {
      const requestHeaders = astConfigIsPlainObject(config.headers) ? config.headers : {};
      const options = {
        method,
        muteHttpExceptions: true,
        headers: requestHeaders
      };

      if (typeof config.contentType === 'string' && config.contentType.trim().length > 0) {
        options.contentType = config.contentType.trim();
      }

      if (typeof config.payload !== 'undefined' && config.payload !== null) {
        if (serializeJsonPayload && !options.contentType) {
          options.contentType = 'application/json';
        }

        options.payload = (
          serializeJsonPayload &&
          typeof config.payload !== 'string'
        )
          ? JSON.stringify(config.payload)
          : config.payload;
      }

      if (typeof config.followRedirects === 'boolean') {
        options.followRedirects = config.followRedirects;
      }

      if (typeof config.validateHttpsCertificates === 'boolean') {
        options.validateHttpsCertificates = config.validateHttpsCertificates;
      }

      const response = UrlFetchApp.fetch(url, options);
      const statusCode = typeof response.getResponseCode === 'function'
        ? response.getResponseCode()
        : 200;
      const body = typeof response.getContentText === 'function'
        ? response.getContentText()
        : '';
      const json = parseJson ? parseJson(body) : null;
      const headers = typeof response.getAllHeaders === 'function'
        ? response.getAllHeaders()
        : {};

      if (statusCode >= 200 && statusCode < 300) {
        if (astConfigTimedOut(startedAtMs, timeoutMs)) {
          throw buildTimeoutError(astConfigBuildHttpCoreError(
            'late_success',
            'HTTP request exceeded timeout budget before successful response',
            {
              url,
              statusCode,
              timeoutMs,
              elapsedMs: astConfigElapsedMs(startedAtMs)
            }
          ));
        }

        return {
          statusCode,
          body,
          json,
          headers,
          response,
          attempts: attempt + 1,
          elapsedMs: astConfigElapsedMs(startedAtMs)
        };
      }

      const statusError = astConfigBuildHttpCoreError(
        'http_status',
        `HTTP request failed with status ${statusCode}`,
        {
          url,
          statusCode,
          body,
          json,
          method,
          requestHeaders,
          timeoutMs,
          elapsedMs: astConfigElapsedMs(startedAtMs)
        }
      );

      if (isTransientStatus(statusCode) && attempt < retries) {
        lastError = statusError;
        attempt += 1;
        sleepWithTimeoutBudget(250 * attempt);
        continue;
      }

      if (astConfigTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(statusError);
      }

      throw statusError;
    } catch (error) {
      if (astConfigTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(error);
      }

      if (error && error.name === 'AstConfigHttpCoreError' && error.code === 'timeout') {
        throw error;
      }

      if (error && error.name === 'AstConfigHttpCoreError' && error.code === 'http_status') {
        const statusCode = Number(error.details && error.details.statusCode);
        if (!isTransientStatus(statusCode) || attempt >= retries) {
          throw error;
        }
      }

      if (attempt >= retries) {
        throw astConfigBuildHttpCoreError(
          'failure',
          'HTTP request failed',
          {
            url,
            attempts: attempt + 1,
            timeoutMs,
            elapsedMs: astConfigElapsedMs(startedAtMs)
          },
          error
        );
      }

      lastError = error;
      attempt += 1;
      sleepWithTimeoutBudget(250 * attempt);
    }
  }

  throw astConfigBuildHttpCoreError(
    'retry_exhausted',
    'HTTP request failed after retries',
    {
      url,
      attempts: retries + 1,
      timeoutMs,
      elapsedMs: astConfigElapsedMs(startedAtMs)
    },
    lastError
  );
}

const AST_CONFIG_DEFAULT_HANDLE_CACHE_ID = 'default';
const AST_CONFIG_EMPTY_KEYS_CACHE_ID = '__empty__';

let AST_CONFIG_SCRIPT_PROPERTIES_CACHE = {
  nextHandleId: 1,
  handles: {},
  handleRegistry: []
};

function astConfigCloneEntries(entries) {
  if (!astConfigIsPlainObject(entries)) {
    return {};
  }
  return Object.assign({}, entries);
}

function astConfigBuildSnapshotCacheKey(keys) {
  const normalizedKeys = astConfigNormalizeKeys(keys);
  if (!Array.isArray(normalizedKeys)) {
    return '*';
  }
  if (normalizedKeys.length === 0) {
    return AST_CONFIG_EMPTY_KEYS_CACHE_ID;
  }
  return normalizedKeys.slice().sort().join('\u0001');
}

function astConfigInvalidateScriptPropertiesSnapshotMemoized() {
  AST_CONFIG_SCRIPT_PROPERTIES_CACHE = {
    nextHandleId: 1,
    handles: {},
    handleRegistry: []
  };
  return true;
}

function astConfigResolveHandleCacheId(handle) {
  if (!handle || typeof handle !== 'object') {
    return AST_CONFIG_DEFAULT_HANDLE_CACHE_ID;
  }

  const registry = AST_CONFIG_SCRIPT_PROPERTIES_CACHE.handleRegistry;
  for (let idx = 0; idx < registry.length; idx += 1) {
    if (registry[idx].handle === handle) {
      return registry[idx].id;
    }
  }

  const id = `h${AST_CONFIG_SCRIPT_PROPERTIES_CACHE.nextHandleId}`;
  AST_CONFIG_SCRIPT_PROPERTIES_CACHE.nextHandleId += 1;
  registry.push({ id, handle });
  return id;
}

function astConfigGetHandleCache(handle, options = {}) {
  const explicitCacheScopeId = astConfigNormalizeString(options.cacheScopeId, '');
  const cacheId = explicitCacheScopeId || astConfigResolveHandleCacheId(handle);
  const handles = AST_CONFIG_SCRIPT_PROPERTIES_CACHE.handles;

  if (!Object.prototype.hasOwnProperty.call(handles, cacheId)) {
    handles[cacheId] = {};
  }

  return handles[cacheId];
}

function astConfigResolveScriptPropertiesHandle(options = {}) {
  const providedHandle = options.scriptProperties;
  if (
    providedHandle &&
    (
      typeof providedHandle.getProperties === 'function'
      || typeof providedHandle.getProperty === 'function'
    )
  ) {
    return providedHandle;
  }

  try {
    if (
      typeof PropertiesService !== 'undefined'
      && PropertiesService
      && typeof PropertiesService.getScriptProperties === 'function'
    ) {
      return PropertiesService.getScriptProperties();
    }
  } catch (_error) {
    // Intentionally swallow script property access failures.
  }

  return null;
}

function astConfigReadEntriesFromHandle(handle, requestedKeys = null) {
  if (!handle) {
    return {};
  }

  const output = {};
  const hasRequestedKeys = Array.isArray(requestedKeys);

  if (typeof handle.getProperties === 'function') {
    const map = handle.getProperties();
    if (astConfigIsPlainObject(map)) {
      const keys = hasRequestedKeys ? requestedKeys : Object.keys(map);

      for (let idx = 0; idx < keys.length; idx += 1) {
        const key = keys[idx];
        if (Object.prototype.hasOwnProperty.call(map, key)) {
          output[key] = map[key];
        }
      }
    }
  }

  if (hasRequestedKeys && typeof handle.getProperty === 'function') {
    for (let idx = 0; idx < requestedKeys.length; idx += 1) {
      const key = requestedKeys[idx];
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        continue;
      }

      const value = handle.getProperty(key);
      if (typeof value !== 'undefined') {
        output[key] = value;
      }
    }
  }

  return output;
}

function astConfigReadEntriesFromHandleMemoized(handle, requestedKeys = null, options = {}) {
  if (!handle) {
    return {};
  }

  const disableCache = astConfigNormalizeBoolean(options.disableCache, false);
  const forceRefresh = astConfigNormalizeBoolean(options.forceRefresh, false);

  if (disableCache) {
    return astConfigReadEntriesFromHandle(handle, requestedKeys);
  }

  if (forceRefresh) {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }

  const cacheKey = astConfigBuildSnapshotCacheKey(requestedKeys);
  const handleCache = astConfigGetHandleCache(handle, options);

  if (Object.prototype.hasOwnProperty.call(handleCache, cacheKey)) {
    return astConfigCloneEntries(handleCache[cacheKey]);
  }

  const entries = astConfigReadEntriesFromHandle(handle, requestedKeys);
  handleCache[cacheKey] = astConfigCloneEntries(entries);
  return astConfigCloneEntries(entries);
}

function astConfigBuildOutput(entries, options = {}) {
  const includeEmpty = astConfigNormalizeBoolean(options.includeEmpty, false);
  const requestedKeys = astConfigNormalizeKeys(options.keys);
  const prefix = astConfigNormalizeString(options.prefix, '');
  const stripPrefix = astConfigNormalizeBoolean(options.stripPrefix, false);
  const keys = Array.isArray(requestedKeys) ? requestedKeys : Object.keys(entries || {}).sort();
  const output = {};

  for (let idx = 0; idx < keys.length; idx += 1) {
    const sourceKey = astConfigNormalizeString(keys[idx], '');
    if (!sourceKey) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(entries, sourceKey)) {
      continue;
    }

    if (prefix && !sourceKey.startsWith(prefix)) {
      continue;
    }

    const targetKey = stripPrefix && prefix
      ? sourceKey.slice(prefix.length)
      : sourceKey;

    const normalizedKey = astConfigNormalizeString(targetKey, '');
    if (!normalizedKey) {
      continue;
    }

    const normalizedValue = astConfigNormalizeValue(entries[sourceKey], includeEmpty);
    if (normalizedValue == null) {
      continue;
    }

    output[normalizedKey] = normalizedValue;
  }

  return output;
}

function astConfigGetScriptPropertiesSnapshotMemoized(options = {}) {
  if (!astConfigIsPlainObject(options)) {
    throw new Error('Script properties snapshot options must be an object');
  }

  const requestedKeys = astConfigNormalizeKeys(options.keys);
  const hasExplicitScriptPropertiesHandle = Boolean(
    options.scriptProperties
    && (
      typeof options.scriptProperties.getProperties === 'function'
      || typeof options.scriptProperties.getProperty === 'function'
    )
  );
  const explicitCacheScopeId = astConfigNormalizeString(options.cacheScopeId, '');
  const sharedCacheScopeId = explicitCacheScopeId
    || (hasExplicitScriptPropertiesHandle ? '' : AST_CONFIG_DEFAULT_HANDLE_CACHE_ID);

  if (astConfigIsPlainObject(options.properties)) {
    return astConfigBuildOutput(options.properties, Object.assign({}, options, {
      keys: requestedKeys
    }));
  }

  if (
    astConfigIsPlainObject(options.scriptProperties)
    && typeof options.scriptProperties.getProperties !== 'function'
    && typeof options.scriptProperties.getProperty !== 'function'
  ) {
    return astConfigBuildOutput(options.scriptProperties, Object.assign({}, options, {
      keys: requestedKeys
    }));
  }

  const scriptProperties = astConfigResolveScriptPropertiesHandle(options);
  const entries = astConfigReadEntriesFromHandleMemoized(
    scriptProperties,
    requestedKeys,
    Object.assign({}, options, {
      cacheScopeId: sharedCacheScopeId
    })
  );
  return astConfigBuildOutput(entries, Object.assign({}, options, {
    keys: requestedKeys
  }));
}

function astConfigFromScriptProperties(options = {}) {
  if (!astConfigIsPlainObject(options)) {
    throw new Error('AST.Config.fromScriptProperties options must be an object');
  }

  return astConfigGetScriptPropertiesSnapshotMemoized(options);
}

const AST_CONFIG = Object.freeze({
  fromScriptProperties: astConfigFromScriptProperties
});

const __astConfigRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astConfigRoot.astConfigFromScriptProperties = astConfigFromScriptProperties;
__astConfigRoot.astConfigGetScriptPropertiesSnapshotMemoized = astConfigGetScriptPropertiesSnapshotMemoized;
__astConfigRoot.astConfigInvalidateScriptPropertiesSnapshotMemoized = astConfigInvalidateScriptPropertiesSnapshotMemoized;
__astConfigRoot.astConfigResolveFirstString = astConfigResolveFirstString;
__astConfigRoot.astConfigResolveFirstBoolean = astConfigResolveFirstBoolean;
__astConfigRoot.astConfigResolveFirstInteger = astConfigResolveFirstInteger;
__astConfigRoot.astConfigMergeNormalizedConfig = astConfigMergeNormalizedConfig;
__astConfigRoot.astConfigParseJsonSafe = astConfigParseJsonSafe;
__astConfigRoot.astConfigSleep = astConfigSleep;
__astConfigRoot.astConfigNormalizeTimeoutMs = astConfigNormalizeTimeoutMs;
__astConfigRoot.astConfigElapsedMs = astConfigElapsedMs;
__astConfigRoot.astConfigRemainingMs = astConfigRemainingMs;
__astConfigRoot.astConfigTimedOut = astConfigTimedOut;
__astConfigRoot.astConfigIsTransientHttpStatus = astConfigIsTransientHttpStatus;
__astConfigRoot.astConfigBuildHttpCoreError = astConfigBuildHttpCoreError;
__astConfigRoot.astConfigHttpRequestWithRetryCore = astConfigHttpRequestWithRetryCore;
__astConfigRoot.AST_CONFIG = AST_CONFIG;
this.astConfigFromScriptProperties = astConfigFromScriptProperties;
this.astConfigGetScriptPropertiesSnapshotMemoized = astConfigGetScriptPropertiesSnapshotMemoized;
this.astConfigInvalidateScriptPropertiesSnapshotMemoized = astConfigInvalidateScriptPropertiesSnapshotMemoized;
this.astConfigResolveFirstString = astConfigResolveFirstString;
this.astConfigResolveFirstBoolean = astConfigResolveFirstBoolean;
this.astConfigResolveFirstInteger = astConfigResolveFirstInteger;
this.astConfigMergeNormalizedConfig = astConfigMergeNormalizedConfig;
this.astConfigParseJsonSafe = astConfigParseJsonSafe;
this.astConfigSleep = astConfigSleep;
this.astConfigNormalizeTimeoutMs = astConfigNormalizeTimeoutMs;
this.astConfigElapsedMs = astConfigElapsedMs;
this.astConfigRemainingMs = astConfigRemainingMs;
this.astConfigTimedOut = astConfigTimedOut;
this.astConfigIsTransientHttpStatus = astConfigIsTransientHttpStatus;
this.astConfigBuildHttpCoreError = astConfigBuildHttpCoreError;
this.astConfigHttpRequestWithRetryCore = astConfigHttpRequestWithRetryCore;
this.AST_CONFIG = AST_CONFIG;
