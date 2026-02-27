const AST_RUNTIME_MODULE_DEFINITIONS = Object.freeze([
  { name: 'AI', globalName: 'AST_AI' },
  { name: 'RAG', globalName: 'AST_RAG' },
  { name: 'DBT', globalName: 'AST_DBT' },
  { name: 'Cache', globalName: 'AST_CACHE' },
  { name: 'Storage', globalName: 'AST_STORAGE' },
  { name: 'Secrets', globalName: 'AST_SECRETS' },
  { name: 'Telemetry', globalName: 'AST_TELEMETRY' },
  { name: 'Jobs', globalName: 'AST_JOBS' },
  { name: 'Triggers', globalName: 'AST_TRIGGERS' },
  { name: 'GitHub', globalName: 'AST_GITHUB' }
]);

const AST_RUNTIME_MODULE_ALIAS_MAP = Object.freeze({
  AI: 'AI',
  ASTAI: 'AI',
  RAG: 'RAG',
  ASTRAG: 'RAG',
  DBT: 'DBT',
  ASTDBT: 'DBT',
  CACHE: 'Cache',
  ASTCACHE: 'Cache',
  STORAGE: 'Storage',
  ASTSTORAGE: 'Storage',
  SECRETS: 'Secrets',
  ASTSECRETS: 'Secrets',
  TELEMETRY: 'Telemetry',
  ASTTELEMETRY: 'Telemetry',
  JOBS: 'Jobs',
  ASTJOBS: 'Jobs',
  TRIGGERS: 'Triggers',
  ASTTRIGGERS: 'Triggers',
  GITHUB: 'GitHub',
  ASTGITHUB: 'GitHub'
});

function astRuntimeIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astRuntimeNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astRuntimeNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function astRuntimeNormalizeConfigValue(value, includeEmpty = false) {
  if (value == null) {
    return includeEmpty ? '' : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }

    return includeEmpty ? '' : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function astRuntimeNormalizeKeys(keys) {
  if (!Array.isArray(keys)) {
    return null;
  }

  const output = [];
  const seen = {};

  for (let idx = 0; idx < keys.length; idx += 1) {
    const normalized = astRuntimeNormalizeString(keys[idx], '');
    if (!normalized || seen[normalized]) {
      continue;
    }

    seen[normalized] = true;
    output.push(normalized);
  }

  return output;
}

function astRuntimeReadPropertiesMap(options = {}) {
  const includeEmpty = astRuntimeNormalizeBoolean(options.includeEmpty, false);
  const requestedKeys = astRuntimeNormalizeKeys(options.keys);
  const prefix = astRuntimeNormalizeString(options.prefix, '');
  const stripPrefix = astRuntimeNormalizeBoolean(options.stripPrefix, false);
  const output = {};
  let sourceMap = {};
  const hasRequestedKeys = Array.isArray(requestedKeys);

  if (astRuntimeIsPlainObject(options.properties)) {
    sourceMap = options.properties;
  } else if (
    astRuntimeIsPlainObject(options.scriptProperties)
    && typeof options.scriptProperties.getProperties !== 'function'
    && typeof options.scriptProperties.getProperty !== 'function'
  ) {
    sourceMap = options.scriptProperties;
  } else {
    const scriptProperties = astRuntimeResolveScriptPropertiesHandle(options.scriptProperties);
    sourceMap = astRuntimeReadScriptPropertiesMap(scriptProperties, requestedKeys);
  }

  const keys = hasRequestedKeys
    ? requestedKeys
    : Object.keys(sourceMap || {}).sort();

  for (let idx = 0; idx < keys.length; idx += 1) {
    const sourceKey = astRuntimeNormalizeString(keys[idx], '');
    if (!sourceKey || !Object.prototype.hasOwnProperty.call(sourceMap, sourceKey)) {
      continue;
    }

    if (prefix && !sourceKey.startsWith(prefix)) {
      continue;
    }

    const nextKey = stripPrefix && prefix
      ? sourceKey.slice(prefix.length)
      : sourceKey;

    const normalizedKey = astRuntimeNormalizeString(nextKey, '');
    if (!normalizedKey) {
      continue;
    }

    const normalizedValue = astRuntimeNormalizeConfigValue(sourceMap[sourceKey], includeEmpty);
    if (normalizedValue == null) {
      continue;
    }

    output[normalizedKey] = normalizedValue;
  }

  return output;
}

function astRuntimeResolveScriptPropertiesHandle(scriptProperties) {
  if (
    scriptProperties
    && (
      typeof scriptProperties.getProperties === 'function'
      || typeof scriptProperties.getProperty === 'function'
    )
  ) {
    return scriptProperties;
  }

  try {
    if (
      typeof PropertiesService !== 'undefined'
      && PropertiesService
      && typeof PropertiesService.getScriptProperties === 'function'
    ) {
      return PropertiesService.getScriptProperties();
    }
  } catch (_error) {
    // Ignore script property resolution errors.
  }

  return null;
}

function astRuntimeReadScriptPropertiesMap(scriptProperties, requestedKeys = null) {
  if (!scriptProperties) {
    return {};
  }

  const output = {};
  const hasRequestedKeys = Array.isArray(requestedKeys);

  if (typeof scriptProperties.getProperties === 'function') {
    const entries = scriptProperties.getProperties();
    if (astRuntimeIsPlainObject(entries)) {
      const keys = hasRequestedKeys ? requestedKeys : Object.keys(entries);

      for (let idx = 0; idx < keys.length; idx += 1) {
        const key = keys[idx];
        if (Object.prototype.hasOwnProperty.call(entries, key)) {
          output[key] = entries[key];
        }
      }
    }
  }

  if (hasRequestedKeys && typeof scriptProperties.getProperty === 'function') {
    for (let idx = 0; idx < requestedKeys.length; idx += 1) {
      const key = requestedKeys[idx];
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        continue;
      }

      const value = scriptProperties.getProperty(key);
      if (typeof value !== 'undefined') {
        output[key] = value;
      }
    }
  }

  return output;
}

