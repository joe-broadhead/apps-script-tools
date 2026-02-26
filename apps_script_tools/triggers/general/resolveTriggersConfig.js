const AST_TRIGGERS_CONFIG_KEYS = Object.freeze([
  'AST_TRIGGERS_PROPERTY_PREFIX',
  'AST_TRIGGERS_DISPATCH_HANDLER',
  'AST_TRIGGERS_DEFAULT_TIMEZONE',
  'AST_TRIGGERS_DEFAULT_DISPATCH_MODE',
  'AST_TRIGGERS_JOBS_AUTO_RESUME'
]);

const AST_TRIGGERS_DEFAULT_CONFIG = Object.freeze({
  propertyPrefix: 'AST_TRIGGERS_DEF_',
  dispatchHandler: 'astTriggersDispatch',
  defaultTimeZone: null,
  defaultDispatchMode: 'direct',
  jobsAutoResume: false
});

let AST_TRIGGERS_RUNTIME_CONFIG = {};

function astTriggersInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astTriggersNormalizeConfigValue(value) {
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

function astTriggersGetRuntimeConfig() {
  return astTriggersCloneObject(AST_TRIGGERS_RUNTIME_CONFIG);
}

function astTriggersSetRuntimeConfig(config = {}, options = {}) {
  if (!astTriggersIsPlainObject(config)) {
    throw new AstTriggersValidationError('Triggers runtime config must be an object');
  }

  if (!astTriggersIsPlainObject(options)) {
    throw new AstTriggersValidationError('Triggers runtime options must be an object');
  }

  const merge = options.merge !== false;
  let nextConfig;

  if (typeof astConfigMergeNormalizedConfig === 'function') {
    nextConfig = astConfigMergeNormalizedConfig(
      merge ? astTriggersGetRuntimeConfig() : {},
      config,
      { merge: true }
    );
  } else {
    nextConfig = merge ? astTriggersGetRuntimeConfig() : {};
    Object.keys(config).forEach(key => {
      const normalizedKey = astTriggersNormalizeString(key, '');
      if (!normalizedKey) {
        return;
      }

      const normalizedValue = astTriggersNormalizeConfigValue(config[key]);
      if (normalizedValue == null) {
        delete nextConfig[normalizedKey];
        return;
      }

      nextConfig[normalizedKey] = normalizedValue;
    });
  }

  AST_TRIGGERS_RUNTIME_CONFIG = nextConfig;
  astTriggersInvalidateScriptPropertiesSnapshotCache();
  return astTriggersGetRuntimeConfig();
}

function astTriggersClearRuntimeConfig() {
  AST_TRIGGERS_RUNTIME_CONFIG = {};
  astTriggersInvalidateScriptPropertiesSnapshotCache();
  return {};
}

function astTriggersGetScriptPropertiesSnapshot() {
  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized({
      keys: AST_TRIGGERS_CONFIG_KEYS
    });
  }

  const output = {};
  try {
    if (
      typeof PropertiesService !== 'undefined'
      && PropertiesService
      && typeof PropertiesService.getScriptProperties === 'function'
    ) {
      const scriptProperties = PropertiesService.getScriptProperties();

      if (scriptProperties && typeof scriptProperties.getProperties === 'function') {
        const entries = scriptProperties.getProperties();
        if (astTriggersIsPlainObject(entries)) {
          Object.keys(entries).forEach(key => {
            const normalized = astTriggersNormalizeConfigValue(entries[key]);
            if (normalized != null) {
              output[key] = normalized;
            }
          });
        }
      }

      if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
        AST_TRIGGERS_CONFIG_KEYS.forEach(key => {
          if (output[key]) {
            return;
          }
          const normalized = astTriggersNormalizeConfigValue(scriptProperties.getProperty(key));
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

function astTriggersResolveFirstString(candidates = [], fallback = null) {
  if (typeof astConfigResolveFirstString === 'function') {
    return astConfigResolveFirstString(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astTriggersNormalizeConfigValue(candidates[idx]);
    if (normalized != null) {
      return normalized;
    }
  }

  return fallback;
}

function astTriggersResolveFirstBoolean(candidates = [], fallback = false) {
  if (typeof astConfigResolveFirstBoolean === 'function') {
    return astConfigResolveFirstBoolean(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    if (typeof candidates[idx] === 'boolean') {
      return candidates[idx];
    }

    const parsed = astTriggersNormalizeBoolean(candidates[idx], null);
    if (typeof parsed === 'boolean') {
      return parsed;
    }
  }

  return fallback;
}

function astTriggersResolveConfig(request = {}) {
  const normalizedRequest = astTriggersIsPlainObject(request) ? request : {};
  const runtimeConfig = astTriggersGetRuntimeConfig();
  const scriptConfig = astTriggersGetScriptPropertiesSnapshot();

  const propertyPrefix = astTriggersResolveFirstString([
    normalizedRequest.propertyPrefix,
    runtimeConfig.AST_TRIGGERS_PROPERTY_PREFIX,
    runtimeConfig.propertyPrefix,
    scriptConfig.AST_TRIGGERS_PROPERTY_PREFIX
  ], AST_TRIGGERS_DEFAULT_CONFIG.propertyPrefix);

  const dispatchHandler = astTriggersResolveFirstString([
    normalizedRequest.dispatchHandler,
    runtimeConfig.AST_TRIGGERS_DISPATCH_HANDLER,
    runtimeConfig.dispatchHandler,
    scriptConfig.AST_TRIGGERS_DISPATCH_HANDLER
  ], AST_TRIGGERS_DEFAULT_CONFIG.dispatchHandler);

  const defaultTimeZone = astTriggersResolveFirstString([
    normalizedRequest.defaultTimeZone,
    runtimeConfig.AST_TRIGGERS_DEFAULT_TIMEZONE,
    runtimeConfig.defaultTimeZone,
    scriptConfig.AST_TRIGGERS_DEFAULT_TIMEZONE
  ], AST_TRIGGERS_DEFAULT_CONFIG.defaultTimeZone);

  const defaultDispatchMode = astTriggersResolveFirstString([
    normalizedRequest.defaultDispatchMode,
    runtimeConfig.AST_TRIGGERS_DEFAULT_DISPATCH_MODE,
    runtimeConfig.defaultDispatchMode,
    scriptConfig.AST_TRIGGERS_DEFAULT_DISPATCH_MODE
  ], AST_TRIGGERS_DEFAULT_CONFIG.defaultDispatchMode);

  const jobsAutoResume = astTriggersResolveFirstBoolean([
    normalizedRequest.jobsAutoResume,
    runtimeConfig.AST_TRIGGERS_JOBS_AUTO_RESUME,
    runtimeConfig.jobsAutoResume,
    scriptConfig.AST_TRIGGERS_JOBS_AUTO_RESUME
  ], AST_TRIGGERS_DEFAULT_CONFIG.jobsAutoResume);

  return {
    propertyPrefix,
    dispatchHandler,
    defaultTimeZone,
    defaultDispatchMode,
    jobsAutoResume,
    runtimeConfig,
    scriptConfig
  };
}
