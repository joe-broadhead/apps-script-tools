function astStorageParseJsonSafe(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function astStorageSleep(milliseconds) {
  const ms = Math.max(0, Math.floor(milliseconds || 0));
  if (ms === 0) {
    return;
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.sleep === 'function') {
    Utilities.sleep(ms);
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

function astStorageNormalizeTimeoutMs(value) {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  if (!isFinite(value) || value <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

function astStorageElapsedMs(startedAtMs) {
  return Math.max(0, Date.now() - startedAtMs);
}

function astStorageRemainingMs(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return null;
  }
  return Math.max(0, timeoutMs - astStorageElapsedMs(startedAtMs));
}

function astStorageTimedOut(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return false;
  }
  return astStorageElapsedMs(startedAtMs) >= timeoutMs;
}

function astStorageHttpRequest(config = {}) {
  const url = astStorageNormalizeString(config.url, '');
  const provider = astStorageNormalizeString(config.provider, 'storage');
  const operation = astStorageNormalizeString(config.operation, 'request');

  if (!url) {
    throw new AstStorageValidationError('Storage HTTP request requires a non-empty url');
  }

  if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw new AstStorageProviderError('UrlFetchApp.fetch is not available in this runtime', {
      provider,
      operation,
      url
    });
  }

  const method = astStorageNormalizeString(config.method, 'get').toLowerCase();
  const retries = Number.isInteger(config.retries) ? Math.max(0, config.retries) : 0;
  const timeoutMs = astStorageNormalizeTimeoutMs(config.timeoutMs);
  const startedAtMs = Date.now();

  let attempt = 0;
  let lastError = null;

  function buildTimeoutError(cause) {
    return new AstStorageProviderError(
      `Storage provider request exceeded timeout budget (${timeoutMs}ms)`,
      {
        provider,
        operation,
        url,
        timeoutMs,
        attempts: attempt + 1,
        elapsedMs: astStorageElapsedMs(startedAtMs)
      },
      cause
    );
  }

  function sleepWithTimeoutBudget(backoffMs) {
    if (!timeoutMs) {
      astStorageSleep(backoffMs);
      return;
    }

    const remainingMs = astStorageRemainingMs(startedAtMs, timeoutMs);
    if (remainingMs <= 0) {
      throw buildTimeoutError(lastError);
    }

    if (backoffMs >= remainingMs) {
      throw buildTimeoutError(lastError);
    }

    astStorageSleep(backoffMs);
  }

  while (attempt <= retries) {
    if (astStorageTimedOut(startedAtMs, timeoutMs)) {
      throw buildTimeoutError(lastError);
    }

    try {
      const options = {
        method,
        muteHttpExceptions: true,
        headers: astStorageIsPlainObject(config.headers) ? config.headers : {}
      };

      if (typeof config.contentType === 'string' && config.contentType.trim().length > 0) {
        options.contentType = config.contentType.trim();
      }

      if (typeof config.payload !== 'undefined') {
        options.payload = config.payload;
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
      const json = astStorageParseJsonSafe(body);
      const headers = typeof response.getAllHeaders === 'function'
        ? response.getAllHeaders()
        : {};

      if (statusCode >= 200 && statusCode < 300) {
        return {
          statusCode,
          body,
          json,
          headers,
          response
        };
      }

      const providerError = new AstStorageProviderError(
        `Storage provider request failed with status ${statusCode}`,
        {
          provider,
          operation,
          url,
          statusCode,
          body,
          json,
          request: {
            method,
            headers: astStorageRedactHeaders(options.headers)
          }
        }
      );

      if (astStorageIsTransientHttpError(statusCode) && attempt < retries) {
        lastError = providerError;
        attempt += 1;
        sleepWithTimeoutBudget(250 * attempt);
        continue;
      }

      if (astStorageTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(providerError);
      }

      throw providerError;
    } catch (error) {
      if (astStorageTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(error);
      }

      if (
        error &&
        error.name === 'AstStorageProviderError' &&
        (!error.details || !astStorageIsTransientHttpError(error.details.statusCode) || attempt >= retries)
      ) {
        throw error;
      }

      if (attempt >= retries) {
        throw new AstStorageProviderError(
          'Storage provider request failed',
          {
            provider,
            operation,
            url,
            attempts: attempt + 1,
            timeoutMs,
            elapsedMs: astStorageElapsedMs(startedAtMs)
          },
          error
        );
      }

      lastError = error;
      attempt += 1;
      sleepWithTimeoutBudget(250 * attempt);
    }
  }

  throw new AstStorageProviderError(
    'Storage provider request failed after retries',
    {
      provider,
      operation,
      url,
      attempts: retries + 1,
      timeoutMs,
      elapsedMs: astStorageElapsedMs(startedAtMs)
    },
    lastError
  );
}
