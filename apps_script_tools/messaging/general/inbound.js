const AST_MESSAGING_INBOUND_REPLAY_MEMORY = {};

function astMessagingInboundIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingInboundNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingInboundNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function astMessagingInboundNormalizeInteger(value, fallback = null, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.floor(parsed) !== parsed) {
    return fallback;
  }
  if (parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

function astMessagingInboundNormalizeProvider(value, headers = {}) {
  const explicit = astMessagingInboundNormalizeString(value, null);
  if (explicit) {
    const lowered = explicit.toLowerCase();
    if (['google_chat', 'googlechat', 'chat', 'gchat', 'google'].includes(lowered)) {
      return 'google_chat';
    }
    if (['slack', 'slack_webhook'].includes(lowered)) {
      return 'slack';
    }
    if (['teams', 'msteams', 'teams_webhook'].includes(lowered)) {
      return 'teams';
    }
  }

  const normalizedHeaders = astMessagingInboundNormalizeHeaders(headers);
  if (normalizedHeaders['x-slack-signature']) {
    return 'slack';
  }
  if (normalizedHeaders['x-goog-signature'] || normalizedHeaders['x-goog-chat-signature']) {
    return 'google_chat';
  }
  if (normalizedHeaders['x-ms-signature'] || normalizedHeaders['x-teams-signature']) {
    return 'teams';
  }

  throw new AstMessagingValidationError('Inbound provider is required and must be one of google_chat, slack, or teams', {
    field: 'body.provider'
  });
}

function astMessagingInboundNormalizeHeaders(headers = {}) {
  if (!astMessagingInboundIsPlainObject(headers)) {
    return {};
  }

  const normalized = {};
  const keys = Object.keys(headers);
  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    const lowered = String(key || '').trim().toLowerCase();
    if (!lowered) {
      continue;
    }
    const value = headers[key];
    if (Array.isArray(value)) {
      normalized[lowered] = value.length > 0 ? String(value[0]) : '';
      continue;
    }
    normalized[lowered] = value == null ? '' : String(value);
  }
  return normalized;
}

function astMessagingInboundGetHeader(headers = {}, key, fallback = null) {
  const normalized = astMessagingInboundNormalizeHeaders(headers);
  if (Object.prototype.hasOwnProperty.call(normalized, String(key || '').toLowerCase())) {
    return normalized[String(key || '').toLowerCase()];
  }
  return fallback;
}

function astMessagingInboundHex(bytes = []) {
  const source = Array.isArray(bytes) ? bytes : [];
  return source.map(byte => {
    const normalized = byte < 0 ? byte + 256 : byte;
    return normalized.toString(16).padStart(2, '0');
  }).join('');
}

function astMessagingInboundConstantTimeEqual(left, right) {
  const lhs = String(left || '');
  const rhs = String(right || '');
  if (lhs.length !== rhs.length) {
    return false;
  }

  let out = 0;
  for (let idx = 0; idx < lhs.length; idx += 1) {
    out |= lhs.charCodeAt(idx) ^ rhs.charCodeAt(idx);
  }
  return out === 0;
}

function astMessagingInboundHmacSha256Hex(payload, secret) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeHmacSha256Signature !== 'function'
  ) {
    throw new AstMessagingProviderError('Utilities.computeHmacSha256Signature is required for inbound signature verification');
  }

  return astMessagingInboundHex(Utilities.computeHmacSha256Signature(String(payload || ''), String(secret || '')));
}

function astMessagingInboundHash(value) {
  if (typeof astMessagingIdempotencyHash === 'function') {
    return astMessagingIdempotencyHash(value);
  }

  const source = String(value || '');
  if (typeof sha256Hash === 'function') {
    try {
      return sha256Hash(source);
    } catch (_error) {
      // Fallback below.
    }
  }

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.computeDigest === 'function'
  ) {
    try {
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source, Utilities.Charset.UTF_8);
      return digest.map(byte => {
        const normalized = byte < 0 ? byte + 256 : byte;
        return normalized.toString(16).padStart(2, '0');
      }).join('');
    } catch (_error) {
      // Fallback below.
    }
  }

  return `hash_${source.length}_${source.slice(0, 24)}`;
}

function astMessagingInboundDecodeComponent(value) {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch (_error) {
    return String(value || '');
  }
}

function astMessagingInboundParseFormEncoded(input) {
  const source = String(input || '');
  const out = {};
  const parts = source.split('&');
  for (let idx = 0; idx < parts.length; idx += 1) {
    const segment = parts[idx];
    if (!segment) {
      continue;
    }
    const separatorIdx = segment.indexOf('=');
    const key = separatorIdx >= 0 ? segment.slice(0, separatorIdx) : segment;
    const value = separatorIdx >= 0 ? segment.slice(separatorIdx + 1) : '';
    const normalizedKey = astMessagingInboundDecodeComponent(key);
    if (!normalizedKey) {
      continue;
    }
    out[normalizedKey] = astMessagingInboundDecodeComponent(value);
  }
  return out;
}

