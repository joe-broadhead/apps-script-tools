function astGitHubHttpIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubHttpNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubParseJsonSafe(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function astGitHubSleep(milliseconds) {
  const ms = Math.max(0, Math.floor(milliseconds || 0));
  if (ms === 0) {
    return;
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.sleep === 'function') {
    Utilities.sleep(ms);
  }
}

function astGitHubRedactHeaders(headers = {}) {
  const output = {};

  Object.keys(headers || {}).forEach(key => {
    const normalizedKey = String(key || '').toLowerCase();
    if (
      normalizedKey === 'authorization' ||
      normalizedKey === 'cookie' ||
      normalizedKey === 'set-cookie' ||
      normalizedKey === 'proxy-authorization' ||
      normalizedKey === 'x-api-key' ||
      normalizedKey === 'x-goog-api-key' ||
      normalizedKey.includes('token') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('password')
    ) {
      output[key] = '[redacted]';
      return;
    }

    output[key] = headers[key];
  });

  return output;
}

function astGitHubRedactUrl(url) {
  const raw = astGitHubHttpNormalizeString(url, '');
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

  const redactedQuery = query
    .split('&')
    .map(part => {
      if (!part) {
        return part;
      }

      const eqIndex = part.indexOf('=');
      const rawKey = eqIndex >= 0 ? part.slice(0, eqIndex) : part;
      const normalizedKey = rawKey.toLowerCase();
      if (
        normalizedKey.includes('token') ||
        normalizedKey.includes('key') ||
        normalizedKey.includes('secret') ||
        normalizedKey.includes('password') ||
        normalizedKey.includes('signature')
      ) {
        return `${rawKey}=[redacted]`;
      }

      return part;
    })
    .join('&');

  return `${base}?${redactedQuery}${fragment}`;
}

function astGitHubNormalizeTimeoutMs(value) {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  if (!isFinite(value) || value <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

function astGitHubElapsedMs(startedAtMs) {
  return Math.max(0, Date.now() - startedAtMs);
}

function astGitHubTimedOut(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return false;
  }
  return astGitHubElapsedMs(startedAtMs) >= timeoutMs;
}

function astGitHubRemainingMs(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return null;
  }
  return Math.max(0, timeoutMs - astGitHubElapsedMs(startedAtMs));
}

function astGitHubNormalizeHeaders(headers = {}) {
  const input = astGitHubHttpIsPlainObject(headers) ? headers : {};
  const output = {};

  Object.keys(input).forEach(key => {
    if (!key) {
      return;
    }

    const value = input[key];
    if (typeof value === 'undefined' || value === null || value === '') {
      return;
    }

    output[key] = String(value);
  });

  return output;
}

function astGitHubNormalizeResponseHeaders(headers = {}) {
  const output = {};
  if (!astGitHubHttpIsPlainObject(headers)) {
    return output;
  }

  Object.keys(headers).forEach(key => {
    output[key] = headers[key];
    output[String(key).toLowerCase()] = headers[key];
  });

  return output;
}

function astGitHubIsSecondaryRateLimit(bodyText = '', bodyJson = null) {
  const source = astGitHubNormalizeString(bodyText, '').toLowerCase();
  if (source.includes('secondary rate limit')) {
    return true;
  }

  if (bodyJson && typeof bodyJson === 'object') {
    const message = astGitHubNormalizeString(bodyJson.message, '').toLowerCase();
    if (message.includes('secondary rate limit')) {
      return true;
    }

    if (Array.isArray(bodyJson.errors)) {
      return bodyJson.errors.some(entry => {
        const text = astGitHubNormalizeString(entry && entry.message, '').toLowerCase();
        return text.includes('secondary rate limit');
      });
    }
  }

  return false;
}

function astGitHubShouldRetry(statusCode, bodyText, bodyJson) {
  if (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
    return true;
  }

  if (statusCode === 403 && astGitHubIsSecondaryRateLimit(bodyText, bodyJson)) {
    return true;
  }

  return false;
}

function astGitHubExtractRateLimit(headers = {}, bodyJson = null) {
  const hasLimitHeader = Object.prototype.hasOwnProperty.call(headers, 'x-ratelimit-limit');
  const hasRemainingHeader = Object.prototype.hasOwnProperty.call(headers, 'x-ratelimit-remaining');
  const limit = hasLimitHeader ? Number(headers['x-ratelimit-limit']) : null;
  const remaining = hasRemainingHeader ? Number(headers['x-ratelimit-remaining']) : null;
  const resetRaw = headers['x-ratelimit-reset'];
  const resetSeconds = Number(resetRaw || 0);
  const resetAt = resetSeconds > 0
    ? new Date(resetSeconds * 1000).toISOString()
    : null;

  const output = {
    limit: hasLimitHeader && isFinite(limit) && limit > 0 ? limit : null,
    remaining: hasRemainingHeader && isFinite(remaining) ? remaining : null,
    resetAt
  };

  if (bodyJson && astGitHubHttpIsPlainObject(bodyJson.resources)) {
    output.resources = bodyJson.resources;
  }

  return output;
}

function astGitHubBuildHttpError(statusCode, context, bodyText, bodyJson, headers, cause = null) {
  const retryable = astGitHubShouldRetry(statusCode, bodyText, bodyJson);
  const redactedUrl = astGitHubRedactUrl(context.url);
  const details = {
    operation: context.operation,
    method: context.method,
    url: redactedUrl,
    statusCode,
    retryable,
    request: {
      headers: astGitHubRedactHeaders(context.headers || {})
    },
    response: {
      headers: astGitHubRedactHeaders(headers || {}),
      body: bodyText,
      json: bodyJson
    },
    rateLimit: astGitHubExtractRateLimit(headers, bodyJson)
  };

  if (statusCode === 401) {
    return new AstGitHubAuthError('GitHub authentication failed (401)', details, cause);
  }

  if (statusCode === 403) {
    const hasRemainingHeader = Object.prototype.hasOwnProperty.call(headers, 'x-ratelimit-remaining');
    const remaining = hasRemainingHeader ? Number(headers['x-ratelimit-remaining']) : null;
    const rateLimitByHeader = hasRemainingHeader && isFinite(remaining) && remaining === 0;
    if (rateLimitByHeader || astGitHubIsSecondaryRateLimit(bodyText, bodyJson)) {
      return new AstGitHubRateLimitError('GitHub rate limit reached (403)', details, cause);
    }
    return new AstGitHubAuthError('GitHub authorization failed (403)', details, cause);
  }

  if (statusCode === 404) {
    return new AstGitHubNotFoundError('GitHub resource not found (404)', details, cause);
  }

  if (statusCode === 409) {
    return new AstGitHubConflictError('GitHub conflict (409)', details, cause);
  }

  if (statusCode === 422) {
    return new AstGitHubValidationError('GitHub request validation failed (422)', details, cause);
  }

  if (statusCode === 429) {
    return new AstGitHubRateLimitError('GitHub rate limit reached (429)', details, cause);
  }

  return new AstGitHubProviderError(`GitHub request failed with status ${statusCode}`, details, cause);
}

function astGitHubHttpIsRetriableProviderError(error) {
  if (!error || error.name !== 'AstGitHubProviderError') {
    return false;
  }

  const details = astGitHubHttpIsPlainObject(error.details) ? error.details : {};
  if (typeof details.retryable === 'boolean') {
    return details.retryable;
  }

  if (isFinite(Number(details.statusCode))) {
    return astGitHubShouldRetry(Number(details.statusCode), '', null);
  }

  return false;
}

function astGitHubHttpRequest(config = {}) {
  const url = astGitHubNormalizeString(config.url, '');
  const redactedUrl = astGitHubRedactUrl(url);
  if (!url) {
    throw new AstGitHubValidationError('GitHub HTTP request requires non-empty url');
  }

  if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw new AstGitHubProviderError('UrlFetchApp.fetch is not available in this runtime', {
      url: redactedUrl
    });
  }

  const method = astGitHubNormalizeString(config.method, 'get').toLowerCase();
  const retries = Number.isInteger(config.retries) ? Math.max(0, config.retries) : 0;
  const timeoutMs = astGitHubNormalizeTimeoutMs(config.timeoutMs);
  const startedAtMs = Date.now();

  const context = {
    operation: astGitHubNormalizeString(config.operation, null),
    method,
    url: redactedUrl,
    headers: astGitHubNormalizeHeaders(config.headers)
  };

  let attempt = 0;
  let lastError = null;

  function buildTimeoutError(cause) {
    return new AstGitHubProviderError(
      `GitHub request exceeded timeout budget (${timeoutMs}ms)`,
      {
        operation: context.operation,
        method,
        url: redactedUrl,
        timeoutMs,
        attempts: attempt + 1,
        elapsedMs: astGitHubElapsedMs(startedAtMs)
      },
      cause
    );
  }

  function sleepWithTimeoutBudget(backoffMs) {
    if (!timeoutMs) {
      astGitHubSleep(backoffMs);
      return;
    }

    const remaining = astGitHubRemainingMs(startedAtMs, timeoutMs);
    if (remaining <= 0) {
      throw buildTimeoutError(lastError);
    }

    if (backoffMs >= remaining) {
      throw buildTimeoutError(lastError);
    }

    astGitHubSleep(backoffMs);
  }

  while (attempt <= retries) {
    if (astGitHubTimedOut(startedAtMs, timeoutMs)) {
      throw buildTimeoutError(lastError);
    }

    try {
      const fetchOptions = {
        method,
        headers: context.headers,
        muteHttpExceptions: true
      };

      if (typeof config.payload !== 'undefined') {
        fetchOptions.payload = config.payload;
        fetchOptions.contentType = 'application/json';
      }

      const response = UrlFetchApp.fetch(url, fetchOptions);
      const statusCode = typeof response.getResponseCode === 'function'
        ? response.getResponseCode()
        : 200;
      const bodyText = typeof response.getContentText === 'function'
        ? response.getContentText()
        : '';
      const bodyJson = astGitHubParseJsonSafe(bodyText);
      const headers = astGitHubNormalizeResponseHeaders(
        typeof response.getAllHeaders === 'function'
          ? response.getAllHeaders()
          : {}
      );

      if (statusCode >= 200 && statusCode < 300) {
        return {
          statusCode,
          bodyText,
          bodyJson,
          headers,
          response
        };
      }

      if (statusCode === 304) {
        return {
          statusCode,
          bodyText,
          bodyJson,
          headers,
          response
        };
      }

      const mappedError = astGitHubBuildHttpError(statusCode, context, bodyText, bodyJson, headers);

      if (astGitHubShouldRetry(statusCode, bodyText, bodyJson) && attempt < retries) {
        lastError = mappedError;
        attempt += 1;
        sleepWithTimeoutBudget(250 * attempt);
        continue;
      }

      if (astGitHubTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(mappedError);
      }

      throw mappedError;
    } catch (error) {
      if (
        error &&
        (error.name === 'AstGitHubValidationError' ||
         error.name === 'AstGitHubAuthError' ||
         error.name === 'AstGitHubNotFoundError' ||
         error.name === 'AstGitHubRateLimitError' ||
         error.name === 'AstGitHubConflictError' ||
         error.name === 'AstGitHubCapabilityError' ||
         error.name === 'AstGitHubProviderError' ||
         error.name === 'AstGitHubParseError' ||
         error.name === 'AstGitHubError')
      ) {
        if (
          attempt >= retries ||
          error.name !== 'AstGitHubProviderError' ||
          astGitHubHttpIsRetriableProviderError(error) !== true
        ) {
          throw error;
        }
      }

      if (astGitHubTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(error);
      }

      if (attempt >= retries) {
        throw new AstGitHubProviderError(
          'GitHub request failed',
          {
            operation: context.operation,
            method,
            url: redactedUrl,
            timeoutMs,
            attempts: attempt + 1,
            elapsedMs: astGitHubElapsedMs(startedAtMs)
          },
          error
        );
      }

      lastError = error;
      attempt += 1;
      sleepWithTimeoutBudget(250 * attempt);
    }
  }

  throw new AstGitHubProviderError('GitHub request failed after retries', {
    operation: context.operation,
    method,
    url: redactedUrl,
    timeoutMs,
    attempts: retries + 1,
    elapsedMs: astGitHubElapsedMs(startedAtMs)
  }, lastError);
}
