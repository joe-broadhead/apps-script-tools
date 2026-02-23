function buildSystemMessage_(userContext, deep, appConfig) {
  var style = deep
    ? 'Be thorough and structured. Provide concise sections and clear bullets.'
    : 'Be concise and direct while preserving important detail.';

  var appName = stringOrEmpty_(appConfig && appConfig.app && appConfig.app.name) || 'this assistant';
  var userLabel = deriveDisplayName_(userContext);

  return [
    'You are a grounded enterprise assistant for ' + appName + '.',
    'Answer only from retrieved context and cited evidence.',
    'Use markdown when it improves readability.',
    style,
    'Cite evidence inline using bracket IDs like [S1], [S2].',
    'Do not output bare citation tokens like S1.',
    'If the context is insufficient, reply exactly with:',
    '"I do not have enough grounded context to answer that."',
    'Do not invent facts.',
    'Current user: ' + userLabel + '.'
  ].join(' ');
}

function deriveDisplayName_(userContext) {
  var email = stringOrEmpty_(userContext && userContext.email);
  if (!email) return 'User';
  var local = email.split('@')[0] || '';
  if (!local) return 'User';
  var token = local.split(/[._-]/)[0] || '';
  if (!token) return 'User';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function resolveRuntime_(request) {
  request = request || {};
  var props = PropertiesService.getScriptProperties().getProperties();

  var embeddingProvider = firstNonEmpty_([
    request.embeddingProvider,
    props.AI_EMBEDDING_PROVIDER,
    'vertex_gemini'
  ]).toLowerCase();

  var generationProvider = firstNonEmpty_([
    request.generationProvider,
    props.AI_GENERATION_PROVIDER,
    'vertex_gemini'
  ]).toLowerCase();

  var embeddingModel = firstNonEmpty_([
    request.embeddingModel,
    props.AI_EMBEDDING_MODEL,
    props.VERTEX_EMBED_MODEL,
    'text-embedding-005'
  ]);

  var modelFast = firstNonEmpty_([
    request.modelFast,
    props.AI_MODEL_FAST,
    props.VERTEX_GEMINI_MODEL_FAST,
    props.VERTEX_GEMINI_MODEL,
    'gemini-2.5-flash'
  ]);

  var modelDeep = firstNonEmpty_([
    request.modelDeep,
    props.AI_MODEL_DEEP,
    props.VERTEX_GEMINI_MODEL_DEEP,
    props.VERTEX_GEMINI_MODEL,
    'gemini-2.5-pro'
  ]);

  return {
    embeddingProvider: embeddingProvider,
    generationProvider: generationProvider,
    embeddingModel: embeddingModel,
    modelFast: modelFast,
    modelDeep: modelDeep,
    embeddingAuth: resolveAuthForProvider_(
      embeddingProvider,
      request.embeddingAuth || request.auth || {},
      props
    ),
    generationAuth: resolveAuthForProvider_(
      generationProvider,
      request.generationAuth || request.auth || {},
      props
    )
  };
}

function resolveAuthForProvider_(provider, overrides, props) {
  provider = stringOrEmpty_(provider).toLowerCase();
  overrides = overrides || {};
  props = props || {};

  if (provider === 'vertex_gemini') {
    var projectId = firstNonEmpty_([
      overrides.projectId,
      props.VERTEX_PROJECT_ID
    ]);
    if (!projectId) {
      throw new Error("Missing Vertex projectId. Set script property 'VERTEX_PROJECT_ID'.");
    }

    return {
      projectId: projectId,
      location: firstNonEmpty_([
        overrides.location,
        props.VERTEX_LOCATION,
        'us-central1'
      ]),
      oauthToken: resolveVertexOauthToken_(overrides, props)
    };
  }

  if (provider === 'openai') {
    return {
      apiKey: firstNonEmpty_([
        overrides.apiKey,
        props.OPENAI_API_KEY
      ])
    };
  }

  if (provider === 'gemini') {
    return {
      apiKey: firstNonEmpty_([
        overrides.apiKey,
        props.GEMINI_API_KEY
      ])
    };
  }

  if (provider === 'openrouter') {
    return {
      apiKey: firstNonEmpty_([
        overrides.apiKey,
        props.OPENROUTER_API_KEY
      ]),
      httpReferer: firstNonEmpty_([
        overrides.httpReferer,
        props.OPENROUTER_HTTP_REFERER
      ]),
      xTitle: firstNonEmpty_([
        overrides.xTitle,
        props.OPENROUTER_X_TITLE
      ])
    };
  }

  if (provider === 'perplexity') {
    return {
      apiKey: firstNonEmpty_([
        overrides.apiKey,
        props.PERPLEXITY_API_KEY
      ])
    };
  }

  return overrides;
}

function resolveVertexOauthToken_(overrides, props) {
  overrides = overrides || {};
  props = props || {};

  var explicitToken = firstNonEmpty_([
    overrides.oauthToken,
    overrides.accessToken
  ]);
  if (explicitToken) return explicitToken;

  var serviceAccountJson = null;
  if (overrides.serviceAccountJson && typeof overrides.serviceAccountJson === 'object') {
    serviceAccountJson = overrides.serviceAccountJson;
  } else {
    var rawServiceAccountJson = firstNonEmpty_([
      overrides.serviceAccountJson,
      props.VERTEX_SERVICE_ACCOUNT_JSON
    ]);
    if (rawServiceAccountJson) {
      serviceAccountJson = rawServiceAccountJson;
    }
  }

  if (serviceAccountJson) {
    return mintVertexServiceAccountAccessToken_(serviceAccountJson);
  }

  try {
    var scriptOauthToken = ScriptApp.getOAuthToken();
    if (stringOrEmpty_(scriptOauthToken).trim()) {
      return scriptOauthToken;
    }
  } catch (_e) {
    // fall through to typed message below
  }

  throw new Error(
    "Missing Vertex auth token. Set request auth.oauthToken/accessToken, or set Script Property 'VERTEX_SERVICE_ACCOUNT_JSON', or authorize ScriptApp OAuth."
  );
}

function mintVertexServiceAccountAccessToken_(serviceAccountJson) {
  var serviceAccount = parseVertexServiceAccountJson_(serviceAccountJson);
  var cacheKey = buildVertexServiceAccountCacheKey_(serviceAccount);
  var cached = getVertexServiceAccountTokenFromCache_(cacheKey);
  if (cached) return cached;

  var tokenUri = stringOrEmpty_(serviceAccount.token_uri).trim() || 'https://oauth2.googleapis.com/token';
  var nowSec = Math.floor(Date.now() / 1000);

  var header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  var claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: tokenUri,
    iat: nowSec,
    exp: nowSec + 3600
  };

  var encodedHeader = encodeJwtPart_(header);
  var encodedClaims = encodeJwtPart_(claims);
  var unsignedJwt = encodedHeader + '.' + encodedClaims;

  var signatureBytes = Utilities.computeRsaSha256Signature(unsignedJwt, serviceAccount.private_key);
  var encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/g, '');
  var assertion = unsignedJwt + '.' + encodedSignature;

  var response = UrlFetchApp.fetch(tokenUri, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/x-www-form-urlencoded',
    payload: 'grant_type=' +
      encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
      '&assertion=' + encodeURIComponent(assertion)
  });

  var status = Number(response.getResponseCode());
  var body = response.getContentText() || '';
  var json = {};
  if (body) {
    try {
      json = JSON.parse(body);
    } catch (_e) {
      json = {};
    }
  }
  var accessToken = stringOrEmpty_(json.access_token).trim();
  if (status < 200 || status >= 300 || !accessToken) {
    throw new Error(
      'Failed to mint Vertex service-account access token (status ' +
      status +
      '). ' +
      (stringOrEmpty_(json.error_description) || stringOrEmpty_(json.error) || body.slice(0, 240))
    );
  }

  var token = accessToken;
  var expiresIn = integerOr_(json.expires_in, 3600);
  cacheVertexServiceAccountToken_(cacheKey, token, expiresIn);

  return token;
}

