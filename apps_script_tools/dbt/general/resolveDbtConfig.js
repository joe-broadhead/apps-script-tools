const AST_DBT_CONFIG_KEYS = Object.freeze([
  'DBT_MANIFEST_URI',
  'DBT_MANIFEST_DRIVE_FILE_ID',
  'DBT_MANIFEST_VALIDATE',
  'DBT_MANIFEST_SCHEMA_VERSION',
  'DBT_MANIFEST_MAX_BYTES',
  'DBT_MANIFEST_ALLOW_GZIP',
  'DBT_MANIFEST_BUILD_INDEX',
  'DBT_MANIFEST_CACHE_ENABLED',
  'DBT_MANIFEST_CACHE_URI',
  'DBT_MANIFEST_CACHE_REFRESH',
  'DBT_MANIFEST_CACHE_INCLUDE_MANIFEST',
  'DBT_MANIFEST_CACHE_COMPRESSION',
  'DBT_MANIFEST_CACHE_MODE'
]);

let AST_DBT_RUNTIME_CONFIG = {};

function astDbtInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astDbtNormalizeConfigValue(value) {
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

function astDbtGetRuntimeConfig() {
  return astDbtCloneObject(AST_DBT_RUNTIME_CONFIG);
}

function astDbtSetRuntimeConfig(config = {}, options = {}) {
  if (!astDbtIsPlainObject(config)) {
    throw new AstDbtValidationError('DBT runtime config must be an object');
  }

  if (!astDbtIsPlainObject(options)) {
    throw new AstDbtValidationError('DBT runtime config options must be an object');
  }

  const merge = options.merge !== false;
  let next;
  if (typeof astConfigMergeNormalizedConfig === 'function') {
    next = astConfigMergeNormalizedConfig(
      merge ? astDbtGetRuntimeConfig() : {},
      config,
      { merge: true }
    );
  } else {
    next = merge ? astDbtGetRuntimeConfig() : {};

    Object.keys(config).forEach(key => {
      const normalizedKey = astDbtNormalizeString(key, '');
      if (!normalizedKey) {
        return;
      }

      const normalizedValue = astDbtNormalizeConfigValue(config[key]);
      if (normalizedValue == null) {
        delete next[normalizedKey];
        return;
      }

      next[normalizedKey] = normalizedValue;
    });
  }

  AST_DBT_RUNTIME_CONFIG = next;
  astDbtInvalidateScriptPropertiesSnapshotCache();
  return astDbtGetRuntimeConfig();
}

function astDbtClearRuntimeConfig() {
  AST_DBT_RUNTIME_CONFIG = {};
  astDbtInvalidateScriptPropertiesSnapshotCache();
  return {};
}

function astDbtGetScriptPropertiesSnapshot() {
  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized({
      keys: AST_DBT_CONFIG_KEYS
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
        if (astDbtIsPlainObject(entries)) {
          Object.keys(entries).forEach(key => {
            const normalized = astDbtNormalizeConfigValue(entries[key]);
            if (normalized != null) {
              output[key] = normalized;
            }
          });
        }
      }

      if (scriptProperties && typeof scriptProperties.getProperty === 'function') {
        AST_DBT_CONFIG_KEYS.forEach(key => {
          if (output[key]) {
            return;
          }

          const normalized = astDbtNormalizeConfigValue(scriptProperties.getProperty(key));
          if (normalized != null) {
            output[key] = normalized;
          }
        });
      }
    }
  } catch (_error) {
    // ignore property access failures
  }

  return output;
}

function astDbtResolveConfigString(candidates = [], fallback = null) {
  if (typeof astConfigResolveFirstString === 'function') {
    return astConfigResolveFirstString(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astDbtNormalizeConfigValue(candidates[idx]);
    if (normalized != null) {
      return normalized;
    }
  }
  return fallback;
}

function astDbtResolveConfigBoolean(candidates = [], fallback = false) {
  if (typeof astConfigResolveFirstBoolean === 'function') {
    return astConfigResolveFirstBoolean(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const value = candidates[idx];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      continue;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    }
  }

  return fallback;
}

function astDbtResolveConfigInteger(candidates = [], fallback, min = 1) {
  if (typeof astConfigResolveFirstInteger === 'function') {
    return astConfigResolveFirstInteger(candidates, {
      fallback,
      min,
      onInvalid: value => {
        throw new AstDbtValidationError('Expected positive integer configuration value', {
          value,
          min
        });
      }
    });
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const value = candidates[idx];
    if (value == null || value === '') {
      continue;
    }

    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < min) {
      throw new AstDbtValidationError('Expected positive integer configuration value', {
        value,
        min
      });
    }

    return numeric;
  }

  return fallback;
}