function astMessagingInboundExtractPayloadRaw(body = {}) {
  const explicitRaw = astMessagingInboundNormalizeString(
    body.rawBody || body.payloadRaw || body.raw,
    null
  );
  if (explicitRaw != null) {
    return explicitRaw;
  }

  if (typeof body.payload === 'string') {
    return body.payload;
  }

  if (astMessagingInboundIsPlainObject(body.payload) || Array.isArray(body.payload)) {
    try {
      return JSON.stringify(body.payload);
    } catch (_error) {
      // Fallback below.
    }
  }

  const event = astMessagingInboundIsPlainObject(body.event) ? body.event : {};
  const postData = astMessagingInboundIsPlainObject(event.postData) ? event.postData : {};
  const postDataContents = astMessagingInboundNormalizeString(postData.contents, null);
  if (postDataContents != null) {
    return postDataContents;
  }

  return '';
}

function astMessagingInboundParsePayload(rawPayload, body = {}, strict = true) {
  if (astMessagingInboundIsPlainObject(body.payload)) {
    return {
      payload: body.payload,
      source: 'body.payload.object'
    };
  }

  if (Array.isArray(body.payload)) {
    return {
      payload: { items: body.payload.slice() },
      source: 'body.payload.array'
    };
  }

  const source = String(rawPayload || '');
  const contentType = astMessagingInboundNormalizeString(body.contentType, '').toLowerCase();
  const looksLikeJson = source.startsWith('{') || source.startsWith('[') || contentType.includes('application/json');
  if (looksLikeJson) {
    try {
      return {
        payload: JSON.parse(source || '{}'),
        source: 'raw.json'
      };
    } catch (error) {
      if (strict) {
        throw new AstMessagingParseError('Failed to parse inbound payload as JSON', {
          operation: 'inbound_parse'
        }, error);
      }
      return {
        payload: {},
        source: 'raw.json.parse_failed'
      };
    }
  }

  const formObject = astMessagingInboundParseFormEncoded(source);
  if (Object.keys(formObject).length === 0) {
    if (strict) {
      throw new AstMessagingParseError('Inbound payload is empty or not parseable', {
        operation: 'inbound_parse'
      });
    }
    return {
      payload: {},
      source: 'raw.empty'
    };
  }

  if (typeof formObject.payload === 'string') {
    try {
      return {
        payload: JSON.parse(formObject.payload),
        source: 'raw.form.payload_json'
      };
    } catch (error) {
      if (strict) {
        throw new AstMessagingParseError('Failed to parse inbound form payload JSON', {
          operation: 'inbound_parse',
          field: 'payload'
        }, error);
      }
    }
  }

  return {
    payload: formObject,
    source: 'raw.form'
  };
}

function astMessagingInboundParseTimestampMs(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 100000000000 ? Math.floor(value) : Math.floor(value * 1000);
  }

  const normalized = astMessagingInboundNormalizeString(value, null);
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) {
      return numeric > 100000000000 ? Math.floor(numeric) : Math.floor(numeric * 1000);
    }
  }

  const parsed = new Date(normalized).getTime();
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return null;
}

function astMessagingInboundNowMs() {
  return Date.now();
}

function astMessagingInboundAssertTimestampSkew(timestampMs, maxSkewSec, provider) {
  if (!timestampMs) {
    throw new AstMessagingValidationError('Inbound verification requires request timestamp', {
      provider,
      field: 'headers.timestamp'
    });
  }

  const skewLimit = astMessagingInboundNormalizeInteger(maxSkewSec, 300, 1, 3600);
  const ageSec = Math.abs(astMessagingInboundNowMs() - timestampMs) / 1000;
  if (ageSec > skewLimit) {
    throw new AstMessagingAuthError('Inbound request timestamp outside allowed skew', {
      provider,
      ageSec: Number(ageSec.toFixed(3)),
      maxSkewSec: skewLimit
    });
  }

  return Number(ageSec.toFixed(3));
}

function astMessagingInboundResolveReplayConfig(resolvedConfig = {}, body = {}) {
  const inbound = astMessagingInboundIsPlainObject(resolvedConfig.inbound)
    ? resolvedConfig.inbound
    : {};
  const verify = astMessagingInboundIsPlainObject(body.verify) ? body.verify : {};
  return {
    enabled: astMessagingInboundNormalizeBoolean(
      verify.replayProtection,
      astMessagingInboundNormalizeBoolean(inbound.replayProtection, true)
    ),
    backend: astMessagingInboundNormalizeString(inbound.replayBackend, 'memory'),
    namespace: astMessagingInboundNormalizeString(inbound.replayNamespace, 'ast_messaging_inbound_replay'),
    ttlSec: astMessagingInboundNormalizeInteger(
      verify.replayTtlSec,
      astMessagingInboundNormalizeInteger(inbound.replayTtlSec, 600, 1, 86400),
      1,
      86400
    )
  };
}

