function astParseJsonSafe(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function astSleep(milliseconds) {
  const ms = Math.max(0, Math.floor(milliseconds || 0));

  if (ms === 0) {
    return;
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.sleep === 'function') {
    Utilities.sleep(ms);
  }
}

function astAiIsTransientHttpError(statusCode) {
  return statusCode === 429 || statusCode >= 500;
}

function astAiHttpRequest(config = {}) {
  const url = typeof config.url === 'string' ? config.url.trim() : '';

  if (!url) {
    throw new AstAiValidationError('AI HTTP request requires a non-empty url');
  }

  if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw new AstAiProviderError('UrlFetchApp.fetch is not available in this runtime', { url });
  }

  const method = String(config.method || 'post').toLowerCase();
  const retries = Number.isInteger(config.retries)
    ? Math.max(0, config.retries)
    : 0;

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      const options = {
        method,
        muteHttpExceptions: true,
        headers: config.headers || {}
      };

      if (typeof config.contentType === 'string' && config.contentType.trim().length > 0) {
        options.contentType = config.contentType.trim();
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
      const json = astParseJsonSafe(body);

      if (statusCode >= 200 && statusCode < 300) {
        return {
          statusCode,
          body,
          json,
          response
        };
      }

      const providerError = new AstAiProviderError(
        `AI provider request failed with status ${statusCode}`,
        {
          url,
          statusCode,
          body,
          json
        }
      );

      if (astAiIsTransientHttpError(statusCode) && attempt < retries) {
        lastError = providerError;
        attempt += 1;
        astSleep(250 * attempt);
        continue;
      }

      throw providerError;
    } catch (error) {
      if (error && error.name === 'AstAiProviderError') {
        const statusCode = Number(error.details && error.details.statusCode);
        if (!astAiIsTransientHttpError(statusCode) || attempt >= retries) {
          throw error;
        }
      }

      if (attempt >= retries) {
        throw new AstAiProviderError(
          'AI provider request failed',
          {
            url,
            attempts: attempt + 1
          },
          error
        );
      }

      lastError = error;
      attempt += 1;
      astSleep(250 * attempt);
    }
  }

  throw new AstAiProviderError(
    'AI provider request failed after retries',
    {
      url,
      attempts: retries + 1
    },
    lastError
  );
}
