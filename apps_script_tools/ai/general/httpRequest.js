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

function astAiNormalizeTimeoutMs(value) {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  if (!isFinite(value) || value <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

function astAiElapsedMs(startedAtMs) {
  return Math.max(0, Date.now() - startedAtMs);
}

function astAiRemainingMs(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return null;
  }

  return Math.max(0, timeoutMs - astAiElapsedMs(startedAtMs));
}

function astAiTimedOut(startedAtMs, timeoutMs) {
  if (!timeoutMs) {
    return false;
  }

  return astAiElapsedMs(startedAtMs) >= timeoutMs;
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
  const timeoutMs = astAiNormalizeTimeoutMs(config.timeoutMs);
  const startedAtMs = Date.now();

  let attempt = 0;
  let lastError = null;

  function buildTimeoutError(cause) {
    return new AstAiProviderError(
      `AI provider request exceeded timeout budget (${timeoutMs}ms)`,
      {
        url,
        timeoutMs,
        attempts: attempt + 1,
        elapsedMs: astAiElapsedMs(startedAtMs)
      },
      cause
    );
  }

  function sleepWithTimeoutBudget(backoffMs) {
    if (!timeoutMs) {
      astSleep(backoffMs);
      return;
    }

    const remainingMs = astAiRemainingMs(startedAtMs, timeoutMs);
    if (remainingMs <= 0 || backoffMs >= remainingMs) {
      throw buildTimeoutError(lastError);
    }

    astSleep(backoffMs);
  }

  while (attempt <= retries) {
    if (astAiTimedOut(startedAtMs, timeoutMs)) {
      throw buildTimeoutError(lastError);
    }

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
        if (astAiTimedOut(startedAtMs, timeoutMs)) {
          const lateSuccessError = new AstAiProviderError(
            'AI provider request exceeded timeout budget before successful response',
            {
              url,
              statusCode,
              timeoutMs,
              elapsedMs: astAiElapsedMs(startedAtMs)
            }
          );
          throw buildTimeoutError(lateSuccessError);
        }

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
          json,
          timeoutMs,
          elapsedMs: astAiElapsedMs(startedAtMs)
        }
      );

      if (astAiIsTransientHttpError(statusCode) && attempt < retries) {
        lastError = providerError;
        attempt += 1;
        sleepWithTimeoutBudget(250 * attempt);
        continue;
      }

      if (astAiTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(providerError);
      }

      throw providerError;
    } catch (error) {
      if (astAiTimedOut(startedAtMs, timeoutMs)) {
        throw buildTimeoutError(error);
      }

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
            attempts: attempt + 1,
            timeoutMs,
            elapsedMs: astAiElapsedMs(startedAtMs)
          },
          error
        );
      }

      lastError = error;
      attempt += 1;
      sleepWithTimeoutBudget(250 * attempt);
    }
  }

  throw new AstAiProviderError(
    'AI provider request failed after retries',
    {
      url,
      attempts: retries + 1,
      timeoutMs,
      elapsedMs: astAiElapsedMs(startedAtMs)
    },
    lastError
  );
}
