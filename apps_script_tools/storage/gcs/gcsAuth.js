const AST_GCS_TOKEN_CACHE = {
  cacheKey: null,
  token: null,
  expiresAtMs: 0
};

function astGcsBase64UrlFromBytes(bytes) {
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

  throw new AstStorageAuthError('Utilities.base64EncodeWebSafe or base64Encode is required for GCS JWT encoding');
}

function astGcsBase64UrlFromString(value) {
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

  throw new AstStorageAuthError('Utilities.base64EncodeWebSafe or base64Encode is required for GCS JWT encoding');
}

function astGcsSignJwtPayload(unsignedToken, privateKey) {
  if (
    typeof Utilities !== 'undefined' &&
    Utilities &&
    typeof Utilities.computeRsaSha256Signature === 'function'
  ) {
    return Utilities.computeRsaSha256Signature(unsignedToken, privateKey);
  }

  throw new AstStorageAuthError('Utilities.computeRsaSha256Signature is required for GCS service account auth');
}

function astGcsBuildJwtAssertion(serviceAccount) {
  const nowSec = Math.floor(Date.now() / 1000);
  const tokenUri = astStorageNormalizeString(serviceAccount.token_uri, 'https://oauth2.googleapis.com/token');

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: tokenUri,
    exp: nowSec + 3600,
    iat: nowSec
  };

  const encodedHeader = astGcsBase64UrlFromString(JSON.stringify(header));
  const encodedClaimSet = astGcsBase64UrlFromString(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;
  const signatureBytes = astGcsSignJwtPayload(unsignedToken, serviceAccount.private_key);
  const signature = astGcsBase64UrlFromBytes(signatureBytes);

  return {
    assertion: `${unsignedToken}.${signature}`,
    tokenUri
  };
}

function astGcsParseServiceAccountJson(raw) {
  if (!raw) {
    return null;
  }

  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    throw new AstStorageAuthError('GCS service account JSON is invalid', {}, error);
  }

  if (!astStorageIsPlainObject(parsed)) {
    throw new AstStorageAuthError('GCS service account JSON must decode to an object');
  }

  const clientEmail = astStorageNormalizeString(parsed.client_email, '');
  const privateKey = astStorageNormalizeString(parsed.private_key, '');

  if (!clientEmail || !privateKey) {
    throw new AstStorageAuthError('GCS service account JSON must include client_email and private_key');
  }

  return parsed;
}

function astGcsExchangeServiceAccountToken(serviceAccountJson, requestOptions = {}) {
  const serviceAccount = astGcsParseServiceAccountJson(serviceAccountJson);
  const cacheKey = `${serviceAccount.client_email}::${serviceAccount.private_key.slice(0, 16)}`;

  if (AST_GCS_TOKEN_CACHE.cacheKey === cacheKey && AST_GCS_TOKEN_CACHE.token && Date.now() < AST_GCS_TOKEN_CACHE.expiresAtMs) {
    return AST_GCS_TOKEN_CACHE.token;
  }

  const jwt = astGcsBuildJwtAssertion(serviceAccount);
  const payload = [
    'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer',
    `assertion=${encodeURIComponent(jwt.assertion)}`
  ].join('&');

  const response = astStorageHttpRequest({
    provider: 'gcs',
    operation: 'auth',
    url: jwt.tokenUri,
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload,
    retries: Math.max(0, Number.isInteger(requestOptions.retries) ? requestOptions.retries : 1)
  });

  const token = astStorageNormalizeString(response.json && response.json.access_token, '');
  if (!token) {
    throw new AstStorageAuthError('GCS token exchange did not return access_token', {
      response: response.json || null
    });
  }

  const expiresIn = Number.isFinite(Number(response.json && response.json.expires_in))
    ? Number(response.json.expires_in)
    : 3600;

  AST_GCS_TOKEN_CACHE.cacheKey = cacheKey;
  AST_GCS_TOKEN_CACHE.token = token;
  AST_GCS_TOKEN_CACHE.expiresAtMs = Date.now() + Math.max(60, expiresIn - 60) * 1000;

  return token;
}

function astGcsResolveAccessToken(config, requestOptions = {}) {
  const mode = astStorageNormalizeString(config.authMode, 'auto').toLowerCase();

  if (mode === 'oauth') {
    if (!config.oauthToken) {
      throw new AstStorageAuthError('Missing OAuth token for GCS provider');
    }
    return config.oauthToken;
  }

  if (mode === 'service_account') {
    if (!config.serviceAccountJson) {
      throw new AstStorageAuthError('Missing service account JSON for GCS provider');
    }
    return astGcsExchangeServiceAccountToken(config.serviceAccountJson, requestOptions);
  }

  if (config.oauthToken) {
    return config.oauthToken;
  }

  if (config.serviceAccountJson) {
    return astGcsExchangeServiceAccountToken(config.serviceAccountJson, requestOptions);
  }

  throw new AstStorageAuthError('Unable to resolve GCS auth token');
}
