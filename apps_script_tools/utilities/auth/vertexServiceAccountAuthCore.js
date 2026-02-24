const AST_VERTEX_AUTH_CORE_ALLOWED_TOKEN_URIS = Object.freeze([
  'https://oauth2.googleapis.com/token',
  'https://www.googleapis.com/oauth2/v4/token'
]);

function astVertexAuthCoreNormalizeAuthMode(mode, createError) {
  const normalized = String(mode == null ? 'auto' : mode).trim().toLowerCase();
  if (!normalized) {
    return 'auto';
  }

  if (normalized !== 'oauth' && normalized !== 'service_account' && normalized !== 'auto') {
    throw createError('vertex_gemini authMode must be one of: oauth, service_account, auto', {
      authMode: normalized
    });
  }

  return normalized;
}

function astVertexAuthCoreResolveAuthMode({
  auth = {},
  runtimeConfig = {},
  scriptConfig = {},
  resolveConfigString,
  createError
}) {
  const mode = resolveConfigString({
    requestValue: auth.authMode,
    authValue: auth.VERTEX_AUTH_MODE,
    runtimeConfig,
    scriptConfig,
    scriptKey: 'VERTEX_AUTH_MODE',
    required: false,
    field: 'authMode'
  });

  return astVertexAuthCoreNormalizeAuthMode(mode || 'auto', createError);
}

function astVertexAuthCoreResolveServiceAccountJson({
  auth = {},
  runtimeConfig = {},
  scriptConfig = {},
  resolveConfigString
}) {
  if (auth && typeof auth.serviceAccountJson === 'object' && !Array.isArray(auth.serviceAccountJson)) {
    return auth.serviceAccountJson;
  }

  if (auth && typeof auth.VERTEX_SERVICE_ACCOUNT_JSON === 'object' && !Array.isArray(auth.VERTEX_SERVICE_ACCOUNT_JSON)) {
    return auth.VERTEX_SERVICE_ACCOUNT_JSON;
  }

  return resolveConfigString({
    requestValue: auth.serviceAccountJson,
    authValue: auth.VERTEX_SERVICE_ACCOUNT_JSON,
    runtimeConfig,
    scriptConfig,
    scriptKey: 'VERTEX_SERVICE_ACCOUNT_JSON',
    required: false,
    field: 'serviceAccountJson'
  });
}

function astVertexAuthCoreBase64UrlEncodeString(value, createError) {
  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64EncodeWebSafe === 'function'
  ) {
    return Utilities.base64EncodeWebSafe(String(value || '')).replace(/=+$/g, '');
  }

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64Encode === 'function'
  ) {
    return Utilities.base64Encode(String(value || ''))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  throw createError('Utilities.base64EncodeWebSafe/base64Encode is required for vertex_gemini service-account auth');
}

function astVertexAuthCoreBase64UrlEncodeBytes(bytes, createError) {
  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64EncodeWebSafe === 'function'
  ) {
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
  }

  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.base64Encode === 'function'
  ) {
    return Utilities.base64Encode(bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  throw createError('Utilities.base64EncodeWebSafe/base64Encode is required for vertex_gemini service-account auth');
}

function astVertexAuthCoreSha256Hex(value, createError) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeDigest !== 'function' ||
    !Utilities.DigestAlgorithm ||
    !Utilities.DigestAlgorithm.SHA_256
  ) {
    throw createError(
      'Utilities.computeDigest with SHA_256 is required for vertex_gemini service-account auth cache key derivation'
    );
  }

  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value == null ? '' : value),
    Utilities.Charset && Utilities.Charset.UTF_8 ? Utilities.Charset.UTF_8 : undefined
  );

  return digest
    .map(byte => {
      const unsigned = byte < 0 ? byte + 256 : byte;
      const hex = unsigned.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    })
    .join('');
}

function astVertexAuthCoreCanonicalizeTokenUri(tokenUri) {
  const raw = String(tokenUri == null ? '' : tokenUri).trim();
  if (!raw) {
    return '';
  }

  if (typeof URL === 'function') {
    const parsed = new URL(raw);
    const pathname = String(parsed.pathname || '').replace(/\/+$/g, '') || '/';
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  }

  return raw.replace(/\/+$/g, '');
}

function astVertexAuthCoreValidateTokenUri(tokenUri, createError) {
  let canonical;
  try {
    canonical = astVertexAuthCoreCanonicalizeTokenUri(tokenUri);
  } catch (error) {
    throw createError('vertex_gemini service account token_uri is invalid', {
      provider: 'vertex_gemini'
    }, error);
  }

  if (!canonical || AST_VERTEX_AUTH_CORE_ALLOWED_TOKEN_URIS.indexOf(canonical) === -1) {
    throw createError('vertex_gemini service account token_uri is not allowed', {
      provider: 'vertex_gemini',
      tokenUri: canonical || null,
      allowedTokenUris: AST_VERTEX_AUTH_CORE_ALLOWED_TOKEN_URIS
    });
  }

  return canonical;
}

