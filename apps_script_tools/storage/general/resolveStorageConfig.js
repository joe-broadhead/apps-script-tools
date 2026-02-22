const AST_STORAGE_CONFIG_KEYS = Object.freeze([
  'GCS_SERVICE_ACCOUNT_JSON',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_SESSION_TOKEN',
  'S3_REGION',
  'S3_ENDPOINT',
  'DATABRICKS_HOST',
  'DATABRICKS_TOKEN'
]);

let AST_STORAGE_RUNTIME_CONFIG = {};

function astStorageNormalizeConfigValue(value) {
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

function astStorageGetRuntimeConfig() {
  return astStorageCloneObject(AST_STORAGE_RUNTIME_CONFIG);
}

function astStorageSetRuntimeConfig(config = {}, options = {}) {
  if (!astStorageIsPlainObject(config)) {
    throw new AstStorageValidationError('Storage runtime config must be an object');
  }

  if (!astStorageIsPlainObject(options)) {
    throw new AstStorageValidationError('Storage runtime config options must be an object');
  }

  const merge = options.merge !== false;
  const next = merge ? astStorageGetRuntimeConfig() : {};

  Object.keys(config).forEach(key => {
    const normalizedKey = astStorageNormalizeString(key, '');
    if (!normalizedKey) {
      return;
    }

    const normalizedValue = astStorageNormalizeConfigValue(config[key]);
    if (normalizedValue == null) {
      delete next[normalizedKey];
      return;
    }

    next[normalizedKey] = normalizedValue;
  });

  AST_STORAGE_RUNTIME_CONFIG = next;
  return astStorageGetRuntimeConfig();
}

function astStorageClearRuntimeConfig() {
  AST_STORAGE_RUNTIME_CONFIG = {};
  return {};
}

function astStorageGetScriptPropertiesSnapshot() {
  const output = {};

  try {
    if (
      typeof PropertiesService !== 'undefined' &&
      PropertiesService &&
      typeof PropertiesService.getScriptProperties === 'function'
    ) {
      const scriptProperties = PropertiesService.getScriptProperties();

      if (scriptProperties && typeof scriptProperties.getProperties === 'function') {
        const entries = scriptProperties.getProperties();
        if (astStorageIsPlainObject(entries)) {
          Object.keys(entries).forEach(key => {
            const normalized = astStorageNormalizeConfigValue(entries[key]);
            if (normalized != null) {
              output[key] = normalized;
            }
          });
        }
      }

      if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
        AST_STORAGE_CONFIG_KEYS.forEach(key => {
          if (output[key]) {
            return;
          }

          const normalized = astStorageNormalizeConfigValue(scriptProperties.getProperty(key));
          if (normalized != null) {
            output[key] = normalized;
          }
        });
      }
    }
  } catch (error) {
    // Ignore script property access issues.
  }

  return output;
}

function astStorageResolveConfigString({
  requestValue,
  authValue,
  runtimeConfig,
  scriptConfig,
  scriptKey,
  field,
  required = false
}) {
  const candidates = [
    requestValue,
    authValue,
    runtimeConfig[scriptKey],
    scriptConfig[scriptKey]
  ];

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astStorageNormalizeConfigValue(candidates[idx]);
    if (normalized) {
      return normalized;
    }
  }

  if (required) {
    throw new AstStorageAuthError(`Missing required storage configuration field '${field}'`, {
      field,
      scriptKey
    });
  }

  return null;
}

function astStorageResolveProviderAuth(auth = {}, provider) {
  if (!astStorageIsPlainObject(auth)) {
    return {};
  }

  const nested = auth[provider];
  if (astStorageIsPlainObject(nested)) {
    return nested;
  }

  return auth;
}

function astStorageResolveOAuthToken(providerAuth = {}) {
  const explicitToken = astStorageNormalizeConfigValue(providerAuth.oauthToken || providerAuth.accessToken);
  if (explicitToken) {
    return explicitToken;
  }

  try {
    if (
      typeof ScriptApp !== 'undefined' &&
      ScriptApp &&
      typeof ScriptApp.getOAuthToken === 'function'
    ) {
      const token = astStorageNormalizeConfigValue(ScriptApp.getOAuthToken());
      if (token) {
        return token;
      }
    }
  } catch (error) {
    throw new AstStorageAuthError('Unable to resolve Apps Script OAuth token', {}, error);
  }

  return null;
}

