const AST_MESSAGING_IDEMPOTENCY_MEMORY = {};

function astMessagingIdempotencyNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingIdempotencyNowMs() {
  return Date.now();
}

function astMessagingIdempotencyHash(value) {
  const source = String(value || '');
  if (typeof sha256Hash === 'function') {
    try {
      return sha256Hash(source);
    } catch (_error) {
      // Fallback below.
    }
  }

  if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.computeDigest === 'function') {
    try {
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source, Utilities.Charset.UTF_8);
      return digest.map(byte => {
        const normalized = byte < 0 ? byte + 256 : byte;
        return (`0${normalized.toString(16)}`).slice(-2);
      }).join('');
    } catch (_error) {
      // Fallback below.
    }
  }

  return `hash_${source.length}_${source.slice(0, 32)}`;
}

function astMessagingIdempotencyStableSerialize(value, seen = null) {
  const seenSet = seen || new Set();

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? String(value)
      : JSON.stringify('[NonFiniteNumber]');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'bigint') {
    return JSON.stringify(String(value));
  }

  if (typeof value === 'undefined') {
    return JSON.stringify('[Undefined]');
  }

  if (typeof value === 'function') {
    return JSON.stringify('[Function]');
  }

  if (typeof value !== 'object') {
    return JSON.stringify(String(value));
  }

  if (seenSet.has(value)) {
    return JSON.stringify('[Circular]');
  }

  seenSet.add(value);

  try {
    if (Array.isArray(value)) {
      const items = value.map(item => astMessagingIdempotencyStableSerialize(item, seenSet));
      return `[${items.join(',')}]`;
    }

    if (typeof value.toISOString === 'function' && typeof value.getTime === 'function') {
      try {
        return JSON.stringify(value.toISOString());
      } catch (_error) {
        return JSON.stringify('[InvalidDate]');
      }
    }

    const keys = Object.keys(value).sort();
    const parts = keys.map(key => {
      let serializedValue = JSON.stringify('[Unreadable]');
      try {
        serializedValue = astMessagingIdempotencyStableSerialize(value[key], seenSet);
      } catch (_error) {
        // Keep placeholder for unreadable keys.
      }
      return `${JSON.stringify(key)}:${serializedValue}`;
    });
    return `{${parts.join(',')}}`;
  } finally {
    seenSet.delete(value);
  }
}

function astMessagingIdempotencySerializeSafely(value) {
  try {
    return astMessagingIdempotencyStableSerialize(value);
  } catch (_error) {
    return JSON.stringify('[Unserializable]');
  }
}

function astMessagingBuildIdempotencyKey(normalizedRequest = {}, resolvedConfig = {}) {
  const explicit = astMessagingIdempotencyNormalizeString(normalizedRequest.options && normalizedRequest.options.idempotencyKey, null)
    || astMessagingIdempotencyNormalizeString(normalizedRequest.body && normalizedRequest.body.idempotencyKey, null)
    || astMessagingIdempotencyNormalizeString(normalizedRequest.body && normalizedRequest.body.metadata && normalizedRequest.body.metadata.idempotencyKey, null);

  if (explicit) {
    return explicit;
  }

  if (!astMessagingIsMutationOperation(normalizedRequest.operation)) {
    return null;
  }

  if (!['email_send', 'email_send_batch', 'email_create_draft', 'email_send_draft', 'chat_send', 'chat_send_batch'].includes(normalizedRequest.operation)) {
    return null;
  }

  return astMessagingIdempotencyHash(astMessagingIdempotencySerializeSafely({
    operation: normalizedRequest.operation,
    channel: normalizedRequest.channel,
    body: normalizedRequest.body || {},
    transport: resolvedConfig.transport || null
  }));
}

function astMessagingResolveIdempotencyCacheOptions(resolvedConfig = {}) {
  const options = {
    backend: astMessagingIdempotencyNormalizeString(resolvedConfig.idempotency && resolvedConfig.idempotency.backend, 'memory'),
    namespace: astMessagingIdempotencyNormalizeString(resolvedConfig.idempotency && resolvedConfig.idempotency.namespace, 'ast_messaging_idempotency'),
    ttlSec: Number(resolvedConfig.idempotency && resolvedConfig.idempotency.ttlSec) || 900
  };

  return options;
}

function astMessagingIdempotencyCacheGet(cacheKey, options = {}) {
  if (!cacheKey) {
    return null;
  }

  const entry = AST_MESSAGING_IDEMPOTENCY_MEMORY[cacheKey];
  if (!entry) {
    return null;
  }

  if (entry.expiresAt && entry.expiresAt <= astMessagingIdempotencyNowMs()) {
    delete AST_MESSAGING_IDEMPOTENCY_MEMORY[cacheKey];
    return null;
  }

  return entry.value;
}

function astMessagingIdempotencyCacheSet(cacheKey, value, options = {}) {
  if (!cacheKey) {
    return;
  }

  const ttlSec = Number(options.ttlSec || 900);
  AST_MESSAGING_IDEMPOTENCY_MEMORY[cacheKey] = {
    value,
    expiresAt: ttlSec > 0
      ? astMessagingIdempotencyNowMs() + (ttlSec * 1000)
      : null
  };
}

function astMessagingIdempotencyGet(cacheKey, resolvedConfig = {}) {
  if (!cacheKey) {
    return null;
  }

  const cacheOptions = astMessagingResolveIdempotencyCacheOptions(resolvedConfig);
  if (cacheOptions.backend === 'memory') {
    return astMessagingIdempotencyCacheGet(cacheKey, cacheOptions);
  }

  if (typeof AST_CACHE !== 'undefined' && AST_CACHE && typeof AST_CACHE.get === 'function') {
    try {
      return AST_CACHE.get(`idempotency:${cacheKey}`, cacheOptions);
    } catch (_error) {
      return astMessagingIdempotencyCacheGet(cacheKey, cacheOptions);
    }
  }

  return astMessagingIdempotencyCacheGet(cacheKey, cacheOptions);
}

function astMessagingIdempotencySet(cacheKey, value, resolvedConfig = {}) {
  if (!cacheKey) {
    return;
  }

  const cacheOptions = astMessagingResolveIdempotencyCacheOptions(resolvedConfig);
  if (cacheOptions.backend === 'memory') {
    astMessagingIdempotencyCacheSet(cacheKey, value, cacheOptions);
    return;
  }

  if (typeof AST_CACHE !== 'undefined' && AST_CACHE && typeof AST_CACHE.set === 'function') {
    try {
      AST_CACHE.set(`idempotency:${cacheKey}`, value, cacheOptions);
      return;
    } catch (_error) {
      // Fallback below.
    }
  }

  astMessagingIdempotencyCacheSet(cacheKey, value, cacheOptions);
}
