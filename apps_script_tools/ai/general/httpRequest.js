function astAiIsTransientHttpError(statusCode) {
  return statusCode === 429 || statusCode >= 500;
}

function astAiRedactUrl(url) {
  if (typeof astConfigRedactUrl === 'function') {
    return astConfigRedactUrl(url);
  }

  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  const queryIndex = trimmed.indexOf('?');
  if (queryIndex < 0) {
    return trimmed;
  }

  const fragmentIndex = trimmed.indexOf('#', queryIndex);
  const base = trimmed.slice(0, queryIndex);
  const query = fragmentIndex >= 0
    ? trimmed.slice(queryIndex + 1, fragmentIndex)
    : trimmed.slice(queryIndex + 1);
  const fragment = fragmentIndex >= 0 ? trimmed.slice(fragmentIndex) : '';

  const redacted = query
    .split('&')
    .map(part => {
      if (!part) {
        return part;
      }
      const eqIndex = part.indexOf('=');
      const rawKey = eqIndex >= 0 ? part.slice(0, eqIndex) : part;
      const key = rawKey.toLowerCase();
      if (
        key.includes('token') ||
        key.includes('key') ||
        key.includes('secret') ||
        key.includes('password') ||
        key.includes('signature')
      ) {
        return `${rawKey}=[redacted]`;
      }
      return part;
    })
    .join('&');

  return `${base}?${redacted}${fragment}`;
}

function astAiMapHttpCoreError(error, context = {}) {
  const coreCode = error && error.code ? String(error.code) : '';
  const details = error && error.details ? error.details : {};
  const url = astAiRedactUrl(typeof context.url === 'string' ? context.url : details.url);
  const timeoutMs = context.timeoutMs == null ? details.timeoutMs : context.timeoutMs;
  const elapsedMs = details.elapsedMs;
  const attempts = details.attempts;

  if (coreCode === 'validation') {
    return new AstAiValidationError('AI HTTP request requires a non-empty url');
  }

  if (coreCode === 'unavailable') {
    return new AstAiProviderError('UrlFetchApp.fetch is not available in this runtime', { url });
  }

  if (coreCode === 'http_status') {
    return new AstAiProviderError(
      `AI provider request failed with status ${details.statusCode}`,
      {
        url,
        statusCode: details.statusCode,
        body: details.body,
        json: details.json,
        timeoutMs,
        elapsedMs
      },
      error.cause || null
    );
  }

  if (coreCode === 'timeout') {
    return new AstAiProviderError(
      `AI provider request exceeded timeout budget (${timeoutMs}ms)`,
      {
        url,
        timeoutMs,
        attempts,
        elapsedMs
      },
      error.cause || null
    );
  }

  if (coreCode === 'failure') {
    return new AstAiProviderError(
      'AI provider request failed',
      {
        url,
        attempts,
        timeoutMs,
        elapsedMs
      },
      error.cause || null
    );
  }

  if (coreCode === 'retry_exhausted') {
    return new AstAiProviderError(
      'AI provider request failed after retries',
      {
        url,
        attempts,
        timeoutMs,
        elapsedMs
      },
      error.cause || null
    );
  }

  return new AstAiProviderError(
    'AI provider request failed',
    {
      url,
      attempts,
      timeoutMs,
      elapsedMs
    },
    error || null
  );
}

function astAiHttpRequest(config = {}) {
  if (!config || typeof config !== 'object') {
    throw new AstAiValidationError('AI HTTP request requires a non-empty url');
  }

  const url = typeof config.url === 'string' ? config.url.trim() : '';
  const timeoutMs = (
    typeof astConfigNormalizeTimeoutMs === 'function'
      ? astConfigNormalizeTimeoutMs(config.timeoutMs)
      : null
  );

  try {
    if (typeof astConfigHttpRequestWithRetryCore !== 'function') {
      throw new Error('astConfigHttpRequestWithRetryCore is not available');
    }

    return astConfigHttpRequestWithRetryCore({
      url,
      method: String(config.method || 'post').toLowerCase(),
      retries: Number.isInteger(config.retries) ? Math.max(0, config.retries) : 0,
      timeoutMs,
      headers: config.headers || {},
      contentType: config.contentType,
      payload: config.payload,
      serializeJsonPayload: true,
      parseJson: typeof astConfigParseJsonSafe === 'function' ? astConfigParseJsonSafe : null,
      isTransientStatus: astAiIsTransientHttpError
    });
  } catch (error) {
    if (error && error.name === 'AstConfigHttpCoreError') {
      throw astAiMapHttpCoreError(error, {
        url,
        timeoutMs
      });
    }
    if (error && error.name === 'AstAiValidationError') {
      throw error;
    }
    throw new AstAiProviderError(
      'AI provider request failed',
      {
        url: astAiRedactUrl(url),
        timeoutMs
      },
      error
    );
  }
}
