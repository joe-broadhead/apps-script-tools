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