function astRuntimeResolveConfigReader() {
  const root = typeof globalThis !== 'undefined' ? globalThis : this;

  if (typeof astConfigFromScriptProperties === 'function') {
    return astConfigFromScriptProperties;
  }

  if (root && root.AST_CONFIG && typeof root.AST_CONFIG.fromScriptProperties === 'function') {
    return root.AST_CONFIG.fromScriptProperties;
  }

  return astRuntimeReadPropertiesMap;
}

function astRuntimeResolveProperties(options = {}) {
  const reader = astRuntimeResolveConfigReader();
  const rawProperties = reader({
    properties: options.properties,
    scriptProperties: options.scriptProperties,
    keys: options.keys,
    prefix: options.prefix,
    stripPrefix: options.stripPrefix,
    includeEmpty: options.includeEmpty
  });

  if (!astRuntimeIsPlainObject(rawProperties)) {
    return {};
  }

  const includeEmpty = astRuntimeNormalizeBoolean(options.includeEmpty, false);
  const output = {};

  Object.keys(rawProperties).forEach(key => {
    const normalizedKey = astRuntimeNormalizeString(key, '');
    if (!normalizedKey) {
      return;
    }

    const normalizedValue = astRuntimeNormalizeConfigValue(rawProperties[key], includeEmpty);
    if (normalizedValue == null) {
      return;
    }

    output[normalizedKey] = normalizedValue;
  });

  return output;
}

function astRuntimeListModules() {
  return AST_RUNTIME_MODULE_DEFINITIONS.map(definition => definition.name);
}