function astDbtResolveLoadDefaults(request = {}) {
  const runtimeConfig = astDbtGetRuntimeConfig();
  const scriptConfig = astDbtGetScriptPropertiesSnapshot();
  const requestOptions = astDbtIsPlainObject(request.options) ? request.options : {};

  return {
    uri: astDbtResolveConfigString([
      request.uri,
      request.source && request.source.uri,
      runtimeConfig.DBT_MANIFEST_URI,
      runtimeConfig.uri,
      scriptConfig.DBT_MANIFEST_URI
    ], null),
    fileId: astDbtResolveConfigString([
      request.fileId,
      request.source && request.source.fileId,
      runtimeConfig.DBT_MANIFEST_DRIVE_FILE_ID,
      runtimeConfig.fileId,
      scriptConfig.DBT_MANIFEST_DRIVE_FILE_ID
    ], null),
    validate: astDbtResolveConfigString([
      requestOptions.validate,
      runtimeConfig.DBT_MANIFEST_VALIDATE,
      runtimeConfig.validate,
      scriptConfig.DBT_MANIFEST_VALIDATE
    ], null),
    schemaVersion: astDbtResolveConfigString([
      requestOptions.schemaVersion,
      runtimeConfig.DBT_MANIFEST_SCHEMA_VERSION,
      runtimeConfig.schemaVersion,
      scriptConfig.DBT_MANIFEST_SCHEMA_VERSION
    ], null),
    maxBytes: astDbtResolveConfigInteger([
      requestOptions.maxBytes,
      runtimeConfig.DBT_MANIFEST_MAX_BYTES,
      runtimeConfig.maxBytes,
      scriptConfig.DBT_MANIFEST_MAX_BYTES
    ], null, 1),
    allowGzip: astDbtResolveConfigBoolean([
      requestOptions.allowGzip,
      runtimeConfig.DBT_MANIFEST_ALLOW_GZIP,
      runtimeConfig.allowGzip,
      scriptConfig.DBT_MANIFEST_ALLOW_GZIP
    ], null),
    buildIndex: astDbtResolveConfigBoolean([
      requestOptions.buildIndex,
      runtimeConfig.DBT_MANIFEST_BUILD_INDEX,
      runtimeConfig.buildIndex,
      scriptConfig.DBT_MANIFEST_BUILD_INDEX
    ], null),
    persistentCacheEnabled: astDbtResolveConfigBoolean([
      requestOptions.persistentCacheEnabled,
      runtimeConfig.DBT_MANIFEST_CACHE_ENABLED,
      runtimeConfig.persistentCacheEnabled,
      scriptConfig.DBT_MANIFEST_CACHE_ENABLED
    ], null),
    persistentCacheUri: astDbtResolveConfigString([
      requestOptions.persistentCacheUri,
      runtimeConfig.DBT_MANIFEST_CACHE_URI,
      runtimeConfig.persistentCacheUri,
      scriptConfig.DBT_MANIFEST_CACHE_URI
    ], null),
    persistentCacheRefresh: astDbtResolveConfigBoolean([
      requestOptions.persistentCacheRefresh,
      runtimeConfig.DBT_MANIFEST_CACHE_REFRESH,
      runtimeConfig.persistentCacheRefresh,
      scriptConfig.DBT_MANIFEST_CACHE_REFRESH
    ], null),
    persistentCacheIncludeManifest: astDbtResolveConfigBoolean([
      requestOptions.persistentCacheIncludeManifest,
      runtimeConfig.DBT_MANIFEST_CACHE_INCLUDE_MANIFEST,
      runtimeConfig.persistentCacheIncludeManifest,
      scriptConfig.DBT_MANIFEST_CACHE_INCLUDE_MANIFEST
    ], null),
    persistentCacheCompression: astDbtResolveConfigString([
      requestOptions.persistentCacheCompression,
      runtimeConfig.DBT_MANIFEST_CACHE_COMPRESSION,
      runtimeConfig.persistentCacheCompression,
      scriptConfig.DBT_MANIFEST_CACHE_COMPRESSION
    ], null),
    persistentCacheMode: astDbtResolveConfigString([
      requestOptions.persistentCacheMode,
      runtimeConfig.DBT_MANIFEST_CACHE_MODE,
      runtimeConfig.persistentCacheMode,
      scriptConfig.DBT_MANIFEST_CACHE_MODE
    ], null)
  };
}