function astMessagingInboundReplayMemoryGet(key) {
  const entry = AST_MESSAGING_INBOUND_REPLAY_MEMORY[key];
  if (!entry) {
    return null;
  }
  if (entry.expiresAt && entry.expiresAt <= astMessagingInboundNowMs()) {
    delete AST_MESSAGING_INBOUND_REPLAY_MEMORY[key];
    return null;
  }
  return entry.value;
}

function astMessagingInboundReplayMemorySet(key, value, ttlSec) {
  AST_MESSAGING_INBOUND_REPLAY_MEMORY[key] = {
    value,
    expiresAt: ttlSec > 0
      ? astMessagingInboundNowMs() + (ttlSec * 1000)
      : null
  };
}

function astMessagingInboundReplayGet(key, replayConfig = {}) {
  if (!key) {
    return null;
  }

  if (replayConfig.backend === 'memory') {
    return astMessagingInboundReplayMemoryGet(key);
  }

  if (typeof AST_CACHE !== 'undefined' && AST_CACHE && typeof AST_CACHE.get === 'function') {
    try {
      return AST_CACHE.get(`inbound_replay:${key}`, {
        backend: replayConfig.backend,
        namespace: replayConfig.namespace,
        ttlSec: replayConfig.ttlSec
      });
    } catch (_error) {
      return astMessagingInboundReplayMemoryGet(key);
    }
  }

  return astMessagingInboundReplayMemoryGet(key);
}

function astMessagingInboundReplaySet(key, replayValue, replayConfig = {}) {
  if (!key) {
    return;
  }

  if (replayConfig.backend === 'memory') {
    astMessagingInboundReplayMemorySet(key, replayValue, replayConfig.ttlSec);
    return;
  }

  if (typeof AST_CACHE !== 'undefined' && AST_CACHE && typeof AST_CACHE.set === 'function') {
    try {
      AST_CACHE.set(`inbound_replay:${key}`, replayValue, {
        backend: replayConfig.backend,
        namespace: replayConfig.namespace,
        ttlSec: replayConfig.ttlSec
      });
      return;
    } catch (_error) {
      // Fallback below.
    }
  }

  astMessagingInboundReplayMemorySet(key, replayValue, replayConfig.ttlSec);
}

function astMessagingInboundBuildReplayKey(provider, eventId, timestampMs, signature, payloadRaw) {
  const material = [
    provider || 'unknown',
    eventId || '',
    String(timestampMs || ''),
    signature || '',
    astMessagingInboundHash(payloadRaw || '')
  ].join('|');
  return astMessagingInboundHash(material);
}

function astMessagingInboundEnforceReplayProtection(params = {}) {
  if (!params.replayConfig || params.replayConfig.enabled !== true) {
    return null;
  }

  const replayKey = astMessagingInboundBuildReplayKey(
    params.provider,
    params.eventId,
    params.timestampMs,
    params.signature,
    params.payloadRaw
  );

  const seen = astMessagingInboundReplayGet(replayKey, params.replayConfig);
  if (seen) {
    throw new AstMessagingAuthError('Inbound replay detected', {
      provider: params.provider,
      eventId: params.eventId || null
    });
  }

  astMessagingInboundReplaySet(replayKey, {
    provider: params.provider,
    eventId: params.eventId || null,
    timestampMs: params.timestampMs || null
  }, params.replayConfig);

  return replayKey;
}

function astMessagingInboundResolveVerifyConfig(normalizedRequest = {}, resolvedConfig = {}) {
  const body = astMessagingInboundIsPlainObject(normalizedRequest.body)
    ? normalizedRequest.body
    : {};
  const verify = astMessagingInboundIsPlainObject(body.verify)
    ? body.verify
    : {};
  const inbound = astMessagingInboundIsPlainObject(resolvedConfig.inbound)
    ? resolvedConfig.inbound
    : {};

  return {
    maxSkewSec: astMessagingInboundNormalizeInteger(
      verify.maxSkewSec,
      astMessagingInboundNormalizeInteger(inbound.maxSkewSec, 300, 1, 3600),
      1,
      3600
    ),
    replayConfig: astMessagingInboundResolveReplayConfig(resolvedConfig, body)
  };
}

