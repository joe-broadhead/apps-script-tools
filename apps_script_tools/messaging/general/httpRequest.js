function astMessagingHttpNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingHttpNormalizeMethod(value, fallback = 'get') {
  const normalized = astMessagingHttpNormalizeString(value, fallback);
  return (normalized || fallback).toLowerCase();
}

function astMessagingHttpNormalizeTimeoutMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function astMessagingHttpElapsedMs(startedAtMs) {
  const nowMs = Date.now();
  return Math.max(0, nowMs - startedAtMs);
}

function astMessagingHttpShouldRetryStatus(statusCode) {
  return [429, 500, 502, 503, 504].includes(Number(statusCode));
}

function astMessagingHttpSleepBackoff(attemptIndex) {
  if (typeof Utilities === 'undefined' || !Utilities || typeof Utilities.sleep !== 'function') {
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, Math.max(0, attemptIndex)), 5000);
  Utilities.sleep(delay);
}

function astMessagingHttpRedactHeaders(headers = {}) {
  const output = {};
  Object.keys(headers || {}).forEach(key => {
    const lower = key.toLowerCase();
    if (['authorization', 'proxy-authorization', 'x-api-key', 'cookie', 'set-cookie'].includes(lower)) {
      output[key] = '<redacted>';
      return;
    }
    output[key] = headers[key];
  });
  return output;
}

function astMessagingHttpParseJson(text) {
  const source = astMessagingHttpNormalizeString(text, '');
  if (!source) {
    return null;
  }

  try {
    return JSON.parse(source);
  } catch (_error) {
    return null;
  }
}

function astMessagingHttpThrowForStatus(response, requestContext = {}) {
  const statusCode = Number(response.statusCode || 0);
  if (statusCode >= 200 && statusCode < 300) {
    return;
  }

  const details = {
    statusCode,
    method: requestContext.method,
    url: requestContext.url,
    headers: astMessagingHttpRedactHeaders(requestContext.headers || {}),
    responseText: response.text || ''
  };

  if (statusCode === 401 || statusCode === 403) {
    throw new AstMessagingAuthError(`Messaging provider request failed with status ${statusCode}`, details);
  }

  if (statusCode === 404) {
    throw new AstMessagingNotFoundError('Messaging provider resource not found', details);
  }

  if (statusCode === 429) {
    throw new AstMessagingRateLimitError('Messaging provider rate limit exceeded', details);
  }

  throw new AstMessagingProviderError(`Messaging provider request failed with status ${statusCode}`, details);
}

function astMessagingHttpThrowTimeout(requestContext = {}, timeoutMs = null, startedAtMs = 0) {
  throw new AstMessagingProviderError('Messaging provider request timed out', {
    method: requestContext.method,
    url: requestContext.url,
    headers: astMessagingHttpRedactHeaders(requestContext.headers || {}),
    timeoutMs,
    elapsedMs: astMessagingHttpElapsedMs(startedAtMs),
    classification: 'timeout'
  });
}

function astMessagingHttpRequest(url, requestOptions = {}, executionOptions = {}) {
  if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw new AstMessagingCapabilityError('Messaging provider requires UrlFetchApp.fetch()', {
      required: 'UrlFetchApp.fetch'
    });
  }

  const normalizedUrl = astMessagingHttpNormalizeString(url, null);
  if (!normalizedUrl) {
    throw new AstMessagingValidationError('Messaging http request url is required', {
      field: 'url'
    });
  }

  const retries = Number(executionOptions.retries || 0);
  const timeoutMs = astMessagingHttpNormalizeTimeoutMs(executionOptions.timeoutMs);
  const startedAtMs = Date.now();
  const method = astMessagingHttpNormalizeMethod(requestOptions.method, 'get');
  const payload = typeof requestOptions.payload === 'undefined'
    ? undefined
    : requestOptions.payload;
  const headers = requestOptions.headers && typeof requestOptions.headers === 'object'
    ? Object.assign({}, requestOptions.headers)
    : {};

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (timeoutMs !== null && astMessagingHttpElapsedMs(startedAtMs) >= timeoutMs) {
      astMessagingHttpThrowTimeout({
        method: method.toUpperCase(),
        url: normalizedUrl,
        headers
      }, timeoutMs, startedAtMs);
    }

    try {
      const fetchOptions = {
        method,
        headers,
        muteHttpExceptions: true
      };

      if (typeof payload !== 'undefined') {
        fetchOptions.payload = payload;
      }

      const response = UrlFetchApp.fetch(normalizedUrl, fetchOptions);
      const statusCode = Number(response.getResponseCode());
      const text = typeof response.getContentText === 'function'
        ? response.getContentText()
        : '';
      const responseHeaders = typeof response.getAllHeaders === 'function'
        ? response.getAllHeaders()
        : {};

      const normalizedResponse = {
        statusCode,
        text,
        json: astMessagingHttpParseJson(text),
        headers: responseHeaders
      };

      if (statusCode >= 200 && statusCode < 300) {
        if (timeoutMs !== null && astMessagingHttpElapsedMs(startedAtMs) >= timeoutMs) {
          astMessagingHttpThrowTimeout({
            method: method.toUpperCase(),
            url: normalizedUrl,
            headers
          }, timeoutMs, startedAtMs);
        }
        return normalizedResponse;
      }

      if (attempt < retries && astMessagingHttpShouldRetryStatus(statusCode)) {
        if (timeoutMs !== null && astMessagingHttpElapsedMs(startedAtMs) >= timeoutMs) {
          astMessagingHttpThrowTimeout({
            method: method.toUpperCase(),
            url: normalizedUrl,
            headers
          }, timeoutMs, startedAtMs);
        }
        astMessagingHttpSleepBackoff(attempt);
        continue;
      }

      astMessagingHttpThrowForStatus(normalizedResponse, {
        method: method.toUpperCase(),
        url: normalizedUrl,
        headers
      });
    } catch (error) {
      lastError = error;
      if (attempt < retries && !(error instanceof AstMessagingValidationError) && !(error instanceof AstMessagingAuthError)) {
        if (timeoutMs !== null && astMessagingHttpElapsedMs(startedAtMs) >= timeoutMs) {
          astMessagingHttpThrowTimeout({
            method: method.toUpperCase(),
            url: normalizedUrl,
            headers
          }, timeoutMs, startedAtMs);
        }
        astMessagingHttpSleepBackoff(attempt);
        continue;
      }
      throw error;
    }
  }

  throw new AstMessagingProviderError('Messaging provider request failed', {
    url: normalizedUrl,
    method: method.toUpperCase(),
    message: lastError ? String(lastError.message || lastError) : 'unknown error'
  }, lastError);
}
