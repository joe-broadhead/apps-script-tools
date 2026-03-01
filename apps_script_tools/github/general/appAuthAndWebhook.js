const AST_GITHUB_APP_TOKEN_CACHE = {};

function astGitHubAppIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astGitHubAppNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astGitHubAppBase64UrlEncodeString(value) {
  if (typeof Utilities === 'undefined' || !Utilities || typeof Utilities.base64EncodeWebSafe !== 'function') {
    throw new AstGitHubProviderError('Utilities.base64EncodeWebSafe is required for GitHub App JWT signing');
  }
  return Utilities.base64EncodeWebSafe(String(value)).replace(/=+$/g, '');
}

function astGitHubAppBase64UrlEncodeBytes(bytes) {
  if (typeof Utilities === 'undefined' || !Utilities || typeof Utilities.base64EncodeWebSafe !== 'function') {
    throw new AstGitHubProviderError('Utilities.base64EncodeWebSafe is required for GitHub App JWT signing');
  }
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function astGitHubAppBuildJwt(config = {}, nowMs = Date.now()) {
  const appId = astGitHubAppNormalizeString(config.appId, '');
  const privateKey = astGitHubAppNormalizeString(config.appPrivateKey, '');

  if (!appId || !privateKey) {
    throw new AstGitHubAuthError('GitHub App JWT generation requires appId and appPrivateKey', {
      field: !appId ? 'appId' : 'appPrivateKey'
    });
  }

  if (typeof Utilities === 'undefined' || !Utilities || typeof Utilities.computeRsaSha256Signature !== 'function') {
    throw new AstGitHubProviderError('Utilities.computeRsaSha256Signature is required for GitHub App auth');
  }

  const nowSeconds = Math.floor(Math.max(0, nowMs) / 1000);
  const payload = {
    iat: Math.max(0, nowSeconds - 60),
    exp: nowSeconds + 540,
    iss: appId
  };
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const encodedHeader = astGitHubAppBase64UrlEncodeString(JSON.stringify(header));
  const encodedPayload = astGitHubAppBase64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signatureBytes = Utilities.computeRsaSha256Signature(signingInput, privateKey);
  const encodedSignature = astGitHubAppBase64UrlEncodeBytes(signatureBytes);

  return `${signingInput}.${encodedSignature}`;
}

function astGitHubAppBuildCacheKey(config = {}) {
  return [
    astGitHubAppNormalizeString(config.baseUrl, 'https://api.github.com').replace(/\/+$/g, ''),
    astGitHubAppNormalizeString(config.appId, ''),
    astGitHubAppNormalizeString(config.appInstallationId, '')
  ].join('|');
}

function astGitHubAppReadCachedToken(cacheKey, nowMs = Date.now()) {
  const entry = AST_GITHUB_APP_TOKEN_CACHE[cacheKey];
  if (!astGitHubAppIsPlainObject(entry)) {
    return null;
  }

  const expiresAtMs = Number(entry.expiresAtMs || 0);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
    return null;
  }

  const safetySkewMs = 60 * 1000;
  if (expiresAtMs <= (nowMs + safetySkewMs)) {
    return null;
  }

  return {
    token: entry.token,
    expiresAt: entry.expiresAt,
    permissions: entry.permissions,
    repositories: entry.repositories,
    repositorySelection: entry.repositorySelection,
    cached: true,
    statusCode: 200,
    headers: {}
  };
}

function astGitHubAppWriteCachedToken(cacheKey, payload = {}) {
  const expiresAt = astGitHubAppNormalizeString(payload.expiresAt, '');
  const token = astGitHubAppNormalizeString(payload.token, '');
  if (!token || !expiresAt) {
    return;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
    return;
  }

  AST_GITHUB_APP_TOKEN_CACHE[cacheKey] = {
    token,
    expiresAt,
    expiresAtMs,
    permissions: astGitHubAppIsPlainObject(payload.permissions) ? payload.permissions : {},
    repositories: Array.isArray(payload.repositories) ? payload.repositories.slice() : [],
    repositorySelection: payload.repositorySelection || null
  };
}

