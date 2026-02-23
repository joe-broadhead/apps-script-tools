const AST_RAG_VERTEX_TOKEN_CACHE = {
  cacheKey: null,
  token: null,
  expiresAtMs: 0
};

function astRagNormalizeVertexAuthMode(mode) {
  const normalized = astRagNormalizeString(mode, 'auto').toLowerCase();
  if (normalized !== 'oauth' && normalized !== 'service_account' && normalized !== 'auto') {
    throw new AstRagAuthError('vertex_gemini authMode must be one of: oauth, service_account, auto', {
      authMode: normalized
    });
  }
  return normalized;
}

function astRagResolveVertexAuthMode(auth = {}, runtimeConfig = {}, scriptConfig = {}) {
  const mode = astRagResolveConfigString({
    field: 'authMode',
    scriptKey: 'VERTEX_AUTH_MODE',
    required: false,
    requestValue: auth.authMode,
    authValue: auth.VERTEX_AUTH_MODE,
    runtimeConfig,
    scriptConfig
  });
  return astRagNormalizeVertexAuthMode(mode || 'auto');
}

function astRagResolveVertexServiceAccountJson(auth = {}, runtimeConfig = {}, scriptConfig = {}) {
  if (auth && typeof auth.serviceAccountJson === 'object' && !Array.isArray(auth.serviceAccountJson)) {
    return auth.serviceAccountJson;
  }

  if (auth && typeof auth.VERTEX_SERVICE_ACCOUNT_JSON === 'object' && !Array.isArray(auth.VERTEX_SERVICE_ACCOUNT_JSON)) {
    return auth.VERTEX_SERVICE_ACCOUNT_JSON;
  }

  return astRagResolveConfigString({
    field: 'serviceAccountJson',
    scriptKey: 'VERTEX_SERVICE_ACCOUNT_JSON',
    required: false,
    requestValue: auth.serviceAccountJson,
    authValue: auth.VERTEX_SERVICE_ACCOUNT_JSON,
    runtimeConfig,
    scriptConfig
  });
}

function astRagBase64UrlEncodeString(value) {
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

  throw new AstRagAuthError('Utilities.base64EncodeWebSafe/base64Encode is required for vertex_gemini service-account auth');
}

function astRagBase64UrlEncodeBytes(bytes) {
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

  throw new AstRagAuthError('Utilities.base64EncodeWebSafe/base64Encode is required for vertex_gemini service-account auth');
}

function astRagParseVertexServiceAccountJson(rawServiceAccountJson) {
  if (!rawServiceAccountJson) {
    throw new AstRagAuthError("Missing required RAG configuration field 'serviceAccountJson'", {
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
    throw new AstRagAuthError('vertex_gemini service account JSON is invalid', {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    }, error);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AstRagAuthError('vertex_gemini service account JSON must decode to an object', {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    });
  }

  const clientEmail = astRagNormalizeString(parsed.client_email, null);
  const privateKey = astRagNormalizeString(parsed.private_key, null);
  if (!clientEmail || !privateKey) {
    throw new AstRagAuthError(
      'vertex_gemini service account JSON must include client_email and private_key',
      {
        field: 'serviceAccountJson',
        provider: 'vertex_gemini'
      }
    );
  }

  return parsed;
}

function astRagSha256Hex(value) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeDigest !== 'function' ||
    !Utilities.DigestAlgorithm ||
    !Utilities.DigestAlgorithm.SHA_256
  ) {
    throw new AstRagAuthError(
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

function astRagBuildVertexServiceAccountCacheKey(serviceAccount, tokenUri, scope) {
  return [
    astRagNormalizeString(serviceAccount.client_email, ''),
    astRagNormalizeString(tokenUri, ''),
    astRagNormalizeString(scope, ''),
    astRagSha256Hex(astRagNormalizeString(serviceAccount.private_key, ''))
  ].join('::');
}

function astRagBuildVertexJwtAssertion(serviceAccount, tokenUri, scope) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope,
    aud: tokenUri,
    exp: nowSec + 3600,
    iat: nowSec
  };

  const encodedHeader = astRagBase64UrlEncodeString(JSON.stringify(header));
  const encodedPayload = astRagBase64UrlEncodeString(JSON.stringify(payload));
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
    throw new AstRagAuthError('Unable to sign vertex_gemini service-account JWT assertion', {
      provider: 'vertex_gemini'
    }, error);
  }

  return `${unsigned}.${astRagBase64UrlEncodeBytes(signatureBytes)}`;
}

