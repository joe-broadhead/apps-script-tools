const AST_SECRETS_CONFIG_KEYS = Object.freeze([
  'AST_SECRETS_PROVIDER',
  'AST_SECRETS_REQUIRED',
  'AST_SECRETS_MAX_REFERENCE_DEPTH',
  'SECRET_MANAGER_PROJECT_ID',
  'AST_SECRETS_SECRET_MANAGER_PROJECT_ID'
]);

let AST_SECRETS_RUNTIME_CONFIG = {};

function astSecretsInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astSecretsNormalizeConfigValue(value) {
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

function astSecretsGetRuntimeConfig() {
  return astSecretsCloneObject(AST_SECRETS_RUNTIME_CONFIG);
}

function astSecretsSetRuntimeConfig(config = {}, options = {}) {
  if (!astSecretsIsPlainObject(config)) {
    throw new AstSecretsValidationError('Secrets runtime config must be an object');
  }

  if (!astSecretsIsPlainObject(options)) {
    throw new AstSecretsValidationError('Secrets runtime options must be an object');
  }

  const merge = options.merge !== false;
  let nextConfig;
  if (typeof astConfigMergeNormalizedConfig === 'function') {
    nextConfig = astConfigMergeNormalizedConfig(
      merge ? astSecretsGetRuntimeConfig() : {},
      config,
      { merge: true }
    );
  } else {
    nextConfig = merge ? astSecretsGetRuntimeConfig() : {};

    Object.keys(config).forEach(key => {
      const normalizedKey = astSecretsNormalizeString(key, '');
      if (!normalizedKey) {
        return;
      }

      const normalizedValue = astSecretsNormalizeConfigValue(config[key]);
      if (normalizedValue == null) {
        delete nextConfig[normalizedKey];
        return;
      }

      nextConfig[normalizedKey] = normalizedValue;
    });
  }

  AST_SECRETS_RUNTIME_CONFIG = nextConfig;
  astSecretsInvalidateScriptPropertiesSnapshotCache();
  return astSecretsGetRuntimeConfig();
}

function astSecretsClearRuntimeConfig() {
  AST_SECRETS_RUNTIME_CONFIG = {};
  astSecretsInvalidateScriptPropertiesSnapshotCache();
  return {};
}

function astSecretsGetScriptPropertiesSnapshot() {
  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized({
      keys: AST_SECRETS_CONFIG_KEYS
    });
  }

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
        if (astSecretsIsPlainObject(entries)) {
          Object.keys(entries).forEach(key => {
            const normalized = astSecretsNormalizeConfigValue(entries[key]);
            if (normalized != null) {
              output[key] = normalized;
            }
          });
        }
      }

      if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
        AST_SECRETS_CONFIG_KEYS.forEach(key => {
          if (output[key]) {
            return;
          }

          const normalized = astSecretsNormalizeConfigValue(scriptProperties.getProperty(key));
          if (normalized != null) {
            output[key] = normalized;
          }
        });
      }
    }
  } catch (_error) {
    // Intentionally swallow script properties access errors.
  }

  return output;
}

function astSecretsResolveFirstString(candidates = [], fallback = null) {
  if (typeof astConfigResolveFirstString === 'function') {
    return astConfigResolveFirstString(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astSecretsNormalizeConfigValue(candidates[idx]);
    if (normalized != null) {
      return normalized;
    }
  }

  return fallback;
}

function astSecretsResolveFirstBoolean(candidates = [], fallback = false) {
  if (typeof astConfigResolveFirstBoolean === 'function') {
    return astConfigResolveFirstBoolean(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    if (typeof candidates[idx] === 'boolean') {
      return candidates[idx];
    }
  }

  return fallback;
}

function astSecretsResolveFirstInteger(candidates = [], options = {}) {
  if (typeof astConfigResolveFirstInteger === 'function') {
    return astConfigResolveFirstInteger(candidates, options);
  }

  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback')
    ? options.fallback
    : null;
  const min = Number.isInteger(options.min) ? options.min : 1;
  const max = Number.isInteger(options.max) ? options.max : null;

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const numeric = Number(candidates[idx]);
    if (!Number.isInteger(numeric)) {
      continue;
    }
    if (numeric < min) {
      continue;
    }
    if (max != null && numeric > max) {
      continue;
    }
    return numeric;
  }

  return fallback;
}

function astSecretsResolveConfig(request = {}) {
  const normalizedRequest = astSecretsIsPlainObject(request) ? request : {};
  const runtimeConfig = astSecretsGetRuntimeConfig();
  const scriptConfig = astSecretsGetScriptPropertiesSnapshot();
  const auth = astSecretsIsPlainObject(normalizedRequest.auth)
    ? normalizedRequest.auth
    : {};

  const defaultProvider = astSecretsNormalizeProvider(astSecretsResolveFirstString([
    normalizedRequest.provider,
    runtimeConfig.AST_SECRETS_PROVIDER,
    runtimeConfig.provider,
    scriptConfig.AST_SECRETS_PROVIDER
  ], 'script_properties'), 'script_properties');

  const required = astSecretsResolveFirstBoolean([
    normalizedRequest.options && normalizedRequest.options.required,
    runtimeConfig.AST_SECRETS_REQUIRED,
    runtimeConfig.required,
    scriptConfig.AST_SECRETS_REQUIRED
  ], true);

  const maxReferenceDepth = astSecretsResolveFirstInteger([
    normalizedRequest.options && normalizedRequest.options.maxReferenceDepth,
    runtimeConfig.AST_SECRETS_MAX_REFERENCE_DEPTH,
    runtimeConfig.maxReferenceDepth,
    scriptConfig.AST_SECRETS_MAX_REFERENCE_DEPTH
  ], {
    fallback: 3,
    min: 1,
    max: 20
  });

  const projectId = astSecretsResolveFirstString([
    normalizedRequest.projectId,
    auth.projectId,
    auth.SECRET_MANAGER_PROJECT_ID,
    runtimeConfig.SECRET_MANAGER_PROJECT_ID,
    runtimeConfig.AST_SECRETS_SECRET_MANAGER_PROJECT_ID,
    runtimeConfig.projectId,
    scriptConfig.SECRET_MANAGER_PROJECT_ID,
    scriptConfig.AST_SECRETS_SECRET_MANAGER_PROJECT_ID
  ], null);

  return {
    defaultProvider,
    required,
    maxReferenceDepth,
    projectId,
    runtimeConfig,
    scriptConfig
  };
}
