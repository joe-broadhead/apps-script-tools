function astStorageParseJsonSafe(text) {
  if (typeof astConfigParseJsonSafe === 'function') {
    return astConfigParseJsonSafe(text, null);
  }

  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function astStorageRedactHeaders(headers = {}) {
  const output = {};

  Object.keys(headers || {}).forEach(key => {
    const normalizedKey = String(key || '').toLowerCase();
    if (
      normalizedKey === 'authorization' ||
      normalizedKey === 'cookie' ||
      normalizedKey === 'set-cookie' ||
      normalizedKey === 'x-amz-security-token' ||
      normalizedKey === 'x-amz-credential' ||
      normalizedKey === 'x-amz-signature' ||
      normalizedKey === 'x-api-key' ||
      normalizedKey.includes('token') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('password')
    ) {
      output[key] = '[redacted]';
    } else {
      output[key] = headers[key];
    }
  });

  return output;
}

function astStorageRedactUrl(url) {
  if (typeof astConfigRedactUrl === 'function') {
    return astConfigRedactUrl(url);
  }

  const raw = astStorageNormalizeString(url, '');
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

function astStorageIsTransientHttpError(statusCode) {
  return statusCode === 429 || statusCode >= 500;
}

function astStorageMapHttpCoreError(error, context = {}) {
  const details = error && error.details ? error.details : {};
  const coreCode = error && error.code ? String(error.code) : '';
  const provider = astStorageNormalizeString(context.provider, details.provider || 'storage');
  const operation = astStorageNormalizeString(context.operation, details.operation || 'request');
  const url = astStorageRedactUrl(astStorageNormalizeString(context.url, details.url || ''));
  const timeoutMs = context.timeoutMs == null ? details.timeoutMs : context.timeoutMs;
  const attempts = details.attempts;
  const elapsedMs = details.elapsedMs;

  if (coreCode === 'validation') {
    return new AstStorageValidationError('Storage HTTP request requires a non-empty url');
  }

  if (coreCode === 'unavailable') {
    return new AstStorageProviderError('UrlFetchApp.fetch is not available in this runtime', {
      provider,
      operation,
      url
    });
  }

  if (coreCode === 'http_status') {
    return new AstStorageProviderError(
      `Storage provider request failed with status ${details.statusCode}`,
      {
        provider,
        operation,
        url,
        statusCode: details.statusCode,
        body: details.body,
        json: details.json,
        request: {
          method: details.method || context.method || 'get',
          headers: astStorageRedactHeaders(details.requestHeaders || context.headers || {})
        }
      },
      error.cause || null
    );
  }

  if (coreCode === 'timeout') {
    return new AstStorageProviderError(
      `Storage provider request exceeded timeout budget (${timeoutMs}ms)`,
      {
        provider,
        operation,
        url,
        timeoutMs,
        attempts,
        elapsedMs
      },
      error.cause || null
    );
  }

  if (coreCode === 'failure') {
    return new AstStorageProviderError(
      'Storage provider request failed',
      {
        provider,
        operation,
        url,
        attempts,
        timeoutMs,
        elapsedMs
      },
      error.cause || null
    );
  }

  if (coreCode === 'retry_exhausted') {
    return new AstStorageProviderError(
      'Storage provider request failed after retries',
      {
        provider,
        operation,
        url,
        attempts,
        timeoutMs,
        elapsedMs
      },
      error.cause || null
    );
  }

  return new AstStorageProviderError(
    'Storage provider request failed',
    {
      provider,
      operation,
      url,
      attempts,
      timeoutMs,
      elapsedMs
    },
    error || null
  );
}

function astStorageHttpRequest(config = {}) {
  const provider = astStorageNormalizeString(config.provider, 'storage');
  const operation = astStorageNormalizeString(config.operation, 'request');
  const url = astStorageNormalizeString(config.url, '');
  const redactedUrl = astStorageRedactUrl(url);
  const retries = Number.isInteger(config.retries) ? Math.max(0, config.retries) : 0;
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
      method: astStorageNormalizeString(config.method, 'get').toLowerCase(),
      retries,
      timeoutMs,
      headers: astStorageIsPlainObject(config.headers) ? config.headers : {},
      contentType: config.contentType,
      payload: typeof config.payload !== 'undefined' ? config.payload : undefined,
      followRedirects: config.followRedirects,
      validateHttpsCertificates: config.validateHttpsCertificates,
      serializeJsonPayload: false,
      parseJson: astStorageParseJsonSafe,
      isTransientStatus: astStorageIsTransientHttpError
    });
  } catch (error) {
    if (error && error.name === 'AstConfigHttpCoreError') {
      throw astStorageMapHttpCoreError(error, {
        provider,
        operation,
        url: redactedUrl,
        timeoutMs,
        method: astStorageNormalizeString(config.method, 'get').toLowerCase(),
        headers: astStorageIsPlainObject(config.headers) ? config.headers : {}
      });
    }
    if (error && (error.name === 'AstStorageValidationError' || error.name === 'AstStorageProviderError')) {
      throw error;
    }
    throw new AstStorageProviderError(
      'Storage provider request failed',
      {
        provider,
        operation,
        url: redactedUrl,
        attempts: retries + 1,
        timeoutMs
      },
      error
    );
  }
}
