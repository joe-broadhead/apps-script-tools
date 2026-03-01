const AST_HTTP_DEFAULT_TIMEOUT_MS = 45000;
const AST_HTTP_DEFAULT_RETRIES = 2;
const AST_HTTP_DEFAULT_INCLUDE_RAW = false;
const AST_HTTP_DEFAULT_USER_AGENT = 'apps-script-tools/0.0.5';
const AST_HTTP_SCRIPT_PROP_KEYS = Object.freeze([
  'HTTP_TIMEOUT_MS',
  'HTTP_RETRIES',
  'HTTP_USER_AGENT',
  'HTTP_INCLUDE_RAW',
  'HTTP_DEFAULT_HEADERS'
]);

let __astHttpRuntimeConfig = {};
let __astHttpScriptConfigCache = null;

function astHttpIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astHttpNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astHttpNormalizeInteger(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.floor(parsed);
}

function astHttpNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
}

function astHttpNormalizeBooleanCandidate(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return null;
}

function astHttpCloneObject(value) {
  if (!astHttpIsPlainObject(value)) {
    return {};
  }

  return Object.assign({}, value);
}

function astHttpParseHeadersFromString(value) {
  const normalized = astHttpNormalizeString(value, '');
  if (!normalized) {
    return {};
  }

  try {
    const parsed = JSON.parse(normalized);
    return astHttpIsPlainObject(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function astHttpCoerceHeaders(value) {
  if (astHttpIsPlainObject(value)) {
    return astHttpCloneObject(value);
  }

  if (typeof value === 'string') {
    return astHttpParseHeadersFromString(value);
  }

  return {};
}

function astHttpResolveIntegerCandidate(candidates = [], fallback = null, minimum = null) {
  for (let index = 0; index < candidates.length; index += 1) {
    const normalized = astHttpNormalizeInteger(candidates[index], null);
    if (normalized == null) {
      continue;
    }

    if (minimum != null && normalized < minimum) {
      continue;
    }

    return normalized;
  }

  return fallback;
}

function astHttpResolveStringCandidate(candidates = [], fallback = '') {
  for (let index = 0; index < candidates.length; index += 1) {
    const normalized = astHttpNormalizeString(candidates[index], '');
    if (normalized) {
      return normalized;
    }
  }

  return fallback;
}

function astHttpResolveBooleanCandidate(candidates = [], fallback = false) {
  for (let index = 0; index < candidates.length; index += 1) {
    const normalized = astHttpNormalizeBooleanCandidate(candidates[index]);
    if (normalized != null) {
      return normalized;
    }
  }

  return fallback;
}

function astHttpInvalidateConfigCache() {
  __astHttpScriptConfigCache = null;

  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astHttpReadScriptProperties() {
  if (__astHttpScriptConfigCache) {
    return astHttpCloneObject(__astHttpScriptConfigCache);
  }

  let raw = {};

  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    raw = astConfigGetScriptPropertiesSnapshotMemoized({
      keys: AST_HTTP_SCRIPT_PROP_KEYS
    });
  } else if (
    typeof PropertiesService !== 'undefined'
    && PropertiesService
    && typeof PropertiesService.getScriptProperties === 'function'
  ) {
    const scriptProps = PropertiesService.getScriptProperties();
    if (scriptProps && typeof scriptProps.getProperties === 'function') {
      raw = scriptProps.getProperties() || {};
    }
  }

  __astHttpScriptConfigCache = astHttpIsPlainObject(raw) ? raw : {};
  return astHttpCloneObject(__astHttpScriptConfigCache);
}

function astHttpNormalizeRuntimeConfigInput(input = {}) {
  const source = astHttpIsPlainObject(input) ? input : {};
  const output = {};

  const timeoutRaw = (
    source.HTTP_TIMEOUT_MS != null
      ? source.HTTP_TIMEOUT_MS
      : source.timeoutMs
  );
  if (timeoutRaw != null) {
    output.HTTP_TIMEOUT_MS = Math.max(1, astHttpNormalizeInteger(
      timeoutRaw,
      AST_HTTP_DEFAULT_TIMEOUT_MS
    ));
  }

  const retriesRaw = (
    source.HTTP_RETRIES != null
      ? source.HTTP_RETRIES
      : source.retries
  );
  if (retriesRaw != null) {
    output.HTTP_RETRIES = Math.max(0, astHttpNormalizeInteger(
      retriesRaw,
      AST_HTTP_DEFAULT_RETRIES
    ));
  }

  const userAgentRaw = (
    source.HTTP_USER_AGENT != null
      ? source.HTTP_USER_AGENT
      : source.userAgent
  );
  if (userAgentRaw != null) {
    output.HTTP_USER_AGENT = astHttpNormalizeString(
      userAgentRaw,
      AST_HTTP_DEFAULT_USER_AGENT
    );
  }

  const includeRawValue = astHttpNormalizeBooleanCandidate(
    source.HTTP_INCLUDE_RAW != null
      ? source.HTTP_INCLUDE_RAW
      : source.includeRaw
  );
  if (includeRawValue != null) {
    output.HTTP_INCLUDE_RAW = includeRawValue;
  }

  const defaultHeadersCandidate = (
    source.HTTP_DEFAULT_HEADERS != null
      ? source.HTTP_DEFAULT_HEADERS
      : source.defaultHeaders
  );
  if (defaultHeadersCandidate != null) {
    output.HTTP_DEFAULT_HEADERS = astHttpCoerceHeaders(defaultHeadersCandidate);
  }

  return output;
}

function astHttpSetRuntimeConfig(config = {}, options = {}) {
  const normalizedConfig = astHttpNormalizeRuntimeConfigInput(config);
  const merge = !astHttpIsPlainObject(options) || options.merge !== false;

  __astHttpRuntimeConfig = merge
    ? Object.assign({}, __astHttpRuntimeConfig, normalizedConfig)
    : normalizedConfig;

  astHttpInvalidateConfigCache();
  return astHttpGetRuntimeConfig();
}

function astHttpGetRuntimeConfig() {
  return astHttpCloneObject(__astHttpRuntimeConfig);
}

function astHttpClearRuntimeConfig() {
  __astHttpRuntimeConfig = {};
  astHttpInvalidateConfigCache();
  return {};
}

function astHttpResolveConfig(request = {}) {
  const requestOptions = astHttpIsPlainObject(request.options) ? request.options : {};
  const fromScriptProps = astHttpReadScriptProperties();
  const fromRuntime = astHttpIsPlainObject(__astHttpRuntimeConfig)
    ? astHttpCloneObject(__astHttpRuntimeConfig)
    : {};

  const resolved = {
    HTTP_TIMEOUT_MS: astHttpResolveIntegerCandidate([
      requestOptions.timeoutMs,
      fromRuntime.HTTP_TIMEOUT_MS,
      fromRuntime.timeoutMs,
      fromScriptProps.HTTP_TIMEOUT_MS,
      fromScriptProps.timeoutMs
    ], AST_HTTP_DEFAULT_TIMEOUT_MS, 1),
    HTTP_RETRIES: astHttpResolveIntegerCandidate([
      requestOptions.retries,
      fromRuntime.HTTP_RETRIES,
      fromRuntime.retries,
      fromScriptProps.HTTP_RETRIES,
      fromScriptProps.retries
    ], AST_HTTP_DEFAULT_RETRIES, 0),
    HTTP_USER_AGENT: astHttpResolveStringCandidate([
      requestOptions.userAgent,
      fromRuntime.HTTP_USER_AGENT,
      fromRuntime.userAgent,
      fromScriptProps.HTTP_USER_AGENT,
      fromScriptProps.userAgent
    ], AST_HTTP_DEFAULT_USER_AGENT),
    HTTP_INCLUDE_RAW: astHttpResolveBooleanCandidate([
      requestOptions.includeRaw,
      fromRuntime.HTTP_INCLUDE_RAW,
      fromRuntime.includeRaw,
      fromScriptProps.HTTP_INCLUDE_RAW,
      fromScriptProps.includeRaw
    ], AST_HTTP_DEFAULT_INCLUDE_RAW),
    HTTP_DEFAULT_HEADERS: Object.assign(
      {},
      astHttpCoerceHeaders(fromScriptProps.HTTP_DEFAULT_HEADERS != null
        ? fromScriptProps.HTTP_DEFAULT_HEADERS
        : fromScriptProps.defaultHeaders),
      astHttpCoerceHeaders(fromRuntime.HTTP_DEFAULT_HEADERS != null
        ? fromRuntime.HTTP_DEFAULT_HEADERS
        : fromRuntime.defaultHeaders),
      astHttpCoerceHeaders(requestOptions.defaultHeaders)
    )
  };

  return {
    HTTP_TIMEOUT_MS: Math.max(1, astHttpNormalizeInteger(resolved.HTTP_TIMEOUT_MS, AST_HTTP_DEFAULT_TIMEOUT_MS)),
    HTTP_RETRIES: Math.max(0, astHttpNormalizeInteger(resolved.HTTP_RETRIES, AST_HTTP_DEFAULT_RETRIES)),
    HTTP_USER_AGENT: astHttpNormalizeString(resolved.HTTP_USER_AGENT, AST_HTTP_DEFAULT_USER_AGENT),
    HTTP_INCLUDE_RAW: astHttpNormalizeBoolean(resolved.HTTP_INCLUDE_RAW, AST_HTTP_DEFAULT_INCLUDE_RAW),
    HTTP_DEFAULT_HEADERS: Object.assign(
      {},
      astHttpCoerceHeaders(resolved.HTTP_DEFAULT_HEADERS)
    )
  };
}
