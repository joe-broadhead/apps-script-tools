const AST_TELEMETRY_REDACTED_TOKEN = '[REDACTED]';
const AST_TELEMETRY_SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie|credential|webhook[_-]?url|webhook|service[_-]?account|private[_-]?key|client[_-]?secret)/i;
const AST_TELEMETRY_SENSITIVE_QUERY_KEY_PATTERN = /^(api[_-]?key|key|access[_-]?token|auth[_-]?token|id[_-]?token|refresh[_-]?token|token|secret|client[_-]?secret|credential|credentials|password|signature|sig|code)$/i;
const AST_TELEMETRY_MAX_REDACTION_DEPTH = 8;

function astTelemetryShouldRedactKey(key) {
  const normalized = astTelemetryNormalizeString(String(key || ''), '');
  if (!normalized) {
    return false;
  }

  return AST_TELEMETRY_SENSITIVE_KEY_PATTERN.test(normalized);
}

function astTelemetrySafeDecodeComponent(value) {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch (_error) {
    return String(value || '');
  }
}

function astTelemetryGetAuthorityHostPort(authority) {
  const normalized = String(authority || '');
  const withoutCredentials = normalized.indexOf('@') >= 0
    ? normalized.slice(normalized.lastIndexOf('@') + 1)
    : normalized;
  return withoutCredentials;
}

function astTelemetryGetAuthorityHost(authority) {
  const hostPort = astTelemetryGetAuthorityHostPort(authority);
  if (hostPort.charAt(0) === '[') {
    const endIndex = hostPort.indexOf(']');
    return endIndex >= 0 ? hostPort.slice(1, endIndex).toLowerCase() : hostPort.toLowerCase();
  }
  return hostPort.split(':')[0].toLowerCase();
}

function astTelemetryRedactAuthorityCredentials(authority) {
  const normalized = String(authority || '');
  if (normalized.indexOf('@') < 0) {
    return normalized;
  }
  return `${AST_TELEMETRY_REDACTED_TOKEN}@${normalized.slice(normalized.lastIndexOf('@') + 1)}`;
}

function astTelemetryRedactUrlQuery(query) {
  const normalized = String(query || '');
  if (!normalized) {
    return '';
  }

  const prefix = normalized.charAt(0) === '?' ? '?' : '';
  const body = prefix ? normalized.slice(1) : normalized;
  if (!body) {
    return normalized;
  }

  return prefix + body.split('&').map(part => {
    if (!part) {
      return part;
    }
    const equalsIndex = part.indexOf('=');
    const rawKey = equalsIndex >= 0 ? part.slice(0, equalsIndex) : part;
    const key = astTelemetrySafeDecodeComponent(rawKey);
    if (!AST_TELEMETRY_SENSITIVE_QUERY_KEY_PATTERN.test(key) && !astTelemetryShouldRedactKey(key)) {
      return part;
    }
    return `${rawKey}=${AST_TELEMETRY_REDACTED_TOKEN}`;
  }).join('&');
}

