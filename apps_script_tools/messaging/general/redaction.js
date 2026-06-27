const AST_MESSAGING_REDACTED_TOKEN = typeof AST_TELEMETRY_REDACTED_TOKEN === 'string'
  ? AST_TELEMETRY_REDACTED_TOKEN
  : '[REDACTED]';

const AST_MESSAGING_SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie|credential|webhook[_-]?url|webhook|service[_-]?account|private[_-]?key|client[_-]?secret)/i;

function astMessagingShouldRedactKey(key) {
  return AST_MESSAGING_SENSITIVE_KEY_PATTERN.test(String(key || ''));
}

function astMessagingRedactString(value) {
  const source = String(value);
  const trimmed = source.trim();

  if (
    (trimmed.charAt(0) === '{' && trimmed.charAt(trimmed.length - 1) === '}')
    || (trimmed.charAt(0) === '[' && trimmed.charAt(trimmed.length - 1) === ']')
  ) {
    try {
      return JSON.stringify(astMessagingRedactValueFallback(JSON.parse(source), 0, null));
    } catch (_error) {
      // Fall back to scalar string redaction below.
    }
  }

  if (typeof astTelemetryRedactValue === 'function') {
    return astTelemetryRedactValue(source, { redactSecrets: true, maxDepth: 1 });
  }
  if (typeof astTelemetryRedactUrl === 'function') {
    const wholeUrlRedacted = astTelemetryRedactUrl(source);
    if (wholeUrlRedacted !== source) {
      return wholeUrlRedacted;
    }
    return source.replace(/https?:\/\/[^\s'"<>]+/g, match => astTelemetryRedactUrl(match));
  }
  return source;
}

function astMessagingRedactValueFallback(value, depth = 0, seen = null) {
  if (value == null) {
    return value;
  }
  if (typeof value === 'string') {
    return astMessagingRedactString(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return '[Function]';
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (depth >= 8) {
    return '[DepthLimit]';
  }

  const visited = seen || new WeakSet();
  if (visited.has(value)) {
    return '[Circular]';
  }
  visited.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map(item => astMessagingRedactValueFallback(item, depth + 1, visited));
    }

    const output = {};
    Object.keys(value).forEach(key => {
      if (astMessagingShouldRedactKey(key)) {
        output[key] = AST_MESSAGING_REDACTED_TOKEN;
        return;
      }
      output[key] = astMessagingRedactValueFallback(value[key], depth + 1, visited);
    });
    return output;
  } finally {
    visited.delete(value);
  }
}

function astMessagingRedactValue(value, options = {}) {
  void options;
  return astMessagingRedactValueFallback(value, 0, null);
}

function astMessagingRedactWebhookUrl(_value) {
  return AST_MESSAGING_REDACTED_TOKEN;
}

function astMessagingRedactEndpointUrl(value) {
  const normalized = astMessagingNormalizeString(value, '');
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^/?#]*)/);
  if (!match) {
    return AST_MESSAGING_REDACTED_TOKEN;
  }
  const authority = match[2] || '';
  const hostPort = authority.indexOf('@') >= 0
    ? authority.slice(authority.lastIndexOf('@') + 1)
    : authority;
  return `${match[1]}${hostPort}`;
}

function astMessagingRedactHttpResponse(response = {}, requestUrl = '') {
  const safeResponse = astMessagingRedactValue(response || {});
  if (safeResponse && typeof safeResponse === 'object') {
    if (typeof response.text !== 'undefined' && typeof astMessagingHttpRedactResponseText === 'function') {
      safeResponse.text = astMessagingHttpRedactResponseText(response.text, requestUrl);
    }
    const parsedSafeText = typeof astMessagingHttpParseJson === 'function'
      ? astMessagingHttpParseJson(safeResponse.text)
      : null;
    if (parsedSafeText && typeof parsedSafeText === 'object') {
      safeResponse.json = astMessagingRedactValue(parsedSafeText);
    } else if (response.json && typeof response.json === 'object') {
      safeResponse.json = astMessagingRedactValue(response.json);
    }
    if (response.headers && typeof response.headers === 'object') {
      const safeHeaders = astMessagingRedactValue(response.headers);
      const headerNameRedactions = typeof astMessagingHttpRedactHeaders === 'function'
        ? astMessagingHttpRedactHeaders(response.headers)
        : {};
      Object.keys(headerNameRedactions).forEach(key => {
        if (astMessagingShouldRedactKey(key)) {
          return;
        }
        if (headerNameRedactions[key] !== response.headers[key]) {
          safeHeaders[key] = headerNameRedactions[key];
        }
      });
      Object.keys(response.headers).forEach(key => {
        if (astMessagingShouldRedactKey(key)) {
          return;
        }
        if (typeof response.headers[key] === 'string' && typeof astMessagingHttpSanitizeErrorMessage === 'function') {
          safeHeaders[key] = astMessagingHttpSanitizeErrorMessage({ message: response.headers[key] }, requestUrl);
        }
      });
      safeResponse.headers = safeHeaders;
    }
  }
  return safeResponse;
}

function astMessagingRedactHttpResponsePayload(response = {}, requestUrl = '') {
  const safeResponse = astMessagingRedactHttpResponse(response, requestUrl);
  if (safeResponse && safeResponse.json) {
    return safeResponse.json;
  }
  return {
    statusCode: response.statusCode,
    text: safeResponse && typeof safeResponse.text !== 'undefined' ? safeResponse.text : ''
  };
}
