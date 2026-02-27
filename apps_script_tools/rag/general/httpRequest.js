function astRagIsTransientHttpError(statusCode) {
  return statusCode === 429 || statusCode >= 500;
}

function astRagRedactUrl(url) {
  if (typeof astConfigRedactUrl === 'function') {
    return astConfigRedactUrl(url);
  }

  const raw = astRagNormalizeString(url, '');
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

function astRagMapHttpCoreError(error, context = {}) {
  const details = error && error.details ? error.details : {};
  const coreCode = error && error.code ? String(error.code) : '';
  const url = astRagRedactUrl(astRagNormalizeString(context.url, details.url || null));
  const timeoutMs = context.timeoutMs == null ? details.timeoutMs : context.timeoutMs;
  const attempts = details.attempts;
  const elapsedMs = details.elapsedMs;

  if (coreCode === 'validation') {
    return new AstRagValidationError('RAG HTTP request requires a non-empty url');
  }

  if (coreCode === 'unavailable') {
    return new AstRagError('UrlFetchApp.fetch is not available in this runtime', { url });
  }

  if (coreCode === 'http_status') {
    return new AstRagError(`RAG provider request failed with status ${details.statusCode}`, {
      url,
      statusCode: details.statusCode,
      body: details.body,
      json: details.json
    });
  }

  if (coreCode === 'timeout') {
    return new AstRagError(
      `RAG provider request exceeded timeout budget (${timeoutMs}ms)`,
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
    return new AstRagError(
      'RAG provider request failed',
      {
        url,
        attempts
      },
      error.cause || null
    );
  }

  if (coreCode === 'retry_exhausted') {
    return new AstRagError(
      'RAG provider request failed after retries',
      {
        url,
        attempts
      },
      error.cause || null
    );
  }

  return new AstRagError(
    'RAG provider request failed',
    {
      url,
      attempts,
      timeoutMs,
      elapsedMs
    },
    error || null
  );
}

function astRagHttpRequest(config = {}) {
  const url = astRagNormalizeString(config.url, null);
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
      method: astRagNormalizeString(config.method, 'post').toLowerCase(),
      retries: astRagNormalizePositiveInt(config.retries, 0, 0),
      timeoutMs,
      headers: astRagIsPlainObject(config.headers) ? config.headers : {},
      contentType: astRagNormalizeString(config.contentType, null),
      payload: typeof config.payload !== 'undefined' ? config.payload : null,
      serializeJsonPayload: true,
      parseJson: typeof astRagSafeJsonParse === 'function'
        ? (body => astRagSafeJsonParse(body, null))
        : (typeof astConfigParseJsonSafe === 'function' ? astConfigParseJsonSafe : null),
      isTransientStatus: astRagIsTransientHttpError
    });
  } catch (error) {
    if (error && error.name === 'AstConfigHttpCoreError') {
      throw astRagMapHttpCoreError(error, {
        url,
        timeoutMs
      });
    }
    if (error && (error.name === 'AstRagValidationError' || error.name === 'AstRagError')) {
      throw error;
    }
    throw new AstRagError(
      'RAG provider request failed',
      {
        url: astRagRedactUrl(url),
        attempts: astRagNormalizePositiveInt(config.retries, 0, 0) + 1
      },
      error
    );
  }
}
