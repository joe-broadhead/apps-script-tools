const AST_RAG_VERTEX_TOKEN_CACHE = {
  cacheKey: null,
  token: null,
  expiresAtMs: 0
};

function astRagCreateVertexAuthError(message, details, cause) {
  return new AstRagAuthError(message, details, cause);
}

function astRagResolveVertexConfigString({
  requestValue,
  authValue,
  runtimeConfig,
  scriptConfig,
  scriptKey,
  required,
  field
}) {
  return astRagResolveConfigString({
    field,
    scriptKey,
    required,
    requestValue,
    authValue,
    runtimeConfig,
    scriptConfig
  });
}

function astRagResolveVertexAuthMode(auth = {}, runtimeConfig = {}, scriptConfig = {}) {
  return astVertexAuthCoreResolveAuthMode({
    auth,
    runtimeConfig,
    scriptConfig,
    resolveConfigString: astRagResolveVertexConfigString,
    createError: astRagCreateVertexAuthError
  });
}

function astRagResolveVertexServiceAccountJson(auth = {}, runtimeConfig = {}, scriptConfig = {}) {
  return astVertexAuthCoreResolveServiceAccountJson({
    auth,
    runtimeConfig,
    scriptConfig,
    resolveConfigString: astRagResolveVertexConfigString
  });
}

function astRagExchangeVertexServiceAccountToken(rawServiceAccountJson) {
  return astVertexAuthCoreExchangeServiceAccountToken({
    rawServiceAccountJson,
    cacheState: AST_RAG_VERTEX_TOKEN_CACHE,
    createError: astRagCreateVertexAuthError,
    missingFieldMessage: "Missing required RAG configuration field 'serviceAccountJson'"
  });
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
