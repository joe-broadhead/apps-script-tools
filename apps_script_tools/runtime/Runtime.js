const AST_RUNTIME_MODULE_DEFINITIONS = Object.freeze([
  { name: 'Http', globalName: 'AST_HTTP' },
  { name: 'AI', globalName: 'AST_AI' },
  { name: 'RAG', globalName: 'AST_RAG' },
  { name: 'DBT', globalName: 'AST_DBT' },
  { name: 'Cache', globalName: 'AST_CACHE' },
  { name: 'Storage', globalName: 'AST_STORAGE' },
  { name: 'Secrets', globalName: 'AST_SECRETS' },
  { name: 'Telemetry', globalName: 'AST_TELEMETRY' },
  { name: 'Jobs', globalName: 'AST_JOBS' },
  { name: 'Triggers', globalName: 'AST_TRIGGERS' },
  { name: 'Messaging', globalName: 'AST_MESSAGING' },
  { name: 'GitHub', globalName: 'AST_GITHUB' }
]);

const AST_RUNTIME_MODULE_ALIAS_MAP = Object.freeze({
  HTTP: 'Http',
  ASTHTTP: 'Http',
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
  MESSAGING: 'Messaging',
  ASTMESSAGING: 'Messaging',
  GITHUB: 'GitHub',
  ASTGITHUB: 'GitHub'
});

const AstRuntimeErrorClass = typeof AstRuntimeError === 'function'
  ? AstRuntimeError
  : class AstRuntimeErrorFallback extends Error {
    constructor(message, details = {}, cause = null) {
      super(message);
      this.name = 'AstRuntimeError';
      this.details = details;
      if (cause) {
        this.cause = cause;
      }
    }
  };

const AstRuntimeValidationErrorClass = typeof AstRuntimeValidationError === 'function'
  ? AstRuntimeValidationError
  : class AstRuntimeValidationErrorFallback extends AstRuntimeErrorClass {
    constructor(message, details = {}, cause = null) {
      super(message, details, cause);
      this.name = 'AstRuntimeValidationError';
    }
  };

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

function astRuntimeResolveConfigReader() {
  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized;
  }

  if (typeof astConfigFromScriptProperties === 'function') {
    return astConfigFromScriptProperties;
  }

  const root = typeof globalThis !== 'undefined' ? globalThis : this;
  if (root && root.AST_CONFIG && typeof root.AST_CONFIG.fromScriptProperties === 'function') {
    return root.AST_CONFIG.fromScriptProperties;
  }

  throw new AstRuntimeErrorClass(
    'AST.Runtime.configureFromProps requires AST.Config helpers to be loaded',
    {
      missing: [
        'astConfigGetScriptPropertiesSnapshotMemoized',
        'astConfigFromScriptProperties'
      ]
    }
  );
}

function astRuntimeResolveProperties(options = {}) {
  const reader = astRuntimeResolveConfigReader();
  const properties = reader({
    properties: options.properties,
    scriptProperties: options.scriptProperties,
    keys: options.keys,
    prefix: options.prefix,
    stripPrefix: options.stripPrefix,
    includeEmpty: options.includeEmpty,
    cacheScopeId: options.cacheScopeId,
    disableCache: options.disableCache,
    forceRefresh: options.forceRefresh,
    cacheDefaultHandle: options.cacheDefaultHandle
  });

  if (!astRuntimeIsPlainObject(properties)) {
    return {};
  }

  return Object.assign({}, properties);
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
      throw new AstRuntimeValidationErrorClass(
        `AST.Runtime.configureFromProps received unsupported module '${requested[idx]}'`,
        { module: requested[idx] }
      );
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
    throw new AstRuntimeValidationErrorClass('AST.Runtime.configureFromProps options must be an object');
  }

  const properties = astRuntimeResolveProperties(options);
  const requestedModules = astRuntimeResolveRequestedModules(options.modules);
  const merge = typeof options.merge === 'boolean' ? options.merge : true;
  const clearBeforeConfigure = typeof options.clearBeforeConfigure === 'boolean'
    ? options.clearBeforeConfigure
    : false;
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
        throw new AstRuntimeErrorClass(
          `AST.Runtime.configureFromProps failed for module '${moduleName}': ${normalizedError.message}`,
          {
            module: moduleName,
            configuredModules: summary.configuredModules.slice(),
            failedModules: summary.failedModules.slice()
          },
          error
        );
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
__astRuntimeRoot.AST_RUNTIME = AST_RUNTIME;
