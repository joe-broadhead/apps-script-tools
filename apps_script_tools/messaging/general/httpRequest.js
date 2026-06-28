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
    if (
      ['authorization', 'proxy-authorization', 'x-api-key', 'cookie', 'set-cookie'].includes(lower)
      || (typeof astMessagingShouldRedactKey === 'function' && astMessagingShouldRedactKey(key))
    ) {
      output[key] = '<redacted>';
      return;
    }
    output[key] = typeof headers[key] === 'string'
      ? astMessagingRedactString(headers[key])
      : astMessagingRedactValue(headers[key]);
  });
  return output;
}

function astMessagingHttpRedactUrl(url) {
  if (typeof astMessagingRedactEndpointUrl === 'function') {
    return astMessagingRedactEndpointUrl(url);
  }
  return '[REDACTED]';
}

function astMessagingHttpEscapeForwardSlashes(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\//g, '\\/');
}

function astMessagingHttpEncodeVariant(value, encoder) {
  try {
    const encoded = encoder(String(value || ''));
    return encoded && encoded !== value ? encoded : null;
  } catch (_error) {
    return null;
  }
}

function astMessagingHttpBuildRedactionVariants(value) {
  const source = String(value || '');
  if (!source) {
    return [];
  }

  const variants = [
    source,
    astMessagingHttpEscapeForwardSlashes(source),
    astMessagingHttpEncodeVariant(source, encodeURI),
    astMessagingHttpEncodeVariant(source, encodeURIComponent)
  ];
  const unique = [];
  variants.forEach(variant => {
    if (variant && unique.indexOf(variant) === -1) {
      unique.push(variant);
    }
  });
  return unique;
}

function astMessagingHttpReplaceVariants(message, variants, redactedUrl) {
  let output = String(message || '');
  variants.forEach(variant => {
    output = output.split(variant).join(redactedUrl);
  });
  return output;
}

function astMessagingHttpSanitizeErrorMessage(error, rawUrl) {
  const fallback = 'Messaging provider request failed';
  const message = error && typeof error.message !== 'undefined'
    ? String(error.message)
    : String(error || fallback);
  const exactRawUrl = astMessagingHttpNormalizeString(rawUrl, '');
  const redactedUrl = astMessagingHttpRedactUrl(exactRawUrl) || '[REDACTED]';
  let output = exactRawUrl
    ? astMessagingHttpReplaceVariants(message, astMessagingHttpBuildRedactionVariants(exactRawUrl), redactedUrl)
    : message;
  if (exactRawUrl) {
    output = astMessagingHttpRedactRelativeRequestEchoes(output, exactRawUrl, redactedUrl);
  }

  output = output.replace(/https?:\\\/\\\/[^\s'"<>]+/g, match => {
    return astMessagingHttpRedactMessageUrl(match, exactRawUrl);
  });

  output = output.replace(/https?:\/\/[^\s'"<>]+/g, match => {
    return astMessagingHttpRedactMessageUrl(match, exactRawUrl);
  });

  return astMessagingRedactString(output) || fallback;
}