function astRuntimeResolveModuleName(moduleName) {
  const normalized = astRuntimeNormalizeString(moduleName, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  return AST_RUNTIME_MODULE_ALIAS_MAP[normalized] || null;
}

function astRuntimeResolveRequestedModules(modules) {
  if (typeof modules === 'undefined' || modules == null) {
    return astRuntimeListModules();
  }

  const requested = Array.isArray(modules) ? modules : [modules];
  const output = [];
  const seen = {};

  for (let idx = 0; idx < requested.length; idx += 1) {
    const resolvedName = astRuntimeResolveModuleName(requested[idx]);
    if (!resolvedName) {
      throw new Error(`AST.Runtime.configureFromProps received unsupported module '${requested[idx]}'`);
    }

    if (seen[resolvedName]) {
      continue;
    }

    seen[resolvedName] = true;
    output.push(resolvedName);
  }

  return output;
}

function astRuntimeResolveModuleApi(moduleName) {
  const root = typeof globalThis !== 'undefined' ? globalThis : this;
  const definition = AST_RUNTIME_MODULE_DEFINITIONS.find(entry => entry.name === moduleName);
  if (!definition) {
    return null;
  }

  const fromGlobal = root ? root[definition.globalName] : null;
  if (fromGlobal && typeof fromGlobal.configure === 'function') {
    return fromGlobal;
  }

  const astNamespace = root && root.AST ? root.AST : null;
  if (astNamespace && astNamespace[moduleName] && typeof astNamespace[moduleName].configure === 'function') {
    return astNamespace[moduleName];
  }

  return null;
}

function astRuntimeNormalizeError(error) {
  if (error && typeof error === 'object') {
    return {
      name: astRuntimeNormalizeString(error.name, 'Error'),
      message: astRuntimeNormalizeString(error.message, 'Unknown runtime configure error')
    };
  }

  return {
    name: 'Error',
    message: String(error)
  };
}

function astRuntimeConfigureFromProps(options = {}) {
  if (!astRuntimeIsPlainObject(options)) {
    throw new Error('AST.Runtime.configureFromProps options must be an object');
  }

  const properties = astRuntimeResolveProperties(options);
  const requestedModules = astRuntimeResolveRequestedModules(options.modules);
  const merge = astRuntimeNormalizeBoolean(options.merge, true);
  const clearBeforeConfigure = astRuntimeNormalizeBoolean(options.clearBeforeConfigure, false);
  const throwOnError = options.throwOnError !== false;
  const summary = {
    propertyCount: Object.keys(properties).length,
    modulesRequested: requestedModules.slice(),
    configuredModules: [],
    skippedModules: [],
    failedModules: [],
    moduleResults: {}
  };

  for (let idx = 0; idx < requestedModules.length; idx += 1) {
    const moduleName = requestedModules[idx];
    const moduleApi = astRuntimeResolveModuleApi(moduleName);

    if (!moduleApi) {
      const skipped = {
        module: moduleName,
        reason: 'module_unavailable'
      };
      summary.skippedModules.push(skipped);
      summary.moduleResults[moduleName] = {
        status: 'skipped',
        reason: skipped.reason
      };
      continue;
    }

    try {
      const cleared = clearBeforeConfigure && typeof moduleApi.clearConfig === 'function';
      if (cleared) {
        moduleApi.clearConfig();
      }

      moduleApi.configure(properties, { merge });
      summary.configuredModules.push(moduleName);
      summary.moduleResults[moduleName] = {
        status: 'configured',
        merge,
        cleared,
        propertyCount: summary.propertyCount
      };
    } catch (error) {
      const normalizedError = astRuntimeNormalizeError(error);
      const failed = {
        module: moduleName,
        error: normalizedError
      };

      summary.failedModules.push(failed);
      summary.moduleResults[moduleName] = {
        status: 'error',
        error: normalizedError
      };

      if (throwOnError) {
        const runtimeError = new Error(
          `AST.Runtime.configureFromProps failed for module '${moduleName}': ${normalizedError.message}`
        );
        runtimeError.name = 'AstRuntimeError';
        runtimeError.details = {
          module: moduleName,
          configuredModules: summary.configuredModules.slice(),
          failedModules: summary.failedModules.slice()
        };
        runtimeError.cause = error;
        throw runtimeError;
      }
    }
  }

  return summary;
}

const AST_RUNTIME = Object.freeze({
  configureFromProps: astRuntimeConfigureFromProps,
  modules: astRuntimeListModules
});

const __astRuntimeRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astRuntimeRoot.astRuntimeConfigureFromProps = astRuntimeConfigureFromProps;
__astRuntimeRoot.astRuntimeListModules = astRuntimeListModules;
__astRuntimeRoot.AST_RUNTIME = AST_RUNTIME;
this.astRuntimeConfigureFromProps = astRuntimeConfigureFromProps;
this.astRuntimeListModules = astRuntimeListModules;
this.AST_RUNTIME = AST_RUNTIME;