function astMessagingInboundResolveProviderSecret(provider, normalizedRequest = {}, resolvedConfig = {}) {
  const auth = astMessagingInboundIsPlainObject(normalizedRequest.auth) ? normalizedRequest.auth : {};
  const inbound = astMessagingInboundIsPlainObject(resolvedConfig.inbound) ? resolvedConfig.inbound : {};

  if (provider === 'slack') {
    return astMessagingInboundNormalizeString(
      auth.slackSigningSecret || auth.signingSecret || (inbound.slack && inbound.slack.signingSecret),
      ''
    );
  }

  if (provider === 'teams') {
    return astMessagingInboundNormalizeString(
      auth.teamsSigningSecret || auth.signingSecret || (inbound.teams && inbound.teams.signingSecret),
      ''
    );
  }

  if (provider === 'google_chat') {
    return astMessagingInboundNormalizeString(
      auth.googleChatSigningSecret || auth.signingSecret || (inbound.googleChat && inbound.googleChat.signingSecret),
      ''
    );
  }

  return '';
}

function astMessagingInboundResolveGoogleChatToken(normalizedRequest = {}, resolvedConfig = {}) {
  const auth = astMessagingInboundIsPlainObject(normalizedRequest.auth) ? normalizedRequest.auth : {};
  const inbound = astMessagingInboundIsPlainObject(resolvedConfig.inbound) ? resolvedConfig.inbound : {};

  return astMessagingInboundNormalizeString(
    auth.googleChatVerificationToken
      || auth.verificationToken
      || (inbound.googleChat && inbound.googleChat.verificationToken),
    ''
  );
}

function astMessagingInboundNormalizeSignatureHeader(headerValue, provider) {
  const signatureHeader = astMessagingInboundNormalizeString(headerValue, '');
  if (!signatureHeader) {
    throw new AstMessagingValidationError('Inbound signature header is required', {
      provider,
      field: 'headers.signature'
    });
  }
  return signatureHeader;
}

function astMessagingInboundVerifySlack(input = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const headers = input.headers || {};
  const payloadRaw = input.payloadRaw || '';
  const payload = input.payload || {};
  const verifyConfig = astMessagingInboundResolveVerifyConfig(normalizedRequest, resolvedConfig);
  const secret = astMessagingInboundResolveProviderSecret('slack', normalizedRequest, resolvedConfig);

  if (!secret) {
    throw new AstMessagingAuthError('Slack inbound verification requires signing secret', {
      provider: 'slack',
      scriptKey: 'MESSAGING_INBOUND_SLACK_SIGNING_SECRET'
    });
  }

  if (input.payloadSource === 'body.payload.object' || input.payloadSource === 'body.payload.array') {
    throw new AstMessagingValidationError('Slack signature verification requires rawBody/payloadRaw to preserve exact request bytes', {
      provider: 'slack',
      field: 'body.rawBody'
    });
  }

  const timestampRaw = astMessagingInboundGetHeader(headers, 'x-slack-request-timestamp', null);
  const timestampMs = astMessagingInboundParseTimestampMs(timestampRaw);
  const ageSec = astMessagingInboundAssertTimestampSkew(timestampMs, verifyConfig.maxSkewSec, 'slack');

  const signatureHeader = astMessagingInboundNormalizeSignatureHeader(
    astMessagingInboundGetHeader(headers, 'x-slack-signature', null),
    'slack'
  );

  const match = signatureHeader.match(/^v0=([a-fA-F0-9]{64})$/);
  if (!match) {
    throw new AstMessagingValidationError("Slack signature header must match 'v0=<hex>' format", {
      provider: 'slack',
      field: 'headers.x-slack-signature'
    });
  }

  const base = `v0:${Math.floor(timestampMs / 1000)}:${payloadRaw}`;
  const expected = `v0=${astMessagingInboundHmacSha256Hex(base, secret).toLowerCase()}`;
  const valid = astMessagingInboundConstantTimeEqual(expected, signatureHeader.toLowerCase());
  if (!valid) {
    throw new AstMessagingAuthError('Slack inbound signature verification failed', {
      provider: 'slack'
    });
  }

  const eventId = astMessagingInboundNormalizeString(
    astMessagingInboundGetHeader(headers, 'x-slack-request-id', null)
      || payload.event_id
      || payload.trigger_id
      || payload.event_ts
      || (payload.event && payload.event.event_ts),
    null
  );

  const replayKey = astMessagingInboundEnforceReplayProtection({
    replayConfig: verifyConfig.replayConfig,
    provider: 'slack',
    eventId,
    timestampMs,
    signature: signatureHeader,
    payloadRaw
  });

  return {
    valid: true,
    provider: 'slack',
    method: 'hmac_sha256_v0',
    timestampMs,
    ageSec,
    eventId,
    replayKey
  };
}

