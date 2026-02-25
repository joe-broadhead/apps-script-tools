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
    if (normalizedKey === 'authorization' || normalizedKey === 'x-amz-security-token') {
      output[key] = '[redacted]';
    } else {
      output[key] = headers[key];
    }
  });

  return output;
}

function astStorageIsTransientHttpError(statusCode) {
  return statusCode === 429 || statusCode >= 500;
}

function astStorageMapHttpCoreError(error, context = {}) {
  const details = error && error.details ? error.details : {};
  const coreCode = error && error.code ? String(error.code) : '';
  const provider = astStorageNormalizeString(context.provider, details.provider || 'storage');
  const operation = astStorageNormalizeString(context.operation, details.operation || 'request');
  const url = astStorageNormalizeString(context.url, details.url || '');
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
        url,
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
        url,
        attempts: retries + 1,
        timeoutMs
      },
      error
    );
  }
}