function parseVertexServiceAccountJson_(value) {
  var obj = value;
  if (typeof value === 'string') {
    try {
      obj = JSON.parse(value);
    } catch (_e) {
      throw new Error("VERTEX_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }
  }

  if (!obj || typeof obj !== 'object') {
    throw new Error("VERTEX_SERVICE_ACCOUNT_JSON must resolve to an object.");
  }

  var clientEmail = stringOrEmpty_(obj.client_email).trim();
  var privateKey = stringOrEmpty_(obj.private_key).trim();
  if (!clientEmail || !privateKey) {
    throw new Error(
      "VERTEX_SERVICE_ACCOUNT_JSON must include 'client_email' and 'private_key'."
    );
  }

  return obj;
}

function encodeJwtPart_(obj) {
  return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/g, '');
}

function buildVertexServiceAccountCacheKey_(serviceAccount) {
  var tokenUri = stringOrEmpty_(serviceAccount && serviceAccount.token_uri).trim();
  var fingerprint = hashUserIdentifier_(
    stringOrEmpty_(serviceAccount && serviceAccount.client_email) + ':' + tokenUri
  );
  return 'rag_chat_vertex_sa_token:' + fingerprint;
}

function getVertexServiceAccountTokenFromCache_(cacheKey) {
  try {
    var cache = CacheService.getScriptCache();
    if (!cache) return '';
    return stringOrEmpty_(cache.get(cacheKey)).trim();
  } catch (_e) {
    return '';
  }
}

function cacheVertexServiceAccountToken_(cacheKey, token, expiresInSec) {
  try {
    var cache = CacheService.getScriptCache();
    if (!cache) return;
    var ttlSec = Math.max(60, Math.min(3500, integerOr_(expiresInSec, 3600) - 120));
    cache.put(cacheKey, token, ttlSec);
  } catch (_e) {
    // ignore cache failures; token minting still succeeded
  }
}

function getAst_() {
  if (typeof ASTLib !== 'undefined') {
    return ASTLib.AST || ASTLib;
  }
  if (typeof AST !== 'undefined') {
    return AST;
  }
  throw new Error('AST library is not available. Add the library and set identifier to ASTLib.');
}