function astTelemetryRedactUrlFragment(fragment) {
  const normalized = String(fragment || '');
  if (!normalized) {
    return '';
  }

  const body = normalized.charAt(0) === '#' ? normalized.slice(1) : normalized;
  if (/(^|[?&#])(api[_-]?key|key|access[_-]?token|auth[_-]?token|id[_-]?token|refresh[_-]?token|token|secret|client[_-]?secret|credential|credentials|password|signature|sig|code)=/i.test(body)) {
    return '#[REDACTED]';
  }
  return normalized;
}

function astTelemetryIsKnownWebhookUrl(host, pathName) {
  const hostName = String(host || '').toLowerCase();
  const path = String(pathName || '');
  const matchesHost = candidates => {
    for (let idx = 0; idx < candidates.length; idx += 1) {
      const candidate = candidates[idx];
      if (hostName === candidate || hostName.endsWith(`.${candidate}`)) {
        return true;
      }
    }
    return false;
  };
  return (
    (matchesHost(['hooks.slack.com']) && /^\/services\//i.test(path))
    || (matchesHost(['chat.googleapis.com']) && /\/spaces\/[^/]+\/messages/i.test(path))
    || matchesHost(['logic.azure.com', 'outlook.office.com', 'outlook.office365.com', 'webhook.office.com', 'webhook.office365.com'])
  );
}

function astTelemetryIsGenericWebhookPath(pathName) {
  return /(^|\/)(webhook|webhooks|webhookb2|hooks)(\/|$)/i.test(String(pathName || ''));
}

function astTelemetryRedactUrl(value) {
  const normalized = String(value);
  const match = normalized.match(/^([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^/?#\s'"<>]*)([^?#\s'"<>]*)(\?[^#\s'"<>]*)?(#[^\s'"<>]*)?$/);
  if (!match) {
    return normalized;
  }

  const scheme = match[1];
  const authority = match[2] || '';
  const pathName = match[3] || '';
  const query = match[4] || '';
  const fragment = match[5] || '';
  const host = astTelemetryGetAuthorityHost(authority);

  if (astTelemetryIsKnownWebhookUrl(host, pathName) || astTelemetryIsGenericWebhookPath(pathName)) {
    return `${scheme}${astTelemetryGetAuthorityHostPort(authority)}/[REDACTED]`;
  }

  return `${scheme}${astTelemetryRedactAuthorityCredentials(authority)}${pathName}${astTelemetryRedactUrlQuery(query)}${astTelemetryRedactUrlFragment(fragment)}`;
}

function astTelemetryRedactPlainTextSecrets(value) {
  let output = String(value);
  const secretKeySource = '(?:x[-_])?api[-_]?key|access[-_]?token|auth[-_]?token|id[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|credential|credentials|password|signature|sig|private[-_]?key|service[-_]?account|authorization|proxy[-_]?authorization|cookie|set[-_]?cookie';
  const quotedSecretKeyPattern = new RegExp(`(["'])(${secretKeySource})\\1(\\s*:\\s*)(["'])([^"']*)\\4`, 'gi');

  output = output.replace(
    quotedSecretKeyPattern,
    (_match, keyQuote, key, separator, valueQuote) => `${keyQuote}${key}${keyQuote}${separator}${valueQuote}${AST_TELEMETRY_REDACTED_TOKEN}${valueQuote}`
  );

  output = output.replace(
    /\b(authorization|proxy-authorization)\b(\s*:\s*)(["'])([A-Za-z][A-Za-z0-9._-]*)(\s+)([^"']*)\3/gi,
    (_match, key, separator, quote, scheme, spacing) => `${key}${separator}${quote}${scheme}${spacing}${AST_TELEMETRY_REDACTED_TOKEN}${quote}`
  );

  output = output.replace(
    /\b(authorization|proxy-authorization)\b(\s*:\s*)(["'])([^"']*)\3/gi,
    (match, key, separator, quote, headerValue) => {
      if (/^[A-Za-z][A-Za-z0-9._-]*\s+\[REDACTED\]$/.test(headerValue)) {
        return match;
      }
      return `${key}${separator}${quote}${AST_TELEMETRY_REDACTED_TOKEN}${quote}`;
    }
  );

  output = output.replace(
    /\b(authorization|proxy-authorization)\b(\s*:\s*)([A-Za-z][A-Za-z0-9._-]*)(\s+)([^\s'"`,;&<>()\[\]{}]+)/gi,
    (_match, key, separator, scheme, spacing) => `${key}${separator}${scheme}${spacing}${AST_TELEMETRY_REDACTED_TOKEN}`
  );

  output = output.replace(
    /\b(authorization|proxy-authorization)\b(\s*:\s*)(?!["'])(?![A-Za-z][A-Za-z0-9._-]*\s+\[REDACTED\])([^\s'"`,;&<>()\[\]{}]+)/gi,
    (_match, key, separator) => `${key}${separator}${AST_TELEMETRY_REDACTED_TOKEN}`
  );

  output = output.replace(
    /\b(cookie|set-cookie)\b(\s*:\s*)(["'])([^"']*)\3/gi,
    (_match, key, separator, quote) => `${key}${separator}${quote}${AST_TELEMETRY_REDACTED_TOKEN}${quote}`
  );

  output = output.replace(
    /\b(cookie|set-cookie)\b(\s*:\s*)(?!["'])([^\r\n]*)/gi,
    (_match, key, separator) => `${key}${separator}${AST_TELEMETRY_REDACTED_TOKEN}`
  );

  output = output.replace(/\b(bearer)\s+[A-Za-z0-9._~+/=-]+/gi, (_match, scheme) => {
    return `${scheme} ${AST_TELEMETRY_REDACTED_TOKEN}`;
  });

  return output.replace(
    /\b((?:x[-_])?api[-_]?key|access[-_]?token|auth[-_]?token|id[-_]?token|refresh[-_]?token|token|secret|client[-_]?secret|credential|credentials|password|signature|sig|private[-_]?key|service[-_]?account|cookie|set[-_]?cookie)\b(\s*[:=]\s*)(["']?)([^\s'"`,;&<>()\[\]{}]+)/gi,
    (_match, key, separator, quote) => `${key}${separator}${quote}${AST_TELEMETRY_REDACTED_TOKEN}`
  );
}

function astTelemetryRedactString(value) {
  const normalized = String(value);
  if (/^bearer\s+/i.test(normalized)) {
    return 'Bearer [REDACTED]';
  }

  let output = normalized;
  if (/AIza[0-9A-Za-z\-_]{10,}/.test(output)) {
    output = output.replace(/AIza[0-9A-Za-z\-_]{10,}/g, AST_TELEMETRY_REDACTED_TOKEN);
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s'"<>]+$/.test(output)) {
    const wholeUrlRedacted = astTelemetryRedactUrl(output);
    if (wholeUrlRedacted !== output) {
      return wholeUrlRedacted;
    }
  }

  output = output.replace(/https?:\\\/\\\/[^\s'"<>]+/g, match => {
    return astTelemetryRedactUrl(match.replace(/\\\//g, '/'));
  });

  output = output.replace(/https?:\/\/[^\s'"<>]+/g, match => astTelemetryRedactUrl(match));

  return astTelemetryRedactPlainTextSecrets(output);
}

function astTelemetrySanitizePrimitive(value, options = {}) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value === 'symbol') {
    return String(value);
  }

  if (typeof value === 'string' && astTelemetryNormalizeBoolean(options.redactSecrets, true)) {
    return astTelemetryRedactString(value);
  }

  return value;
}

function astTelemetryRedactValue(value, options = {}, path = [], depth = 0, seen = null) {
  const maxDepth = astTelemetryNormalizeNumber(
    options.maxDepth,
    AST_TELEMETRY_MAX_REDACTION_DEPTH,
    1,
    50
  );

  if (value == null || typeof value !== 'object') {
    return astTelemetrySanitizePrimitive(value, options);
  }

  if (depth >= maxDepth) {
    return '[DepthLimit]';
  }

  const visited = seen || new WeakSet();
  if (visited.has(value)) {
    return '[Circular]';
  }
  visited.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        return astTelemetryRedactValue(item, options, path.concat(String(index)), depth + 1, visited);
      });
    }

    const output = {};
    const keys = Object.keys(value);

    for (let idx = 0; idx < keys.length; idx += 1) {
      const key = keys[idx];
      const itemPath = path.concat(key);
      const shouldRedact = astTelemetryNormalizeBoolean(options.redactSecrets, true)
        && astTelemetryShouldRedactKey(key);

      if (shouldRedact) {
        output[key] = AST_TELEMETRY_REDACTED_TOKEN;
        continue;
      }

      output[key] = astTelemetryRedactValue(value[key], options, itemPath, depth + 1, visited);
    }

    return output;
  } finally {
    visited.delete(value);
  }
}

function astTelemetryNormalizeError(error, options = {}) {
  if (!error) {
    return null;
  }

  const shouldRedactSecrets = astTelemetryNormalizeBoolean(options.redactSecrets, true);
  const serialized = {
    name: astTelemetryNormalizeString(error.name, 'Error'),
    message: shouldRedactSecrets
      ? astTelemetryRedactString(astTelemetryNormalizeString(error.message, 'Unknown error'))
      : astTelemetryNormalizeString(error.message, 'Unknown error')
  };

  if (astTelemetryIsPlainObject(error.details)) {
    serialized.details = astTelemetryRedactValue(error.details, options);
  } else {
    serialized.details = {};
  }

  if (typeof error.stack === 'string' && error.stack.length > 0) {
    serialized.stack = shouldRedactSecrets ? astTelemetryRedactString(error.stack) : error.stack;
  }

  return serialized;
}

const __astTelemetryRedactionRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryRedactionRoot.AST_TELEMETRY_REDACTED_TOKEN = AST_TELEMETRY_REDACTED_TOKEN;
__astTelemetryRedactionRoot.astTelemetryShouldRedactKey = astTelemetryShouldRedactKey;
__astTelemetryRedactionRoot.astTelemetryRedactUrl = astTelemetryRedactUrl;
__astTelemetryRedactionRoot.astTelemetryRedactValue = astTelemetryRedactValue;
__astTelemetryRedactionRoot.astTelemetryNormalizeError = astTelemetryNormalizeError;
this.AST_TELEMETRY_REDACTED_TOKEN = AST_TELEMETRY_REDACTED_TOKEN;
this.astTelemetryShouldRedactKey = astTelemetryShouldRedactKey;
this.astTelemetryRedactUrl = astTelemetryRedactUrl;
this.astTelemetryRedactValue = astTelemetryRedactValue;
this.astTelemetryNormalizeError = astTelemetryNormalizeError;