function astMessagingInboundVerifyTeams(input = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const headers = input.headers || {};
  const payloadRaw = input.payloadRaw || '';
  const payload = input.payload || {};
  const verifyConfig = astMessagingInboundResolveVerifyConfig(normalizedRequest, resolvedConfig);
  const secret = astMessagingInboundResolveProviderSecret('teams', normalizedRequest, resolvedConfig);

  if (!secret) {
    throw new AstMessagingAuthError('Teams inbound verification requires signing secret', {
      provider: 'teams',
      scriptKey: 'MESSAGING_INBOUND_TEAMS_SIGNING_SECRET'
    });
  }

  if (input.payloadSource === 'body.payload.object' || input.payloadSource === 'body.payload.array') {
    throw new AstMessagingValidationError('Teams signature verification requires rawBody/payloadRaw to preserve exact request bytes', {
      provider: 'teams',
      field: 'body.rawBody'
    });
  }

  const timestampRaw = astMessagingInboundGetHeader(headers, 'x-teams-request-timestamp', null)
    || astMessagingInboundGetHeader(headers, 'x-ms-request-timestamp', null)
    || astMessagingInboundGetHeader(headers, 'x-request-timestamp', null);
  const timestampMs = astMessagingInboundParseTimestampMs(timestampRaw);
  const ageSec = astMessagingInboundAssertTimestampSkew(timestampMs, verifyConfig.maxSkewSec, 'teams');

  const signatureHeader = astMessagingInboundNormalizeSignatureHeader(
    astMessagingInboundGetHeader(headers, 'x-teams-signature', null)
      || astMessagingInboundGetHeader(headers, 'x-ms-signature', null),
    'teams'
  );

  let expected = '';
  let provided = '';
  let method = 'hmac_sha256';
  if (/^sha256=([a-fA-F0-9]{64})$/.test(signatureHeader)) {
    expected = `sha256=${astMessagingInboundHmacSha256Hex(`${Math.floor(timestampMs / 1000)}:${payloadRaw}`, secret).toLowerCase()}`;
    provided = signatureHeader.toLowerCase();
    method = 'hmac_sha256_prefixed';
  } else if (/^v1=([a-fA-F0-9]{64})$/.test(signatureHeader)) {
    expected = `v1=${astMessagingInboundHmacSha256Hex(`v1:${Math.floor(timestampMs / 1000)}:${payloadRaw}`, secret).toLowerCase()}`;
    provided = signatureHeader.toLowerCase();
    method = 'hmac_sha256_v1';
  } else if (/^[a-fA-F0-9]{64}$/.test(signatureHeader)) {
    expected = astMessagingInboundHmacSha256Hex(`${Math.floor(timestampMs / 1000)}:${payloadRaw}`, secret).toLowerCase();
    provided = signatureHeader.toLowerCase();
  } else {
    throw new AstMessagingValidationError('Teams signature header format is unsupported', {
      provider: 'teams',
      field: 'headers.x-teams-signature|headers.x-ms-signature'
    });
  }

  const valid = astMessagingInboundConstantTimeEqual(expected, provided);
  if (!valid) {
    throw new AstMessagingAuthError('Teams inbound signature verification failed', {
      provider: 'teams'
    });
  }

  const eventId = astMessagingInboundNormalizeString(
    payload.id
      || payload.replyToId
      || astMessagingInboundGetHeader(headers, 'x-ms-client-request-id', null),
    null
  );

  const replayKey = astMessagingInboundEnforceReplayProtection({
    replayConfig: verifyConfig.replayConfig,
    provider: 'teams',
    eventId,
    timestampMs,
    signature: signatureHeader,
    payloadRaw
  });

  return {
    valid: true,
    provider: 'teams',
    method,
    timestampMs,
    ageSec,
    eventId,
    replayKey
  };
}