function astRagExchangeVertexServiceAccountToken(rawServiceAccountJson) {
  const serviceAccount = astRagParseVertexServiceAccountJson(rawServiceAccountJson);
  const tokenUri = astRagNormalizeString(serviceAccount.token_uri, 'https://oauth2.googleapis.com/token');
  const scope = 'https://www.googleapis.com/auth/cloud-platform';
  const cacheKey = astRagBuildVertexServiceAccountCacheKey(serviceAccount, tokenUri, scope);

  if (
    AST_RAG_VERTEX_TOKEN_CACHE.cacheKey === cacheKey &&
    AST_RAG_VERTEX_TOKEN_CACHE.token &&
    Date.now() < AST_RAG_VERTEX_TOKEN_CACHE.expiresAtMs
  ) {
    return AST_RAG_VERTEX_TOKEN_CACHE.token;
  }

  const assertion = astRagBuildVertexJwtAssertion(serviceAccount, tokenUri, scope);
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
      payload
    });
  } catch (error) {
    throw new AstRagAuthError('vertex_gemini service-account token exchange request failed', {
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

  const accessToken = astRagNormalizeString(parsed.access_token, null);
  if (!Number.isFinite(statusCode) || statusCode < 200 || statusCode >= 300 || !accessToken) {
    throw new AstRagAuthError('vertex_gemini service-account token exchange failed', {
      provider: 'vertex_gemini',
      statusCode: Number.isFinite(statusCode) ? statusCode : null
    });
  }

  const expiresInSec = Number.isFinite(Number(parsed.expires_in))
    ? Number(parsed.expires_in)
    : 3600;
  const ttlSec = Math.max(60, Math.floor(expiresInSec) - 120);

  AST_RAG_VERTEX_TOKEN_CACHE.cacheKey = cacheKey;
  AST_RAG_VERTEX_TOKEN_CACHE.token = accessToken;
  AST_RAG_VERTEX_TOKEN_CACHE.expiresAtMs = Date.now() + (ttlSec * 1000);

  return accessToken;
}

function astRagResolveVertexOAuthToken(auth = {}) {
  const token = astRagNormalizeString(auth.oauthToken || auth.accessToken, null);
  if (token) {
    return token;
  }

  try {
    if (typeof ScriptApp !== 'undefined' && ScriptApp && typeof ScriptApp.getOAuthToken === 'function') {
      const oauthToken = ScriptApp.getOAuthToken();
      const normalized = astRagNormalizeString(oauthToken, null);
      if (normalized) {
        return normalized;
      }
    }
  } catch (error) {
    throw new AstRagAuthError('Unable to resolve OAuth token for vertex_gemini', {}, error);
  }

  throw new AstRagAuthError('Missing OAuth token for vertex_gemini provider');
}

function astRagResolveVertexAccessToken(auth = {}, runtimeConfig = {}, scriptConfig = {}) {
  const authMode = astRagResolveVertexAuthMode(auth, runtimeConfig, scriptConfig);
  const serviceAccountJson = astRagResolveVertexServiceAccountJson(auth, runtimeConfig, scriptConfig);

  if (authMode === 'oauth') {
    return {
      authMode,
      oauthToken: astRagResolveVertexOAuthToken(auth)
    };
  }

  if (authMode === 'service_account') {
    if (!serviceAccountJson) {
      throw new AstRagAuthError("Missing required RAG configuration field 'serviceAccountJson'", {
        field: 'serviceAccountJson',
        provider: 'vertex_gemini'
      });
    }

    return {
      authMode,
      oauthToken: astRagExchangeVertexServiceAccountToken(serviceAccountJson)
    };
  }

  if (serviceAccountJson) {
    return {
      authMode: 'auto',
      oauthToken: astRagExchangeVertexServiceAccountToken(serviceAccountJson)
    };
  }

  return {
    authMode: 'auto',
    oauthToken: astRagResolveVertexOAuthToken(auth)
  };
}
