const AST_AI_VERTEX_TOKEN_CACHE = {
  cacheKey: null,
  token: null,
  expiresAtMs: 0
};

function astAiNormalizeVertexAuthMode(mode) {
  const normalized = String(mode == null ? 'auto' : mode).trim().toLowerCase();
  if (!normalized) {
    return 'auto';
  }

  if (normalized !== 'oauth' && normalized !== 'service_account' && normalized !== 'auto') {
    throw new AstAiAuthError("vertex_gemini authMode must be one of: oauth, service_account, auto", {
      authMode: normalized
    });
  }

  return normalized;
}

function astAiResolveVertexAuthMode(auth = {}, runtimeConfig = {}, scriptProperties = {}) {
  const mode = astResolveConfigString({
    requestValue: auth.authMode,
    authValue: auth.VERTEX_AUTH_MODE,
    runtimeConfig,
    scriptProperties,
    scriptKey: 'VERTEX_AUTH_MODE',
    required: false,
    field: 'authMode'
  });
  return astAiNormalizeVertexAuthMode(mode || 'auto');
}

function astAiResolveVertexServiceAccountJson(auth = {}, runtimeConfig = {}, scriptProperties = {}) {
  if (auth && typeof auth.serviceAccountJson === 'object' && !Array.isArray(auth.serviceAccountJson)) {
    return auth.serviceAccountJson;
  }

  if (auth && typeof auth.VERTEX_SERVICE_ACCOUNT_JSON === 'object' && !Array.isArray(auth.VERTEX_SERVICE_ACCOUNT_JSON)) {
    return auth.VERTEX_SERVICE_ACCOUNT_JSON;
  }

  return astResolveConfigString({
    requestValue: auth.serviceAccountJson,
    authValue: auth.VERTEX_SERVICE_ACCOUNT_JSON,
    runtimeConfig,
    scriptProperties,
    scriptKey: 'VERTEX_SERVICE_ACCOUNT_JSON',
    required: false,
    field: 'serviceAccountJson'
  });
}

function astAiBase64UrlEncodeString(value) {
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

  throw new AstAiAuthError('Utilities.base64EncodeWebSafe/base64Encode is required for vertex_gemini service-account auth');
}

function astAiBase64UrlEncodeBytes(bytes) {
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

  throw new AstAiAuthError('Utilities.base64EncodeWebSafe/base64Encode is required for vertex_gemini service-account auth');
}

