function astGetScriptPropertiesSnapshot() {
  try {
    if (
      typeof PropertiesService !== 'undefined' &&
      PropertiesService &&
      typeof PropertiesService.getScriptProperties === 'function'
    ) {
      const scriptProperties = PropertiesService.getScriptProperties();
      if (scriptProperties && typeof scriptProperties.getProperties === 'function') {
        return scriptProperties.getProperties() || {};
      }
    }
  } catch (error) {
    // Intentionally swallow property access failures.
  }

  return {};
}

function astResolveConfigString({
  requestValue,
  authValue,
  scriptProperties,
  scriptKey,
  required,
  field
}) {
  const candidates = [requestValue, authValue, scriptProperties[scriptKey]];

  for (let idx = 0; idx < candidates.length; idx++) {
    const value = candidates[idx];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  if (required) {
    throw new AstAiAuthError(`Missing required AI configuration field '${field}'`, {
      field,
      scriptKey
    });
  }

  return null;
}

function astResolveVertexToken(auth) {
  const authObject = auth || {};
  const explicitToken = astResolveConfigString({
    requestValue: authObject.oauthToken,
    authValue: authObject.accessToken,
    scriptProperties: {},
    scriptKey: '',
    required: false,
    field: 'oauthToken'
  });

  if (explicitToken) {
    return explicitToken;
  }

  try {
    if (typeof ScriptApp !== 'undefined' && ScriptApp && typeof ScriptApp.getOAuthToken === 'function') {
      const token = ScriptApp.getOAuthToken();
      if (typeof token === 'string' && token.trim().length > 0) {
        return token;
      }
    }
  } catch (error) {
    throw new AstAiAuthError('Unable to resolve OAuth token for vertex_gemini', {}, error);
  }

  throw new AstAiAuthError('Missing OAuth token for vertex_gemini provider');
}

function resolveAiConfig(request) {
  if (!request || typeof request !== 'object') {
    throw new AstAiValidationError('resolveAiConfig expected a normalized AI request object');
  }

  const scriptProperties = astGetScriptPropertiesSnapshot();
  const auth = request.auth || {};
  const provider = request.provider;

  switch (provider) {
    case 'openai': {
      const apiKey = astResolveConfigString({
        requestValue: auth.apiKey,
        authValue: auth.OPENAI_API_KEY,
        scriptProperties,
        scriptKey: 'OPENAI_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        scriptProperties,
        scriptKey: 'OPENAI_MODEL',
        required: true,
        field: 'model'
      });

      return {
        provider,
        apiKey,
        model
      };
    }

    case 'gemini': {
      const apiKey = astResolveConfigString({
        requestValue: auth.apiKey,
        authValue: auth.GEMINI_API_KEY,
        scriptProperties,
        scriptKey: 'GEMINI_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        scriptProperties,
        scriptKey: 'GEMINI_MODEL',
        required: true,
        field: 'model'
      });

      return {
        provider,
        apiKey,
        model
      };
    }

    case 'openrouter': {
      const apiKey = astResolveConfigString({
        requestValue: auth.apiKey,
        authValue: auth.OPENROUTER_API_KEY,
        scriptProperties,
        scriptKey: 'OPENROUTER_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        scriptProperties,
        scriptKey: 'OPENROUTER_MODEL',
        required: true,
        field: 'model'
      });

      const httpReferer = astResolveConfigString({
        requestValue: auth.httpReferer,
        authValue: auth.OPENROUTER_HTTP_REFERER,
        scriptProperties,
        scriptKey: 'OPENROUTER_HTTP_REFERER',
        required: false,
        field: 'httpReferer'
      });

      const xTitle = astResolveConfigString({
        requestValue: auth.xTitle,
        authValue: auth.OPENROUTER_X_TITLE,
        scriptProperties,
        scriptKey: 'OPENROUTER_X_TITLE',
        required: false,
        field: 'xTitle'
      });

      return {
        provider,
        apiKey,
        model,
        httpReferer,
        xTitle
      };
    }

    case 'perplexity': {
      const apiKey = astResolveConfigString({
        requestValue: auth.apiKey,
        authValue: auth.PERPLEXITY_API_KEY,
        scriptProperties,
        scriptKey: 'PERPLEXITY_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        scriptProperties,
        scriptKey: 'PERPLEXITY_MODEL',
        required: true,
        field: 'model'
      });

      return {
        provider,
        apiKey,
        model
      };
    }

    case 'vertex_gemini': {
      const projectId = astResolveConfigString({
        requestValue: auth.projectId,
        authValue: auth.VERTEX_PROJECT_ID,
        scriptProperties,
        scriptKey: 'VERTEX_PROJECT_ID',
        required: true,
        field: 'projectId'
      });

      const location = astResolveConfigString({
        requestValue: auth.location,
        authValue: auth.VERTEX_LOCATION,
        scriptProperties,
        scriptKey: 'VERTEX_LOCATION',
        required: true,
        field: 'location'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        scriptProperties,
        scriptKey: 'VERTEX_GEMINI_MODEL',
        required: true,
        field: 'model'
      });

      const oauthToken = astResolveVertexToken(auth);

      return {
        provider,
        projectId,
        location,
        model,
        oauthToken
      };
    }

    default:
      throw new AstAiValidationError('Unknown provider in resolveAiConfig', { provider });
  }
}
