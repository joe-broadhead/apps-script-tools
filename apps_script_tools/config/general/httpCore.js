const AST_CONFIG_HTTP_CORE_ERROR_CLASS = typeof AstConfigHttpCoreError === 'function'
  ? AstConfigHttpCoreError
  : class AstConfigHttpCoreErrorFallback extends Error {
    constructor(message, details = {}, cause = null) {
      super(message);
      this.name = 'AstConfigHttpCoreError';
      this.details = details;
      if (cause) {
        this.cause = cause;
      }
    }
  };

const AST_CONFIG_HTTP_SENSITIVE_QUERY_KEYS = Object.freeze([
  'access_token',
  'api_key',
  'apikey',
  'auth',
  'authorization',
  'client_secret',
  'key',
  'password',
  'refresh_token',
  'secret',
  'sig',
  'signature',
  'token',
  'x_amz_credential',
  'x_amz_security_token',
  'x_amz_signature',
  'x_goog_api_key',
  'x_goog_credential',
  'x_goog_signature'
]);

function astConfigIsSensitiveHeaderName(name) {
  const normalized = astConfigNormalizeString(name, '').toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized === 'authorization' ||
    normalized === 'cookie' ||
    normalized === 'set-cookie' ||
    normalized === 'proxy-authorization' ||
    normalized === 'x-api-key' ||
    normalized === 'x-goog-api-key' ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password')
  );
}

function astConfigTryDecodeURIComponent(value) {
  if (typeof value !== 'string') {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function astConfigNormalizeSensitiveToken(value) {
  return astConfigNormalizeString(value, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
}

function astConfigIsSensitiveQueryKey(key) {
  const decoded = astConfigTryDecodeURIComponent(String(key || ''));
  const normalized = astConfigNormalizeSensitiveToken(decoded);

  if (!normalized) {
    return false;
  }

  if (AST_CONFIG_HTTP_SENSITIVE_QUERY_KEYS.includes(normalized)) {
    return true;
  }

  return (
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('signature')
  );
}

function astConfigRedactUrl(url) {
  const raw = astConfigNormalizeString(url, '');
  if (!raw) {
    return raw;
  }

  const queryIndex = raw.indexOf('?');
  if (queryIndex < 0) {
    return raw;
  }

  const fragmentIndex = raw.indexOf('#', queryIndex);
  const base = raw.slice(0, queryIndex);
  const query = fragmentIndex >= 0
    ? raw.slice(queryIndex + 1, fragmentIndex)
    : raw.slice(queryIndex + 1);
  const fragment = fragmentIndex >= 0 ? raw.slice(fragmentIndex) : '';

  if (!query) {
    return raw;
  }

  const redactedQuery = query
    .split('&')
    .map(part => {
      if (!part) {
        return part;
      }

      const eqIndex = part.indexOf('=');
      const rawKey = eqIndex >= 0 ? part.slice(0, eqIndex) : part;
      if (!astConfigIsSensitiveQueryKey(rawKey)) {
        return part;
      }

      return `${rawKey}=[redacted]`;
    })
    .join('&');

  return `${base}?${redactedQuery}${fragment}`;
}

function astConfigRedactHeaders(headers = {}) {
  const input = astConfigIsPlainObject(headers) ? headers : {};
  const output = {};

  Object.keys(input).forEach(key => {
    output[key] = astConfigIsSensitiveHeaderName(key)
      ? '[redacted]'
      : input[key];
  });

  return output;
}

function astConfigBuildHttpCoreError(code, message, details = {}, cause = null) {
  const error = new AST_CONFIG_HTTP_CORE_ERROR_CLASS(message, astConfigIsPlainObject(details) ? details : {}, cause);
  error.code = code;
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
  const redactedUrl = astConfigRedactUrl(url);

  if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw astConfigBuildHttpCoreError('unavailable', 'UrlFetchApp.fetch is not available in this runtime', {
      url: redactedUrl
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
        url: redactedUrl,
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
              url: redactedUrl,
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
          url: redactedUrl,
          statusCode,
          body,
          json,
          method,
          requestHeaders: astConfigRedactHeaders(requestHeaders),
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

      if (error instanceof AST_CONFIG_HTTP_CORE_ERROR_CLASS && error.code === 'timeout') {
        throw error;
      }

      if (error instanceof AST_CONFIG_HTTP_CORE_ERROR_CLASS && error.code === 'http_status') {
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
            url: redactedUrl,
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
      url: redactedUrl,
      attempts: retries + 1,
      timeoutMs,
      elapsedMs: astConfigElapsedMs(startedAtMs)
    },
    lastError
  );
}