function astAiParseVertexServiceAccountJson(rawServiceAccountJson) {
  if (!rawServiceAccountJson) {
    throw new AstAiAuthError("Missing required AI configuration field 'serviceAccountJson'", {
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
    throw new AstAiAuthError('vertex_gemini service account JSON is invalid', {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    }, error);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AstAiAuthError('vertex_gemini service account JSON must decode to an object', {
      field: 'serviceAccountJson',
      provider: 'vertex_gemini'
    });
  }

  const clientEmail = String(parsed.client_email || '').trim();
  const privateKey = String(parsed.private_key || '').trim();
  if (!clientEmail || !privateKey) {
    throw new AstAiAuthError(
      'vertex_gemini service account JSON must include client_email and private_key',
      {
        field: 'serviceAccountJson',
        provider: 'vertex_gemini'
      }
    );
  }

  return parsed;
}

function astAiSha256Hex(value) {
  if (
    typeof Utilities === 'undefined' ||
    !Utilities ||
    typeof Utilities.computeDigest !== 'function' ||
    !Utilities.DigestAlgorithm ||
    !Utilities.DigestAlgorithm.SHA_256
  ) {
    throw new AstAiAuthError(
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

function astAiBuildVertexServiceAccountCacheKey(serviceAccount, tokenUri, scope) {
  return [
    String(serviceAccount.client_email || '').trim(),
    String(tokenUri || '').trim(),
    String(scope || '').trim(),
    astAiSha256Hex(String(serviceAccount.private_key || '').trim())
  ].join('::');
}

function astAiBuildVertexJwtAssertion(serviceAccount, tokenUri, scope) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: scope,
    aud: tokenUri,
    exp: nowSec + 3600,
    iat: nowSec
  };

  const encodedHeader = astAiBase64UrlEncodeString(JSON.stringify(header));
  const encodedPayload = astAiBase64UrlEncodeString(JSON.stringify(payload));
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
    throw new AstAiAuthError('Unable to sign vertex_gemini service-account JWT assertion', {
      provider: 'vertex_gemini'
    }, error);
  }

  return `${unsigned}.${astAiBase64UrlEncodeBytes(signatureBytes)}`;
}

function astAiExchangeVertexServiceAccountToken(rawServiceAccountJson) {
  const serviceAccount = astAiParseVertexServiceAccountJson(rawServiceAccountJson);
  const tokenUri = String(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token').trim();
  const scope = 'https://www.googleapis.com/auth/cloud-platform';
  const cacheKey = astAiBuildVertexServiceAccountCacheKey(serviceAccount, tokenUri, scope);

  if (
    AST_AI_VERTEX_TOKEN_CACHE.cacheKey === cacheKey &&
    AST_AI_VERTEX_TOKEN_CACHE.token &&
    Date.now() < AST_AI_VERTEX_TOKEN_CACHE.expiresAtMs
  ) {
    return AST_AI_VERTEX_TOKEN_CACHE.token;
  }

  const assertion = astAiBuildVertexJwtAssertion(serviceAccount, tokenUri, scope);
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
    throw new AstAiAuthError('vertex_gemini service-account token exchange request failed', {
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
    throw new AstAiAuthError('vertex_gemini service-account token exchange failed', {
      provider: 'vertex_gemini',
      statusCode: Number.isFinite(statusCode) ? statusCode : null
    });
  }

  const expiresInSec = Number.isFinite(Number(parsed.expires_in))
    ? Number(parsed.expires_in)
    : 3600;
  const ttlSec = Math.max(60, Math.floor(expiresInSec) - 120);

  AST_AI_VERTEX_TOKEN_CACHE.cacheKey = cacheKey;
  AST_AI_VERTEX_TOKEN_CACHE.token = accessToken;
  AST_AI_VERTEX_TOKEN_CACHE.expiresAtMs = Date.now() + (ttlSec * 1000);

  return accessToken;
}

function astAiResolveVertexOAuthToken(auth = {}) {
  const token = astResolveConfigString({
    requestValue: auth.oauthToken,
    authValue: auth.accessToken,
    runtimeConfig: {},
    scriptProperties: {},
    scriptKey: '',
    required: false,
    field: 'oauthToken'
  });

  if (token) {
    return token;
  }

  try {
    if (typeof ScriptApp !== 'undefined' && ScriptApp && typeof ScriptApp.getOAuthToken === 'function') {
      const oauthToken = ScriptApp.getOAuthToken();
      if (typeof oauthToken === 'string' && oauthToken.trim().length > 0) {
        return oauthToken.trim();
      }
    }
  } catch (error) {
    throw new AstAiAuthError('Unable to resolve OAuth token for vertex_gemini', {}, error);
  }

  throw new AstAiAuthError('Missing OAuth token for vertex_gemini provider');
}

function astAiResolveVertexAccessToken(auth = {}, runtimeConfig = {}, scriptProperties = {}) {
  const authMode = astAiResolveVertexAuthMode(auth, runtimeConfig, scriptProperties);
  const serviceAccountJson = astAiResolveVertexServiceAccountJson(auth, runtimeConfig, scriptProperties);

  if (authMode === 'oauth') {
    return {
      authMode,
      oauthToken: astAiResolveVertexOAuthToken(auth)
    };
  }

  if (authMode === 'service_account') {
    if (!serviceAccountJson) {
      throw new AstAiAuthError("Missing required AI configuration field 'serviceAccountJson'", {
        field: 'serviceAccountJson',
        provider: 'vertex_gemini'
      });
    }

    return {
      authMode,
      oauthToken: astAiExchangeVertexServiceAccountToken(serviceAccountJson)
    };
  }

  if (serviceAccountJson) {
    return {
      authMode: 'auto',
      oauthToken: astAiExchangeVertexServiceAccountToken(serviceAccountJson)
    };
  }

  return {
    authMode: 'auto',
    oauthToken: astAiResolveVertexOAuthToken(auth)
  };
}
