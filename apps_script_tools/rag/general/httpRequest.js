function astRagSleep(milliseconds) {
  const ms = Math.max(0, Math.floor(milliseconds || 0));
  if (ms === 0) {
    return;
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.sleep === 'function') {
    Utilities.sleep(ms);
  }
}

function astRagIsTransientHttpError(statusCode) {
  return statusCode === 429 || statusCode >= 500;
}

function astRagHttpRequest(config = {}) {
  const url = astRagNormalizeString(config.url, null);
  if (!url) {
    throw new AstRagValidationError('RAG HTTP request requires a non-empty url');
  }

  if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw new AstRagError('UrlFetchApp.fetch is not available in this runtime', { url });
  }

  const method = astRagNormalizeString(config.method, 'post').toLowerCase();
  const retries = astRagNormalizePositiveInt(config.retries, 0, 0);

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      const options = {
        method,
        muteHttpExceptions: true,
        headers: astRagIsPlainObject(config.headers) ? config.headers : {}
      };

      if (astRagNormalizeString(config.contentType, null)) {
        options.contentType = config.contentType;
      }

      if (typeof config.payload !== 'undefined' && config.payload !== null) {
        if (!options.contentType) {
          options.contentType = 'application/json';
        }

        options.payload = typeof config.payload === 'string'
          ? config.payload
          : JSON.stringify(config.payload);
      }

      const response = UrlFetchApp.fetch(url, options);
      const statusCode = typeof response.getResponseCode === 'function'
        ? response.getResponseCode()
        : 200;
      const body = typeof response.getContentText === 'function'
        ? response.getContentText()
        : '';
      const json = astRagSafeJsonParse(body, null);

      if (statusCode >= 200 && statusCode < 300) {
        return {
          statusCode,
          body,
          json,
          response
        };
      }

      const providerError = new AstRagError(`RAG provider request failed with status ${statusCode}`, {
        url,
        statusCode,
        body,
        json
      });

      if (astRagIsTransientHttpError(statusCode) && attempt < retries) {
        lastError = providerError;
        attempt += 1;
        astRagSleep(250 * attempt);
        continue;
      }

      throw providerError;
    } catch (error) {
      if (error && error.name === 'AstRagError') {
        const statusCode = Number(error.details && error.details.statusCode);
        if (!astRagIsTransientHttpError(statusCode) || attempt >= retries) {
          throw error;
        }
      }

      if (attempt >= retries) {
        throw new AstRagError(
          'RAG provider request failed',
          {
            url,
            attempts: attempt + 1
          },
          error
        );
      }

      lastError = error;
      attempt += 1;
      astRagSleep(250 * attempt);
    }
  }

  throw new AstRagError('RAG provider request failed after retries', {
    url,
    attempts: retries + 1
  }, lastError);
}
