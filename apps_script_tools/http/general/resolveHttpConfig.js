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

function astHttpNormalizeResolvedConfig(input = {}) {
  const source = astHttpIsPlainObject(input) ? input : {};

  const timeoutMs = Math.max(1, astHttpNormalizeInteger(
    source.HTTP_TIMEOUT_MS != null ? source.HTTP_TIMEOUT_MS : source.timeoutMs,
    AST_HTTP_DEFAULT_TIMEOUT_MS
  ));

  const retries = Math.max(0, astHttpNormalizeInteger(
    source.HTTP_RETRIES != null ? source.HTTP_RETRIES : source.retries,
    AST_HTTP_DEFAULT_RETRIES
  ));

  const userAgent = astHttpNormalizeString(
    source.HTTP_USER_AGENT != null ? source.HTTP_USER_AGENT : source.userAgent,
    AST_HTTP_DEFAULT_USER_AGENT
  );

  const includeRaw = astHttpNormalizeBoolean(
    source.HTTP_INCLUDE_RAW != null ? source.HTTP_INCLUDE_RAW : source.includeRaw,
    AST_HTTP_DEFAULT_INCLUDE_RAW
  );

  const defaultHeadersCandidate = source.HTTP_DEFAULT_HEADERS != null
    ? source.HTTP_DEFAULT_HEADERS
    : source.defaultHeaders;
  const defaultHeaders = astHttpIsPlainObject(defaultHeadersCandidate)
    ? astHttpCloneObject(defaultHeadersCandidate)
    : astHttpParseHeadersFromString(defaultHeadersCandidate);

  return {
    HTTP_TIMEOUT_MS: timeoutMs,
    HTTP_RETRIES: retries,
    HTTP_USER_AGENT: userAgent,
    HTTP_INCLUDE_RAW: includeRaw,
    HTTP_DEFAULT_HEADERS: defaultHeaders
  };
}

function astHttpSetRuntimeConfig(config = {}, options = {}) {
  const normalizedConfig = astHttpNormalizeResolvedConfig(config);
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
  const fromScriptProps = astHttpNormalizeResolvedConfig(astHttpReadScriptProperties());
  const fromRuntime = astHttpNormalizeResolvedConfig(__astHttpRuntimeConfig);

  const requestLevel = astHttpNormalizeResolvedConfig({
    timeoutMs: requestOptions.timeoutMs,
    retries: requestOptions.retries,
    includeRaw: requestOptions.includeRaw,
    userAgent: requestOptions.userAgent,
    defaultHeaders: requestOptions.defaultHeaders
  });

  const resolved = {
    HTTP_TIMEOUT_MS: requestLevel.HTTP_TIMEOUT_MS,
    HTTP_RETRIES: requestLevel.HTTP_RETRIES,
    HTTP_USER_AGENT: requestLevel.HTTP_USER_AGENT,
    HTTP_INCLUDE_RAW: requestLevel.HTTP_INCLUDE_RAW,
    HTTP_DEFAULT_HEADERS: astHttpCloneObject(fromScriptProps.HTTP_DEFAULT_HEADERS)
  };

  if (fromRuntime.HTTP_TIMEOUT_MS !== AST_HTTP_DEFAULT_TIMEOUT_MS || requestOptions.timeoutMs == null) {
    resolved.HTTP_TIMEOUT_MS = requestOptions.timeoutMs != null
      ? requestLevel.HTTP_TIMEOUT_MS
      : fromRuntime.HTTP_TIMEOUT_MS;
  }

  if (fromRuntime.HTTP_RETRIES !== AST_HTTP_DEFAULT_RETRIES || requestOptions.retries == null) {
    resolved.HTTP_RETRIES = requestOptions.retries != null
      ? requestLevel.HTTP_RETRIES
      : fromRuntime.HTTP_RETRIES;
  }

  if (requestOptions.userAgent == null) {
    resolved.HTTP_USER_AGENT = fromRuntime.HTTP_USER_AGENT || fromScriptProps.HTTP_USER_AGENT;
  }

  if (requestOptions.includeRaw == null) {
    resolved.HTTP_INCLUDE_RAW = fromRuntime.HTTP_INCLUDE_RAW;
  }

  resolved.HTTP_DEFAULT_HEADERS = Object.assign(
    {},
    fromScriptProps.HTTP_DEFAULT_HEADERS,
    fromRuntime.HTTP_DEFAULT_HEADERS,
    requestLevel.HTTP_DEFAULT_HEADERS
  );

  return astHttpNormalizeResolvedConfig(resolved);
}
