const AST_AI_CONFIG_KEYS = Object.freeze([
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'OPENROUTER_HTTP_REFERER',
  'OPENROUTER_X_TITLE',
  'PERPLEXITY_API_KEY',
  'PERPLEXITY_MODEL',
  'VERTEX_PROJECT_ID',
  'VERTEX_LOCATION',
  'VERTEX_GEMINI_MODEL',
  'VERTEX_SERVICE_ACCOUNT_JSON',
  'VERTEX_AUTH_MODE'
]);

let AST_AI_RUNTIME_CONFIG = {};

function astAiInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astAiConfigIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astCloneObject(value) {
  return Object.assign({}, value || {});
}

function astNormalizeConfigValue(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function astGetAiRuntimeConfig() {
  return astCloneObject(AST_AI_RUNTIME_CONFIG);
}

function astSetAiRuntimeConfig(config = {}, options = {}) {
  if (!astAiConfigIsPlainObject(config)) {
    throw new AstAiValidationError('AI runtime config must be an object');
  }

  if (!astAiConfigIsPlainObject(options)) {
    throw new AstAiValidationError('AI runtime config options must be an object');
  }

  const merge = options.merge !== false;
  const nextConfig = merge ? astGetAiRuntimeConfig() : {};

  Object.keys(config).forEach(key => {
    const normalizedKey = String(key || '').trim();

    if (!normalizedKey) {
      return;
    }

    const normalizedValue = astNormalizeConfigValue(config[key]);

    if (normalizedValue == null) {
      delete nextConfig[normalizedKey];
      return;
    }

    nextConfig[normalizedKey] = normalizedValue;
  });

  AST_AI_RUNTIME_CONFIG = nextConfig;
  astAiInvalidateScriptPropertiesSnapshotCache();
  return astGetAiRuntimeConfig();
}

function astClearAiRuntimeConfig() {
  AST_AI_RUNTIME_CONFIG = {};
  astAiInvalidateScriptPropertiesSnapshotCache();
  return {};
}

function astGetScriptPropertiesByKey(scriptProperties) {
  const output = {};

  if (!scriptProperties || typeof scriptProperties !== 'object') {
    return output;
  }

  if (typeof scriptProperties.getProperties === 'function') {
    const map = scriptProperties.getProperties();
    if (astAiConfigIsPlainObject(map)) {
      Object.keys(map).forEach(key => {
        const normalizedValue = astNormalizeConfigValue(map[key]);
        if (normalizedValue != null) {
          output[key] = normalizedValue;
        }
      });
    }
  }

  if (typeof scriptProperties.getProperty === 'function') {
    AST_AI_CONFIG_KEYS.forEach(key => {
      if (output[key]) {
        return;
      }

      const normalizedValue = astNormalizeConfigValue(scriptProperties.getProperty(key));
      if (normalizedValue != null) {
        output[key] = normalizedValue;
      }
    });
  }

  return output;
}

function astGetScriptPropertiesSnapshot(options = {}) {
  const forceRefresh = Boolean(options && options.forceRefresh);

  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized({
      keys: AST_AI_CONFIG_KEYS,
      forceRefresh
    });
  }

  try {
    if (
      typeof PropertiesService !== 'undefined' &&
      PropertiesService &&
      typeof PropertiesService.getScriptProperties === 'function'
    ) {
      const scriptProperties = PropertiesService.getScriptProperties();
      return astGetScriptPropertiesByKey(scriptProperties);
    }
  } catch (error) {
    // Intentionally swallow property access failures.
  }

  return {};
}

function astResolveConfigString({
  requestValue,
  authValue,
  runtimeConfig = {},
  scriptProperties,
  scriptKey,
  required,
  field
}) {
  const candidates = [
    requestValue,
    authValue,
    runtimeConfig[scriptKey],
    scriptProperties[scriptKey]
  ];

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

function resolveAiConfig(request) {
  if (!request || typeof request !== 'object') {
    throw new AstAiValidationError('resolveAiConfig expected a normalized AI request object');
  }

  const auth = request.auth || {};
  const provider = request.provider;
  const scriptProperties = astGetScriptPropertiesSnapshot({
    forceRefresh: provider === 'vertex_gemini'
  });
  const runtimeConfig = astGetAiRuntimeConfig();

  switch (provider) {
    case 'openai': {
      const apiKey = astResolveConfigString({
        requestValue: auth.apiKey,
        authValue: auth.OPENAI_API_KEY,
        runtimeConfig,
        scriptProperties,
        scriptKey: 'OPENAI_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        runtimeConfig,
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
        runtimeConfig,
        scriptProperties,
        scriptKey: 'GEMINI_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        runtimeConfig,
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
        runtimeConfig,
        scriptProperties,
        scriptKey: 'OPENROUTER_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        runtimeConfig,
        scriptProperties,
        scriptKey: 'OPENROUTER_MODEL',
        required: true,
        field: 'model'
      });

      const httpReferer = astResolveConfigString({
        requestValue: auth.httpReferer,
        authValue: auth.OPENROUTER_HTTP_REFERER,
        runtimeConfig,
        scriptProperties,
        scriptKey: 'OPENROUTER_HTTP_REFERER',
        required: false,
        field: 'httpReferer'
      });

      const xTitle = astResolveConfigString({
        requestValue: auth.xTitle,
        authValue: auth.OPENROUTER_X_TITLE,
        runtimeConfig,
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
        runtimeConfig,
        scriptProperties,
        scriptKey: 'PERPLEXITY_API_KEY',
        required: true,
        field: 'apiKey'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        runtimeConfig,
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
        runtimeConfig,
        scriptProperties,
        scriptKey: 'VERTEX_PROJECT_ID',
        required: true,
        field: 'projectId'
      });

      const location = astResolveConfigString({
        requestValue: auth.location,
        authValue: auth.VERTEX_LOCATION,
        runtimeConfig,
        scriptProperties,
        scriptKey: 'VERTEX_LOCATION',
        required: true,
        field: 'location'
      });

      const model = astResolveConfigString({
        requestValue: request.model,
        authValue: auth.model,
        runtimeConfig,
        scriptProperties,
        scriptKey: 'VERTEX_GEMINI_MODEL',
        required: true,
        field: 'model'
      });

      const resolvedToken = astAiResolveVertexAccessToken(auth, runtimeConfig, scriptProperties);

      return {
        provider,
        projectId,
        location,
        model,
        oauthToken: resolvedToken.oauthToken,
        authMode: resolvedToken.authMode
      };
    }

    default:
      throw new AstAiValidationError('Unknown provider in resolveAiConfig', { provider });
  }
}