function astMessagingInboundVerifyGoogleChat(input = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const headers = input.headers || {};
  const payloadRaw = input.payloadRaw || '';
  const payload = input.payload || {};
  const verifyConfig = astMessagingInboundResolveVerifyConfig(normalizedRequest, resolvedConfig);
  const signingSecret = astMessagingInboundResolveProviderSecret('google_chat', normalizedRequest, resolvedConfig);
  const verificationToken = astMessagingInboundResolveGoogleChatToken(normalizedRequest, resolvedConfig);

  const signatureHeader = astMessagingInboundNormalizeString(
    astMessagingInboundGetHeader(headers, 'x-goog-signature', null)
      || astMessagingInboundGetHeader(headers, 'x-goog-chat-signature', null),
    ''
  );

  let method = '';
  let timestampMs = astMessagingInboundParseTimestampMs(
    astMessagingInboundGetHeader(headers, 'x-goog-request-timestamp', null)
      || astMessagingInboundGetHeader(headers, 'x-request-timestamp', null)
      || payload.eventTime
      || payload.event_time
      || (payload.message && payload.message.createTime)
  );
  let ageSec = null;

  if (signingSecret || signatureHeader) {
    if (!signingSecret) {
      throw new AstMessagingAuthError('Google Chat inbound signature header present but signing secret is missing', {
        provider: 'google_chat',
        scriptKey: 'MESSAGING_INBOUND_GOOGLE_CHAT_SIGNING_SECRET'
      });
    }

    if (input.payloadSource === 'body.payload.object' || input.payloadSource === 'body.payload.array') {
      throw new AstMessagingValidationError('Google Chat signature verification requires rawBody/payloadRaw to preserve exact request bytes', {
        provider: 'google_chat',
        field: 'body.rawBody'
      });
    }

    const normalizedSignatureHeader = astMessagingInboundNormalizeSignatureHeader(signatureHeader, 'google_chat');
    ageSec = astMessagingInboundAssertTimestampSkew(timestampMs, verifyConfig.maxSkewSec, 'google_chat');

    let expected = '';
    let provided = '';
    if (/^sha256=([a-fA-F0-9]{64})$/.test(normalizedSignatureHeader)) {
      expected = `sha256=${astMessagingInboundHmacSha256Hex(`${Math.floor(timestampMs / 1000)}:${payloadRaw}`, signingSecret).toLowerCase()}`;
      provided = normalizedSignatureHeader.toLowerCase();
      method = 'hmac_sha256_prefixed';
    } else if (/^[a-fA-F0-9]{64}$/.test(normalizedSignatureHeader)) {
      expected = astMessagingInboundHmacSha256Hex(`${Math.floor(timestampMs / 1000)}:${payloadRaw}`, signingSecret).toLowerCase();
      provided = normalizedSignatureHeader.toLowerCase();
      method = 'hmac_sha256';
    } else {
      throw new AstMessagingValidationError('Google Chat signature header format is unsupported', {
        provider: 'google_chat',
        field: 'headers.x-goog-signature'
      });
    }

    if (!astMessagingInboundConstantTimeEqual(expected, provided)) {
      throw new AstMessagingAuthError('Google Chat inbound signature verification failed', {
        provider: 'google_chat'
      });
    }
  } else {
    if (!verificationToken) {
      throw new AstMessagingAuthError('Google Chat inbound verification requires signing secret or verification token', {
        provider: 'google_chat',
        scriptKey: 'MESSAGING_INBOUND_GOOGLE_CHAT_SIGNING_SECRET|MESSAGING_INBOUND_GOOGLE_CHAT_VERIFICATION_TOKEN'
      });
    }
    const incomingToken = astMessagingInboundNormalizeString(
      payload.token || astMessagingInboundGetHeader(headers, 'x-goog-channel-token', null),
      ''
    );
    if (!incomingToken || !astMessagingInboundConstantTimeEqual(incomingToken, verificationToken)) {
      throw new AstMessagingAuthError('Google Chat inbound verification token mismatch', {
        provider: 'google_chat'
      });
    }
    method = 'verification_token';
    if (timestampMs) {
      ageSec = astMessagingInboundAssertTimestampSkew(timestampMs, verifyConfig.maxSkewSec, 'google_chat');
    }
  }

  const eventId = astMessagingInboundNormalizeString(
    payload.eventId
      || payload.event_id
      || (payload.message && payload.message.name)
      || payload.messageId,
    null
  );

  const replayKey = astMessagingInboundEnforceReplayProtection({
    replayConfig: verifyConfig.replayConfig,
    provider: 'google_chat',
    eventId,
    timestampMs,
    signature: signatureHeader,
    payloadRaw
  });

  return {
    valid: true,
    provider: 'google_chat',
    method,
    timestampMs,
    ageSec,
    eventId,
    replayKey
  };
}

