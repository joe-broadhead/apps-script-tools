const AST_AI_VERTEX_TOKEN_CACHE = {
  cacheKey: null,
  token: null,
  expiresAtMs: 0
};

function astAiCreateVertexAuthError(message, details, cause) {
  return new AstAiAuthError(message, details, cause);
}

function astAiResolveVertexConfigString({
  requestValue,
  authValue,
  runtimeConfig,
  scriptConfig,
  scriptKey,
  required,
  field
}) {
  return astResolveConfigString({
    requestValue,
    authValue,
    runtimeConfig,
    scriptProperties: scriptConfig || {},
    scriptKey,
    required,
    field
  });
}

function astAiResolveVertexAuthMode(auth = {}, runtimeConfig = {}, scriptProperties = {}) {
  return astVertexAuthCoreResolveAuthMode({
    auth,
    runtimeConfig,
    scriptConfig: scriptProperties,
    resolveConfigString: astAiResolveVertexConfigString,
    createError: astAiCreateVertexAuthError
  });
}

function astAiResolveVertexServiceAccountJson(auth = {}, runtimeConfig = {}, scriptProperties = {}) {
  return astVertexAuthCoreResolveServiceAccountJson({
    auth,
    runtimeConfig,
    scriptConfig: scriptProperties,
    resolveConfigString: astAiResolveVertexConfigString
  });
}

function astAiExchangeVertexServiceAccountToken(rawServiceAccountJson) {
  return astVertexAuthCoreExchangeServiceAccountToken({
    rawServiceAccountJson,
    cacheState: AST_AI_VERTEX_TOKEN_CACHE,
    createError: astAiCreateVertexAuthError,
    missingFieldMessage: "Missing required AI configuration field 'serviceAccountJson'"
  });
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