function astStorageNormalizeDatabricksHost(host) {
  const normalized = astStorageNormalizeString(host, '');

  if (!normalized) {
    return '';
  }

  const withoutProtocol = normalized
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  return withoutProtocol;
}

function resolveStorageConfig(request) {
  if (!astStorageIsPlainObject(request)) {
    throw new AstStorageValidationError('resolveStorageConfig expected a normalized storage request object');
  }

  const runtimeConfig = astStorageGetRuntimeConfig();
  const scriptConfig = astStorageGetScriptPropertiesSnapshot();
  const provider = request.provider;
  const providerAuth = astStorageResolveProviderAuth(request.auth || {}, provider);

  if (provider === 'gcs') {
    const authModeRaw = astStorageNormalizeString(
      providerAuth.authMode || providerAuth.mode,
      'auto'
    ).toLowerCase();

    const authMode = ['auto', 'oauth', 'service_account'].includes(authModeRaw)
      ? authModeRaw
      : 'auto';

    const oauthToken = astStorageResolveOAuthToken(providerAuth);
    const serviceAccountJson = astStorageResolveConfigString({
      requestValue: providerAuth.serviceAccountJson,
      authValue: providerAuth.GCS_SERVICE_ACCOUNT_JSON,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'GCS_SERVICE_ACCOUNT_JSON',
      field: 'serviceAccountJson',
      required: false
    });

    if (authMode === 'oauth' && !oauthToken) {
      throw new AstStorageAuthError('Missing OAuth token for GCS provider', {
        provider
      });
    }

    if (authMode === 'service_account' && !serviceAccountJson) {
      throw new AstStorageAuthError('Missing service account JSON for GCS provider', {
        provider,
        field: 'serviceAccountJson'
      });
    }

    if (authMode === 'auto' && !oauthToken && !serviceAccountJson) {
      throw new AstStorageAuthError('GCS provider requires OAuth token or service account JSON', {
        provider
      });
    }

    return {
      provider,
      authMode,
      oauthToken,
      serviceAccountJson
    };
  }

  if (provider === 's3') {
    const accessKeyId = astStorageResolveConfigString({
      requestValue: providerAuth.accessKeyId,
      authValue: providerAuth.S3_ACCESS_KEY_ID,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'S3_ACCESS_KEY_ID',
      field: 'accessKeyId',
      required: true
    });

    const secretAccessKey = astStorageResolveConfigString({
      requestValue: providerAuth.secretAccessKey,
      authValue: providerAuth.S3_SECRET_ACCESS_KEY,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'S3_SECRET_ACCESS_KEY',
      field: 'secretAccessKey',
      required: true
    });

    const sessionToken = astStorageResolveConfigString({
      requestValue: providerAuth.sessionToken,
      authValue: providerAuth.S3_SESSION_TOKEN,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'S3_SESSION_TOKEN',
      field: 'sessionToken',
      required: false
    });

    const region = astStorageResolveConfigString({
      requestValue: providerAuth.region,
      authValue: providerAuth.S3_REGION,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'S3_REGION',
      field: 'region',
      required: true
    });

    const endpoint = astStorageResolveConfigString({
      requestValue: providerAuth.endpoint,
      authValue: providerAuth.S3_ENDPOINT,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'S3_ENDPOINT',
      field: 'endpoint',
      required: false
    });

    return {
      provider,
      accessKeyId,
      secretAccessKey,
      sessionToken,
      region,
      endpoint
    };
  }

  if (provider === 'dbfs') {
    const host = astStorageNormalizeDatabricksHost(astStorageResolveConfigString({
      requestValue: providerAuth.host,
      authValue: providerAuth.DATABRICKS_HOST,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'DATABRICKS_HOST',
      field: 'host',
      required: true
    }));

    const token = astStorageResolveConfigString({
      requestValue: providerAuth.token,
      authValue: providerAuth.DATABRICKS_TOKEN,
      runtimeConfig,
      scriptConfig,
      scriptKey: 'DATABRICKS_TOKEN',
      field: 'token',
      required: true
    });

    const rootPath = astStorageNormalizeString(providerAuth.rootPath, '');

    return {
      provider,
      host,
      token,
      rootPath
    };
  }

  throw new AstStorageValidationError('Unknown storage provider in resolveStorageConfig', {
    provider
  });
}