function astMessagingInboundBuildParsed(provider, payload = {}, headers = {}, payloadRaw = '') {
  const normalizedProvider = astMessagingInboundNormalizeProvider(provider, headers);
  const parsedPayload = astMessagingInboundIsPlainObject(payload) ? payload : {};
  let eventType = null;
  let eventId = null;
  let timestampMs = null;
  let actor = null;
  let text = null;
  let destination = null;

  if (normalizedProvider === 'google_chat') {
    eventType = astMessagingInboundNormalizeString(parsedPayload.type || parsedPayload.eventType, null);
    eventId = astMessagingInboundNormalizeString(
      parsedPayload.eventId
        || (parsedPayload.message && parsedPayload.message.name)
        || parsedPayload.messageId,
      null
    );
    timestampMs = astMessagingInboundParseTimestampMs(
      parsedPayload.eventTime
        || parsedPayload.event_time
        || (parsedPayload.message && parsedPayload.message.createTime)
    );
    actor = astMessagingInboundNormalizeString(
      (parsedPayload.user && (parsedPayload.user.displayName || parsedPayload.user.name))
        || (parsedPayload.message && parsedPayload.message.sender && parsedPayload.message.sender.name),
      null
    );
    text = astMessagingInboundNormalizeString(
      (parsedPayload.message && parsedPayload.message.text) || parsedPayload.text,
      null
    );
    destination = astMessagingInboundNormalizeString(
      (parsedPayload.space && parsedPayload.space.name) || parsedPayload.space,
      null
    );
  } else if (normalizedProvider === 'slack') {
    eventType = astMessagingInboundNormalizeString(
      (parsedPayload.event && parsedPayload.event.type)
        || parsedPayload.type
        || parsedPayload.command,
      null
    );
    eventId = astMessagingInboundNormalizeString(
      parsedPayload.event_id
        || astMessagingInboundGetHeader(headers, 'x-slack-request-id', null)
        || parsedPayload.trigger_id
        || (parsedPayload.event && parsedPayload.event.ts),
      null
    );
    timestampMs = astMessagingInboundParseTimestampMs(
      astMessagingInboundGetHeader(headers, 'x-slack-request-timestamp', null)
        || parsedPayload.event_time
        || (parsedPayload.event && parsedPayload.event.ts)
    );
    actor = astMessagingInboundNormalizeString(
      parsedPayload.user_id
        || (parsedPayload.user && parsedPayload.user.id)
        || (parsedPayload.event && parsedPayload.event.user),
      null
    );
    text = astMessagingInboundNormalizeString(
      parsedPayload.text || (parsedPayload.event && parsedPayload.event.text),
      null
    );
    destination = astMessagingInboundNormalizeString(
      parsedPayload.channel_id || (parsedPayload.event && parsedPayload.event.channel),
      null
    );
  } else if (normalizedProvider === 'teams') {
    eventType = astMessagingInboundNormalizeString(
      parsedPayload.type || (parsedPayload.value && parsedPayload.value.action),
      null
    );
    eventId = astMessagingInboundNormalizeString(
      parsedPayload.id || parsedPayload.replyToId,
      null
    );
    timestampMs = astMessagingInboundParseTimestampMs(
      parsedPayload.timestamp
        || astMessagingInboundGetHeader(headers, 'x-ms-request-timestamp', null)
        || astMessagingInboundGetHeader(headers, 'x-teams-request-timestamp', null)
    );
    actor = astMessagingInboundNormalizeString(
      (parsedPayload.from && (parsedPayload.from.name || parsedPayload.from.id))
        || (parsedPayload.user && parsedPayload.user.id),
      null
    );
    text = astMessagingInboundNormalizeString(parsedPayload.text || parsedPayload.summary, null);
    destination = astMessagingInboundNormalizeString(
      (parsedPayload.conversation && parsedPayload.conversation.id) || parsedPayload.channelId,
      null
    );
  }

  return {
    provider: normalizedProvider,
    eventType,
    eventId,
    timestampMs,
    actor,
    text,
    destination,
    payload: parsedPayload,
    payloadRaw
  };
}

function astMessagingInboundResolveInput(normalizedRequest = {}) {
  const body = astMessagingInboundIsPlainObject(normalizedRequest.body) ? normalizedRequest.body : {};
  const headers = astMessagingInboundNormalizeHeaders(
    astMessagingInboundIsPlainObject(body.headers) ? body.headers : {}
  );
  const provider = astMessagingInboundNormalizeProvider(body.provider, headers);
  const payloadRaw = astMessagingInboundExtractPayloadRaw(body);
  const strictParse = normalizedRequest.operation !== 'inbound_verify';
  const parsedPayload = astMessagingInboundParsePayload(payloadRaw, body, strictParse);

  return {
    body,
    headers,
    provider,
    payloadRaw,
    payload: parsedPayload.payload,
    payloadSource: parsedPayload.source
  };
}

function astMessagingInboundVerify(input = {}, normalizedRequest = {}, resolvedConfig = {}) {
  if (input.provider === 'slack') {
    return astMessagingInboundVerifySlack(input, normalizedRequest, resolvedConfig);
  }
  if (input.provider === 'teams') {
    return astMessagingInboundVerifyTeams(input, normalizedRequest, resolvedConfig);
  }
  if (input.provider === 'google_chat') {
    return astMessagingInboundVerifyGoogleChat(input, normalizedRequest, resolvedConfig);
  }

  throw new AstMessagingCapabilityError('Unsupported inbound provider', {
    provider: input.provider
  });
}

function astMessagingVerifyInbound(normalizedRequest = {}, resolvedConfig = {}) {
  const input = astMessagingInboundResolveInput(normalizedRequest);
  const verification = astMessagingInboundVerify(input, normalizedRequest, resolvedConfig);
  const parsed = astMessagingInboundBuildParsed(
    input.provider,
    input.payload,
    input.headers,
    input.payloadRaw
  );

  return {
    provider: input.provider,
    verified: true,
    verification,
    parsed
  };
}

function astMessagingParseInbound(normalizedRequest = {}, resolvedConfig = {}) {
  const input = astMessagingInboundResolveInput(normalizedRequest);
  const body = input.body || {};
  const verifyRequested = astMessagingInboundNormalizeBoolean(
    body.verifySignature
      || (astMessagingInboundIsPlainObject(body.verify) && body.verify.enabled),
    false
  );

  let verification = null;
  if (verifyRequested) {
    verification = astMessagingInboundVerify(input, normalizedRequest, resolvedConfig);
  }

  const parsed = astMessagingInboundBuildParsed(
    input.provider,
    input.payload,
    input.headers,
    input.payloadRaw
  );

  return {
    provider: input.provider,
    verification,
    parsed
  };
}