function astGitHubExchangeAppInstallationToken(config = {}, request = {}, options = {}) {
  const appId = astGitHubAppNormalizeString(config.appId, '');
  const appInstallationId = astGitHubAppNormalizeString(config.appInstallationId, '');
  const appPrivateKey = astGitHubAppNormalizeString(config.appPrivateKey, '');
  const forceRefresh = Boolean(options && options.forceRefresh === true);

  if (!appId || !appInstallationId || !appPrivateKey) {
    throw new AstGitHubAuthError('GitHub App auth requires appId, appInstallationId, and appPrivateKey', {
      required: ['appId', 'appInstallationId', 'appPrivateKey']
    });
  }

  const cacheKey = astGitHubAppBuildCacheKey(config);
  if (!forceRefresh) {
    const cached = astGitHubAppReadCachedToken(cacheKey);
    if (cached && cached.token) {
      return cached;
    }
  }

  const jwt = astGitHubAppBuildJwt(config);
  const tokenUrl = `${astGitHubAppNormalizeString(config.baseUrl, 'https://api.github.com').replace(/\/+$/g, '')}/app/installations/${encodeURIComponent(appInstallationId)}/access_tokens`;
  const headers = {
    Authorization: `Bearer ${jwt}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': config.apiVersion || '2022-11-28',
    'User-Agent': config.userAgent || 'apps-script-tools/0.0.5'
  };

  const requestBody = astGitHubAppIsPlainObject(request.body) ? request.body : {};
  const payload = {};
  if (Array.isArray(requestBody.repository_ids)) {
    payload.repository_ids = requestBody.repository_ids.slice();
  }
  if (Array.isArray(requestBody.repositories)) {
    payload.repositories = requestBody.repositories.slice();
  }
  if (astGitHubAppIsPlainObject(requestBody.permissions)) {
    payload.permissions = Object.assign({}, requestBody.permissions);
  }

  const response = astGitHubHttpRequest({
    operation: 'auth_as_app',
    url: tokenUrl,
    method: 'post',
    headers,
    payload: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
    timeoutMs: config.timeoutMs,
    retries: config.retries
  });

  const bodyJson = astGitHubAppIsPlainObject(response.bodyJson) ? response.bodyJson : null;
  const token = astGitHubAppNormalizeString(bodyJson && bodyJson.token, '');
  const expiresAt = astGitHubAppNormalizeString(bodyJson && bodyJson.expires_at, '');
  if (!token || !expiresAt) {
    throw new AstGitHubParseError('GitHub App auth response is missing token or expires_at', {
      operation: 'auth_as_app'
    });
  }

  const tokenPayload = {
    token,
    expiresAt,
    permissions: astGitHubAppIsPlainObject(bodyJson.permissions) ? bodyJson.permissions : {},
    repositories: Array.isArray(bodyJson.repositories) ? bodyJson.repositories.slice() : [],
    repositorySelection: astGitHubAppNormalizeString(bodyJson.repository_selection, null)
  };

  astGitHubAppWriteCachedToken(cacheKey, tokenPayload);

  return Object.assign({}, tokenPayload, {
    cached: false,
    statusCode: response.statusCode,
    headers: response.headers || {}
  });
}

function astGitHubShouldSkipTokenForOperation(operation) {
  return operation === 'auth_as_app' || operation === 'verify_webhook' || operation === 'parse_webhook';
}

function astGitHubEnsureAuthToken(config = {}, request = {}) {
  const operation = astGitHubAppNormalizeString(request.operation, '').toLowerCase();
  if (astGitHubShouldSkipTokenForOperation(operation)) {
    return config;
  }

  if (astGitHubAppNormalizeString(config.token, '')) {
    return config;
  }

  const hasAppCredentials = Boolean(
    astGitHubAppNormalizeString(config.appId, '') &&
    astGitHubAppNormalizeString(config.appInstallationId, '') &&
    astGitHubAppNormalizeString(config.appPrivateKey, '')
  );
  if (!hasAppCredentials) {
    throw new AstGitHubAuthError("Missing required GitHub configuration field 'token'", {
      field: 'token',
      alsoAccepted: ['appId', 'appInstallationId', 'appPrivateKey']
    });
  }

  const tokenPayload = astGitHubExchangeAppInstallationToken(config, request, {
    forceRefresh: Boolean(request.options && request.options.forceRefreshToken === true)
  });

  return Object.assign({}, config, {
    token: tokenPayload.token,
    tokenType: 'github_app'
  });
}

function astGitHubWebhookHeader(headers = {}, name) {
  if (!astGitHubAppIsPlainObject(headers)) {
    return null;
  }

  const headerName = String(name || '').toLowerCase();
  if (!headerName) {
    return null;
  }

  const keys = Object.keys(headers);
  for (let idx = 0; idx < keys.length; idx += 1) {
    if (String(keys[idx]).toLowerCase() === headerName) {
      return headers[keys[idx]];
    }
  }

  return null;
}

function astGitHubWebhookPayloadRaw(request = {}) {
  const payload = typeof request.payload !== 'undefined'
    ? request.payload
    : (request.body && Object.prototype.hasOwnProperty.call(request.body, 'payload')
      ? request.body.payload
      : undefined);

  if (typeof payload === 'undefined') {
    throw new AstGitHubValidationError("Missing required GitHub request field 'payload'", {
      field: 'payload'
    });
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (astGitHubAppIsPlainObject(payload)) {
    return JSON.stringify(payload);
  }

  throw new AstGitHubValidationError("GitHub request field 'payload' must be a string or object", {
    field: 'payload'
  });
}

function astGitHubWebhookResolveSecret(config = {}, request = {}) {
  const auth = astGitHubAppIsPlainObject(request.auth) ? request.auth : {};
  const body = astGitHubAppIsPlainObject(request.body) ? request.body : {};
  const secret = astGitHubAppNormalizeString(
    auth.webhookSecret || auth.webhook_secret || body.webhookSecret || body.secret || config.webhookSecret,
    ''
  );

  if (!secret) {
    throw new AstGitHubAuthError('GitHub webhook verification requires webhook secret', {
      field: 'webhookSecret',
      scriptKey: 'GITHUB_WEBHOOK_SECRET'
    });
  }

  return secret;
}

function astGitHubWebhookHex(bytes = []) {
  const normalized = Array.isArray(bytes) ? bytes : [];
  return normalized
    .map(byte => {
      const value = byte < 0 ? byte + 256 : byte;
      return value.toString(16).padStart(2, '0');
    })
    .join('');
}

function astGitHubWebhookConstantTimeEqual(left, right) {
  const lhs = String(left || '');
  const rhs = String(right || '');
  if (lhs.length !== rhs.length) {
    return false;
  }

  let result = 0;
  for (let idx = 0; idx < lhs.length; idx += 1) {
    result |= lhs.charCodeAt(idx) ^ rhs.charCodeAt(idx);
  }

  return result === 0;
}

function astGitHubVerifyWebhookSignature(request = {}, config = {}, options = {}) {
  const payloadRaw = astGitHubWebhookPayloadRaw(request);
  const secret = astGitHubWebhookResolveSecret(config, request);
  const headers = astGitHubAppIsPlainObject(request.headers) ? request.headers : {};
  const signatureHeader = astGitHubAppNormalizeString(
    astGitHubWebhookHeader(headers, 'x-hub-signature-256'),
    ''
  );

  if (!signatureHeader) {
    throw new AstGitHubValidationError("Missing required GitHub request header 'x-hub-signature-256'", {
      field: 'headers.x-hub-signature-256'
    });
  }

  const match = signatureHeader.match(/^sha256=([a-fA-F0-9]{64})$/);
  if (!match) {
    throw new AstGitHubValidationError("GitHub request header 'x-hub-signature-256' is malformed", {
      field: 'headers.x-hub-signature-256'
    });
  }

  if (typeof Utilities === 'undefined' || !Utilities || typeof Utilities.computeHmacSha256Signature !== 'function') {
    throw new AstGitHubProviderError('Utilities.computeHmacSha256Signature is required for webhook verification');
  }

  const expectedHex = astGitHubWebhookHex(Utilities.computeHmacSha256Signature(payloadRaw, secret)).toLowerCase();
  const providedHex = String(match[1] || '').toLowerCase();
  const valid = astGitHubWebhookConstantTimeEqual(expectedHex, providedHex);

  if (!valid && options.throwOnInvalid !== false) {
    throw new AstGitHubAuthError('GitHub webhook signature verification failed', {
      operation: 'verify_webhook',
      event: astGitHubAppNormalizeString(astGitHubWebhookHeader(headers, 'x-github-event'), null),
      deliveryId: astGitHubAppNormalizeString(astGitHubWebhookHeader(headers, 'x-github-delivery'), null)
    });
  }

  return {
    valid,
    event: astGitHubAppNormalizeString(astGitHubWebhookHeader(headers, 'x-github-event'), null),
    deliveryId: astGitHubAppNormalizeString(astGitHubWebhookHeader(headers, 'x-github-delivery'), null),
    signatureHeader: signatureHeader
  };
}

function astGitHubParseWebhookEvent(request = {}, config = {}) {
  const payloadRaw = astGitHubWebhookPayloadRaw(request);
  const payloadObject = typeof request.payload === 'string'
    ? null
    : (astGitHubAppIsPlainObject(request.payload) ? request.payload : null);
  let payloadJson = payloadObject;

  if (!payloadJson) {
    try {
      payloadJson = JSON.parse(payloadRaw);
    } catch (error) {
      throw new AstGitHubParseError('Failed to parse GitHub webhook payload as JSON', {
        operation: 'parse_webhook'
      }, error);
    }
  }

  const headers = astGitHubAppIsPlainObject(request.headers) ? request.headers : {};
  const verifySignature = Boolean(request.options && request.options.verifySignature === true);
  const verification = verifySignature
    ? astGitHubVerifyWebhookSignature(request, config, { throwOnInvalid: true })
    : null;

  const repository = astGitHubAppIsPlainObject(payloadJson.repository) ? payloadJson.repository : {};
  const sender = astGitHubAppIsPlainObject(payloadJson.sender) ? payloadJson.sender : {};
  const installation = astGitHubAppIsPlainObject(payloadJson.installation) ? payloadJson.installation : {};

  return {
    event: astGitHubAppNormalizeString(astGitHubWebhookHeader(headers, 'x-github-event'), null),
    deliveryId: astGitHubAppNormalizeString(astGitHubWebhookHeader(headers, 'x-github-delivery'), null),
    hookId: astGitHubAppNormalizeString(astGitHubWebhookHeader(headers, 'x-github-hook-id'), null),
    action: astGitHubAppNormalizeString(payloadJson.action, null),
    repository: {
      id: repository.id || null,
      name: astGitHubAppNormalizeString(repository.name, null),
      fullName: astGitHubAppNormalizeString(repository.full_name, null),
      ownerLogin: repository.owner ? astGitHubAppNormalizeString(repository.owner.login, null) : null,
      private: typeof repository.private === 'boolean' ? repository.private : null,
      defaultBranch: astGitHubAppNormalizeString(repository.default_branch, null)
    },
    sender: {
      id: sender.id || null,
      login: astGitHubAppNormalizeString(sender.login, null),
      type: astGitHubAppNormalizeString(sender.type, null)
    },
    installationId: installation && typeof installation.id !== 'undefined' ? installation.id : null,
    organizationLogin: payloadJson.organization ? astGitHubAppNormalizeString(payloadJson.organization.login, null) : null,
    verified: verification ? verification.valid : null,
    payload: payloadJson
  };
}

function astGitHubExecuteAuthAsApp(request, config) {
  const spec = {
    read: true,
    mutation: true,
    paginated: false,
    group: 'auth'
  };
  const path = `/app/installations/${encodeURIComponent(astGitHubAppNormalizeString(config.appInstallationId, '{installation_id}'))}/access_tokens`;

  if (request.options && request.options.dryRun === true) {
    const plan = astGitHubBuildDryRunPlan({
      request,
      config,
      operationSpec: spec,
      method: 'post',
      path,
      queryParams: {},
      body: astGitHubAppIsPlainObject(request.body) ? Object.assign({}, request.body) : {}
    });

    return astGitHubNormalizeResponse({
      operation: request.operation,
      operationSpec: spec,
      method: 'post',
      path,
      request,
      config,
      dryRunPlan: plan
    });
  }

  const tokenPayload = astGitHubExchangeAppInstallationToken(config, request, {
    forceRefresh: Boolean(request.options && request.options.forceRefreshToken === true)
  });

  const bodyJson = {
    token: tokenPayload.token,
    tokenType: 'github_app_installation',
    expiresAt: tokenPayload.expiresAt,
    appId: config.appId,
    installationId: config.appInstallationId,
    repositorySelection: tokenPayload.repositorySelection || null,
    permissions: astGitHubAppIsPlainObject(tokenPayload.permissions) ? tokenPayload.permissions : {},
    repositories: Array.isArray(tokenPayload.repositories) ? tokenPayload.repositories.slice() : [],
    cacheHit: tokenPayload.cached === true
  };

  return astGitHubNormalizeResponse({
    operation: request.operation,
    operationSpec: spec,
    method: 'post',
    path,
    request,
    config,
    httpResult: {
      statusCode: tokenPayload.statusCode || 200,
      bodyJson,
      bodyText: JSON.stringify(bodyJson),
      headers: astGitHubAppIsPlainObject(tokenPayload.headers) ? tokenPayload.headers : {}
    },
    warnings: tokenPayload.cached === true
      ? ['Returned cached GitHub App installation token']
      : []
  });
}

function astGitHubExecuteVerifyWebhook(request, config) {
  const spec = {
    read: true,
    mutation: false,
    paginated: false,
    group: 'webhooks'
  };
  const verification = astGitHubVerifyWebhookSignature(request, config, { throwOnInvalid: true });

  const bodyJson = {
    valid: verification.valid,
    event: verification.event,
    deliveryId: verification.deliveryId,
    signatureHeader: verification.signatureHeader
  };

  return astGitHubNormalizeResponse({
    operation: request.operation,
    operationSpec: spec,
    method: 'post',
    path: '/app/webhooks/verify',
    request,
    config,
    httpResult: {
      statusCode: 200,
      bodyJson,
      bodyText: JSON.stringify(bodyJson),
      headers: {}
    }
  });
}

function astGitHubExecuteParseWebhook(request, config) {
  const spec = {
    read: true,
    mutation: false,
    paginated: false,
    group: 'webhooks'
  };
  const parsed = astGitHubParseWebhookEvent(request, config);

  return astGitHubNormalizeResponse({
    operation: request.operation,
    operationSpec: spec,
    method: 'post',
    path: '/app/webhooks/parse',
    request,
    config,
    httpResult: {
      statusCode: 200,
      bodyJson: parsed,
      bodyText: JSON.stringify(parsed),
      headers: {}
    }
  });
}