function astMessagingHttpParseUrlParts(value) {
  const normalized = astMessagingHttpNormalizeString(value, '');
  const match = normalized.match(/^([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1].toLowerCase(),
    authority: match[2].toLowerCase(),
    path: match[3] || '',
    query: match[4] || '',
    fragment: match[5] || ''
  };
}

function astMessagingHttpEscapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function astMessagingHttpReplaceRelativeEcho(message, variant, redactedUrl) {
  const pattern = new RegExp(`(^|[^A-Za-z0-9.])${astMessagingHttpEscapeRegExp(variant)}`, 'g');
  return String(message || '').replace(pattern, (match, prefix) => `${prefix}${redactedUrl}`);
}

function astMessagingHttpRedactRelativeRequestEchoes(message, requestUrl, redactedUrl) {
  const request = astMessagingHttpParseUrlParts(requestUrl);
  if (!request) {
    return message;
  }

  const pathAndQuery = `${request.path || ''}${request.query || ''}`;
  const pathOnly = request.path || '';
  const variants = [];
  if (pathAndQuery && pathAndQuery !== '/') {
    variants.push(pathAndQuery);
  }
  if (pathOnly && pathOnly !== '/' && pathOnly !== pathAndQuery) {
    variants.push(pathOnly);
  }

  let output = message;
  variants.forEach(variant => {
    output = astMessagingHttpReplaceRelativeEcho(output, variant, redactedUrl);
    astMessagingHttpBuildRedactionVariants(variant).forEach(encodedVariant => {
      if (encodedVariant !== variant) {
        output = astMessagingHttpReplaceRelativeEcho(output, encodedVariant, redactedUrl);
      }
    });
  });
  return output;
}

function astMessagingHttpNormalizePathForCompare(path) {
  const normalized = String(path || '').replace(/\/+$/g, '');
  return normalized || '/';
}

function astMessagingHttpIsSameRequestEndpoint(candidateUrl, requestUrl) {
  const candidate = astMessagingHttpParseUrlParts(candidateUrl);
  const request = astMessagingHttpParseUrlParts(requestUrl);
  if (!candidate || !request) {
    return false;
  }
  if (candidate.scheme !== request.scheme || candidate.authority !== request.authority) {
    return false;
  }

  const candidatePath = astMessagingHttpNormalizePathForCompare(candidate.path);
  const requestPath = astMessagingHttpNormalizePathForCompare(request.path);
  return candidatePath === requestPath
    || candidatePath.startsWith(`${requestPath}/`)
    || requestPath.startsWith(`${candidatePath}/`);
}

function astMessagingHttpRedactMessageUrl(value, requestUrl) {
  const normalized = String(value || '').replace(/\\\//g, '/');
  if (requestUrl && astMessagingHttpIsSameRequestEndpoint(normalized, requestUrl)) {
    return astMessagingHttpRedactUrl(requestUrl);
  }
  if (typeof astTelemetryRedactUrl === 'function') {
    return astTelemetryRedactUrl(normalized);
  }
  return '[REDACTED]';
}

function astMessagingHttpIsMessagingError(error) {
  return error instanceof AstMessagingError;
}

function astMessagingHttpWrapTransportError(error, requestContext = {}) {
  const sanitizedMessage = astMessagingHttpSanitizeErrorMessage(error, requestContext.url);
  const sanitizedCause = error
    ? {
        name: error.name || 'Error',
        message: sanitizedMessage
      }
    : null;

  return new AstMessagingProviderError('Messaging provider request failed', {
    method: requestContext.method,
    url: astMessagingHttpRedactUrl(requestContext.url),
    headers: astMessagingHttpRedactHeaders(requestContext.headers || {}),
    message: sanitizedMessage,
    classification: 'transport'
  }, sanitizedCause);
}

function astMessagingHttpRedactResponseText(text, requestUrl) {
  const source = typeof text === 'undefined' || text === null ? '' : String(text);
  if (!source) {
    return '';
  }

  const sanitized = astMessagingHttpSanitizeErrorMessage({ message: source }, requestUrl);
  const parsed = astMessagingHttpParseJson(sanitized);
  if (parsed && typeof parsed === 'object') {
    try {
      return JSON.stringify(astMessagingRedactValue(parsed));
    } catch (_error) {
      return astMessagingRedactString(sanitized);
    }
  }
  if (typeof parsed === 'string') {
    return astMessagingRedactString(parsed);
  }
  return astMessagingRedactString(sanitized);
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
    url: astMessagingHttpRedactUrl(requestContext.url),
    headers: astMessagingHttpRedactHeaders(requestContext.headers || {}),
    responseText: astMessagingHttpRedactResponseText(response.text || '', requestContext.url)
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

function astMessagingHttpCanRetryError(error) {
  if (!error) {
    return false;
  }

  if (
    error instanceof AstMessagingValidationError
    || error instanceof AstMessagingAuthError
    || error instanceof AstMessagingNotFoundError
  ) {
    return false;
  }

  const statusCode = Number(error.details && error.details.statusCode);
  if (Number.isFinite(statusCode) && statusCode > 0) {
    return astMessagingHttpShouldRetryStatus(statusCode);
  }

  return true;
}

function astMessagingHttpThrowTimeout(requestContext = {}, timeoutMs = null, startedAtMs = 0) {
  throw new AstMessagingProviderError('Messaging provider request timed out', {
    method: requestContext.method,
    url: astMessagingHttpRedactUrl(requestContext.url),
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
      if (attempt < retries && astMessagingHttpCanRetryError(error)) {
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
      if (!astMessagingHttpIsMessagingError(error)) {
        throw astMessagingHttpWrapTransportError(error, {
          method: method.toUpperCase(),
          url: normalizedUrl,
          headers
        });
      }
      throw error;
    }
  }

  throw new AstMessagingProviderError('Messaging provider request failed', {
    url: astMessagingHttpRedactUrl(normalizedUrl),
    method: method.toUpperCase(),
    message: astMessagingHttpSanitizeErrorMessage(lastError, normalizedUrl),
    classification: 'transport'
  });
}