function astMessagingInboundSelectRoute(routes = {}, parsed = {}) {
  const provider = astMessagingInboundNormalizeString(parsed.provider, '');
  const eventType = astMessagingInboundNormalizeString(parsed.eventType, '');
  const keys = [];
  if (provider && eventType) {
    keys.push(`${provider}:${eventType}`);
  }
  if (eventType) {
    keys.push(eventType);
  }
  if (provider) {
    keys.push(provider);
  }
  keys.push('default');

  for (let idx = 0; idx < keys.length; idx += 1) {
    const key = keys[idx];
    if (Object.prototype.hasOwnProperty.call(routes, key)) {
      return {
        routeKey: key,
        handler: routes[key]
      };
    }
  }

  return {
    routeKey: null,
    handler: null
  };
}

function astMessagingInboundExecuteRoute(handler, routeContext = {}) {
  if (!handler) {
    return {
      handled: false,
      handlerType: null,
      output: null
    };
  }

  if (typeof handler === 'function') {
    return {
      handled: true,
      handlerType: 'function',
      output: handler(routeContext)
    };
  }

  if (typeof handler === 'string') {
    const operation = astMessagingInboundNormalizeString(handler, null);
    if (!operation) {
      throw new AstMessagingValidationError('Inbound route string handler must be a non-empty operation name', {
        field: 'body.routes.<key>'
      });
    }
    if (operation === 'inbound_route') {
      throw new AstMessagingValidationError('Inbound route handler cannot recursively call inbound_route', {
        field: 'body.routes.<key>'
      });
    }
    return {
      handled: true,
      handlerType: 'operation',
      output: astRunMessagingRequest({
        operation,
        body: {
          inbound: routeContext
        }
      })
    };
  }

  if (astMessagingInboundIsPlainObject(handler)) {
    const operation = astMessagingInboundNormalizeString(handler.operation, null);
    if (!operation) {
      throw new AstMessagingValidationError("Inbound route object handler requires field 'operation'", {
        field: 'body.routes.<key>.operation'
      });
    }
    if (operation === 'inbound_route') {
      throw new AstMessagingValidationError('Inbound route handler cannot recursively call inbound_route', {
        field: 'body.routes.<key>.operation'
      });
    }

    const baseBody = astMessagingInboundIsPlainObject(handler.body) ? Object.assign({}, handler.body) : {};
    baseBody.inbound = routeContext;

    return {
      handled: true,
      handlerType: 'operation',
      output: astRunMessagingRequest({
        operation,
        body: baseBody,
        auth: astMessagingInboundIsPlainObject(handler.auth) ? Object.assign({}, handler.auth) : {},
        providerOptions: astMessagingInboundIsPlainObject(handler.providerOptions) ? Object.assign({}, handler.providerOptions) : {},
        options: astMessagingInboundIsPlainObject(handler.options) ? Object.assign({}, handler.options) : {}
      })
    };
  }

  throw new AstMessagingValidationError('Inbound route handler must be function, string, or object', {
    field: 'body.routes.<key>'
  });
}

function astMessagingRouteInbound(normalizedRequest = {}, resolvedConfig = {}) {
  const input = astMessagingInboundResolveInput(normalizedRequest);
  const body = input.body || {};
  const shouldVerify = astMessagingInboundNormalizeBoolean(
    body.verifySignature
      || (astMessagingInboundIsPlainObject(body.verify) && body.verify.enabled),
    true
  );

  let verification = null;
  if (shouldVerify) {
    verification = astMessagingInboundVerify(input, normalizedRequest, resolvedConfig);
  }

  const parsed = astMessagingInboundBuildParsed(
    input.provider,
    input.payload,
    input.headers,
    input.payloadRaw
  );

  const routes = astMessagingInboundIsPlainObject(body.routes) ? body.routes : {};
  const selected = astMessagingInboundSelectRoute(routes, parsed);
  const routeContext = {
    provider: parsed.provider,
    eventType: parsed.eventType,
    eventId: parsed.eventId,
    timestampMs: parsed.timestampMs,
    actor: parsed.actor,
    text: parsed.text,
    destination: parsed.destination,
    payload: parsed.payload,
    payloadRaw: parsed.payloadRaw,
    verified: verification ? verification.valid === true : null,
    verification
  };

  const routed = astMessagingInboundExecuteRoute(selected.handler, routeContext);

  return {
    provider: parsed.provider,
    verification,
    parsed,
    route: {
      key: selected.routeKey,
      handled: routed.handled,
      handlerType: routed.handlerType
    },
    output: routed.output
  };
}