function astVertexAuthCoreParseServiceAccountJson(rawServiceAccountJson, createError, missingFieldMessage) {
  if (!rawServiceAccountJson) {
    throw createError(missingFieldMessage, {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    });
  }

  let parsed;
  try {
    parsed = typeof rawServiceAccountJson === 'string'
      ? JSON.parse(rawServiceAccountJson)
      : rawServiceAccountJson;
  } catch (error) {
    throw createError('vertex_gemini service account JSON is invalid', {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    }, error);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw createError('vertex_gemini service account JSON must decode to an object', {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    });
  }

  const clientEmail = String(parsed.client_email || '').trim();
  const privateKey = String(parsed.private_key || '').trim();
  if (!clientEmail || !privateKey) {
    throw createError('vertex_gemini service account JSON must include client_email and private_key', {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    });
  }

  const tokenUri = astVertexAuthCoreValidateTokenUri(
    String(parsed.token_uri || AST_VERTEX_AUTH_CORE_ALLOWED_TOKEN_URIS[0]).trim(),
    createError
  );

  return {
    client_email: clientEmail,
    private_key: privateKey,
    token_uri: tokenUri
  };
}

function astVertexAuthCoreBuildServiceAccountCacheKey(serviceAccount, tokenUri, scope, createError) {
  return [
    String(serviceAccount.client_email || '').trim(),
    String(tokenUri || '').trim(),
    String(scope || '').trim(),
    astVertexAuthCoreSha256Hex(String(serviceAccount.private_key || '').trim(), createError)
  ].join('::');
}

function astVertexAuthCoreBuildJwtAssertion(serviceAccount, tokenUri, scope, createError) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: scope,
    aud: tokenUri,
    exp: nowSec + 3600,
    iat: nowSec
  };

  const encodedHeader = astVertexAuthCoreBase64UrlEncodeString(JSON.stringify(header), createError);
  const encodedPayload = astVertexAuthCoreBase64UrlEncodeString(JSON.stringify(payload), createError);
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  let signatureBytes;
  try {
    if (
      typeof Utilities === 'undefined' ||
      !Utilities ||
      typeof Utilities.computeRsaSha256Signature !== 'function'
    ) {
      throw new Error('Utilities.computeRsaSha256Signature is required');
    }
    signatureBytes = Utilities.computeRsaSha256Signature(unsigned, serviceAccount.private_key);
  } catch (error) {
    throw createError('Unable to sign vertex_gemini service-account JWT assertion', {
      provider: 'vertex_gemini'
    }, error);
  }

  return `${unsigned}.${astVertexAuthCoreBase64UrlEncodeBytes(signatureBytes, createError)}`;
}

function astVertexAuthCoreExchangeServiceAccountToken({
  rawServiceAccountJson,
  cacheState,
  createError,
  missingFieldMessage
}) {
  const serviceAccount = astVertexAuthCoreParseServiceAccountJson(
    rawServiceAccountJson,
    createError,
    missingFieldMessage
  );

  const tokenUri = String(serviceAccount.token_uri || AST_VERTEX_AUTH_CORE_ALLOWED_TOKEN_URIS[0]).trim();
  const scope = 'https://www.googleapis.com/auth/cloud-platform';
  const cacheKey = astVertexAuthCoreBuildServiceAccountCacheKey(
    serviceAccount,
    tokenUri,
    scope,
    createError
  );

  if (
    cacheState &&
    cacheState.cacheKey === cacheKey &&
    cacheState.token &&
    Date.now() < Number(cacheState.expiresAtMs || 0)
  ) {
    return cacheState.token;
  }

  const assertion = astVertexAuthCoreBuildJwtAssertion(serviceAccount, tokenUri, scope, createError);
  const payload = [
    'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer',
    `assertion=${encodeURIComponent(assertion)}`
  ].join('&');

  let response;
  try {
    response = UrlFetchApp.fetch(tokenUri, {
      method: 'post',
      muteHttpExceptions: true,
      contentType: 'application/x-www-form-urlencoded',
      payload: payload
    });
  } catch (error) {
    throw createError('vertex_gemini service-account token exchange request failed', {
      provider: 'vertex_gemini'
    }, error);
  }

  const statusCode = Number(response.getResponseCode());
  const body = String(response.getContentText() || '');
  let parsed = {};
  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch (_error) {
      parsed = {};
    }
  }

  const accessToken = String(parsed.access_token || '').trim();
  if (!Number.isFinite(statusCode) || statusCode < 200 || statusCode >= 300 || !accessToken) {
    throw createError('vertex_gemini service-account token exchange failed', {
      provider: 'vertex_gemini',
      statusCode: Number.isFinite(statusCode) ? statusCode : null
    });
  }

  const expiresInSec = Number.isFinite(Number(parsed.expires_in))
    ? Number(parsed.expires_in)
    : 3600;
  const ttlSec = Math.max(60, Math.floor(expiresInSec) - 120);

  if (cacheState) {
    cacheState.cacheKey = cacheKey;
    cacheState.token = accessToken;
    cacheState.expiresAtMs = Date.now() + (ttlSec * 1000);
  }

  return accessToken;
}
