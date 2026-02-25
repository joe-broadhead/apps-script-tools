const AST_CACHE_DEFAULT_CONFIG = Object.freeze({
  backend: 'memory',
  namespace: 'ast_cache',
  defaultTtlSec: 300,
  maxMemoryEntries: 2000,
  driveFolderId: '',
  driveFileName: 'ast-cache.json',
  storageUri: '',
  lockTimeoutMs: 30000,
  lockScope: 'script',
  updateStatsOnGet: true
});

const AST_CACHE_BACKEND_DEFAULTS = Object.freeze({
  memory: Object.freeze({
    lockScope: 'none',
    updateStatsOnGet: true
  }),
  drive_json: Object.freeze({
    lockScope: 'script',
    updateStatsOnGet: false
  }),
  script_properties: Object.freeze({
    lockScope: 'script',
    updateStatsOnGet: false
  }),
  storage_json: Object.freeze({
    lockScope: 'none',
    updateStatsOnGet: false
  })
});

const AST_CACHE_CONFIG_KEYS = Object.freeze([
  'CACHE_BACKEND',
  'CACHE_NAMESPACE',
  'CACHE_DEFAULT_TTL_SEC',
  'CACHE_MAX_MEMORY_ENTRIES',
  'CACHE_DRIVE_FOLDER_ID',
  'CACHE_DRIVE_FILE_NAME',
  'CACHE_STORAGE_URI',
  'CACHE_LOCK_TIMEOUT_MS',
  'CACHE_LOCK_SCOPE',
  'CACHE_UPDATE_STATS_ON_GET'
]);

let AST_CACHE_RUNTIME_CONFIG = {};

function astCacheInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astCacheNormalizeConfigValue(value) {
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

function astCacheGetRuntimeConfig() {
  return astCacheJsonClone(AST_CACHE_RUNTIME_CONFIG);
}

function astCacheSetRuntimeConfig(config = {}, options = {}) {
  if (!astCacheIsPlainObject(config)) {
    throw new AstCacheValidationError('Cache runtime config must be an object');
  }

  if (!astCacheIsPlainObject(options)) {
    throw new AstCacheValidationError('Cache runtime config options must be an object');
  }

  const merge = options.merge !== false;
  let next;
  if (typeof astConfigMergeNormalizedConfig === 'function') {
    next = astConfigMergeNormalizedConfig(
      merge ? astCacheGetRuntimeConfig() : {},
      config,
      { merge: true }
    );
  } else {
    next = merge ? astCacheGetRuntimeConfig() : {};

    const keys = Object.keys(config);
    for (let idx = 0; idx < keys.length; idx += 1) {
      const key = astCacheNormalizeString(keys[idx], '');
      if (!key) {
        continue;
      }

      const normalized = astCacheNormalizeConfigValue(config[key]);
      if (normalized == null) {
        delete next[key];
        continue;
      }

      next[key] = normalized;
    }
  }

  AST_CACHE_RUNTIME_CONFIG = next;
  astCacheInvalidateScriptPropertiesSnapshotCache();
  return astCacheGetRuntimeConfig();
}

function astCacheClearRuntimeConfig() {
  AST_CACHE_RUNTIME_CONFIG = {};
  astCacheInvalidateScriptPropertiesSnapshotCache();
  return {};
}

function astCacheGetScriptPropertiesSnapshot() {
  if (typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function') {
    return astConfigGetScriptPropertiesSnapshotMemoized({
      keys: AST_CACHE_CONFIG_KEYS
    });
  }

  const output = {};

  try {
    if (
      typeof PropertiesService === 'undefined' ||
      !PropertiesService ||
      typeof PropertiesService.getScriptProperties !== 'function'
    ) {
      return output;
    }

    const scriptProperties = PropertiesService.getScriptProperties();
    if (!scriptProperties) {
      return output;
    }

    if (typeof scriptProperties.getProperties === 'function') {
      const entries = scriptProperties.getProperties() || {};
      const keys = Object.keys(entries);
      for (let idx = 0; idx < keys.length; idx += 1) {
        const key = keys[idx];
        const normalized = astCacheNormalizeConfigValue(entries[key]);
        if (normalized != null) {
          output[key] = normalized;
        }
      }
    }

    if (typeof scriptProperties.getProperty === 'function') {
      for (let idx = 0; idx < AST_CACHE_CONFIG_KEYS.length; idx += 1) {
        const key = AST_CACHE_CONFIG_KEYS[idx];
        if (output[key]) {
          continue;
        }
        const normalized = astCacheNormalizeConfigValue(scriptProperties.getProperty(key));
        if (normalized != null) {
          output[key] = normalized;
        }
      }
    }
  } catch (_error) {
    // Ignore script property read failures.
  }

  return output;
}

function astCacheResolveConfigString(candidates, fallback = '') {
  if (typeof astConfigResolveFirstString === 'function') {
    return astConfigResolveFirstString(candidates, fallback);
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astCacheNormalizeConfigValue(candidates[idx]);
    if (normalized != null) {
      return normalized;
    }
  }
  return fallback;
}

function astCacheResolveConfigNumber(candidates, fallback, min, max) {
  if (typeof astConfigResolveFirstInteger === 'function') {
    return astConfigResolveFirstInteger(candidates, {
      fallback,
      min,
      max
    });
  }

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const value = candidates[idx];
    if (value == null || value === '') {
      continue;
    }

    const numeric = astCacheNormalizePositiveInt(value, null, min, max);
    if (numeric != null) {
      return numeric;
    }
  }

  return fallback;
}

function astCacheResolveConfigBoolean(candidates, fallback) {
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
      if (!normalized) continue;
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    }
  }
  return fallback;
}

function astCacheResolveConfig(overrides = {}) {
  if (!astCacheIsPlainObject(overrides)) {
    throw new AstCacheValidationError('Cache config overrides must be an object');
  }

  const runtimeConfig = astCacheGetRuntimeConfig();
  const scriptConfig = astCacheGetScriptPropertiesSnapshot();

  const backend = astCacheResolveConfigString([
    overrides.backend,
    runtimeConfig.CACHE_BACKEND,
    runtimeConfig.backend,
    scriptConfig.CACHE_BACKEND
  ], AST_CACHE_DEFAULT_CONFIG.backend).toLowerCase();

  astCacheAssertBackendSupported(backend);
  const backendDefaults = AST_CACHE_BACKEND_DEFAULTS[backend] || AST_CACHE_DEFAULT_CONFIG;

  const namespace = astCacheResolveConfigString([
    overrides.namespace,
    runtimeConfig.CACHE_NAMESPACE,
    runtimeConfig.namespace,
    scriptConfig.CACHE_NAMESPACE
  ], AST_CACHE_DEFAULT_CONFIG.namespace);

  const defaultTtlSec = astCacheResolveConfigNumber([
    overrides.defaultTtlSec,
    runtimeConfig.CACHE_DEFAULT_TTL_SEC,
    runtimeConfig.defaultTtlSec,
    scriptConfig.CACHE_DEFAULT_TTL_SEC
  ], AST_CACHE_DEFAULT_CONFIG.defaultTtlSec, 0, 86400 * 365);

  const maxMemoryEntries = astCacheResolveConfigNumber([
    overrides.maxMemoryEntries,
    runtimeConfig.CACHE_MAX_MEMORY_ENTRIES,
    runtimeConfig.maxMemoryEntries,
    scriptConfig.CACHE_MAX_MEMORY_ENTRIES
  ], AST_CACHE_DEFAULT_CONFIG.maxMemoryEntries, 10, 1000000);

  const driveFolderId = astCacheResolveConfigString([
    overrides.driveFolderId,
    runtimeConfig.CACHE_DRIVE_FOLDER_ID,
    runtimeConfig.driveFolderId,
    scriptConfig.CACHE_DRIVE_FOLDER_ID
  ], AST_CACHE_DEFAULT_CONFIG.driveFolderId);

  const driveFileName = astCacheResolveConfigString([
    overrides.driveFileName,
    runtimeConfig.CACHE_DRIVE_FILE_NAME,
    runtimeConfig.driveFileName,
    scriptConfig.CACHE_DRIVE_FILE_NAME
  ], AST_CACHE_DEFAULT_CONFIG.driveFileName);

  const lockTimeoutMs = astCacheResolveConfigNumber([
    overrides.lockTimeoutMs,
    runtimeConfig.CACHE_LOCK_TIMEOUT_MS,
    runtimeConfig.lockTimeoutMs,
    scriptConfig.CACHE_LOCK_TIMEOUT_MS
  ], AST_CACHE_DEFAULT_CONFIG.lockTimeoutMs, 1, 300000);

  const storageUri = astCacheResolveConfigString([
    overrides.storageUri,
    runtimeConfig.CACHE_STORAGE_URI,
    runtimeConfig.storageUri,
    scriptConfig.CACHE_STORAGE_URI
  ], AST_CACHE_DEFAULT_CONFIG.storageUri);

  const lockScope = astCacheResolveConfigString([
    overrides.lockScope,
    runtimeConfig.CACHE_LOCK_SCOPE,
    runtimeConfig.lockScope,
    scriptConfig.CACHE_LOCK_SCOPE
  ], backendDefaults.lockScope || AST_CACHE_DEFAULT_CONFIG.lockScope).toLowerCase();

  if (['script', 'user', 'none'].indexOf(lockScope) === -1) {
    throw new AstCacheValidationError('Cache lockScope must be one of: script, user, none', {
      lockScope
    });
  }

  const updateStatsOnGet = astCacheResolveConfigBoolean([
    overrides.updateStatsOnGet,
    runtimeConfig.CACHE_UPDATE_STATS_ON_GET,
    runtimeConfig.updateStatsOnGet,
    scriptConfig.CACHE_UPDATE_STATS_ON_GET
  ], typeof backendDefaults.updateStatsOnGet === 'boolean'
    ? backendDefaults.updateStatsOnGet
    : AST_CACHE_DEFAULT_CONFIG.updateStatsOnGet);

  const traceCollector = typeof overrides.traceCollector === 'function'
    ? overrides.traceCollector
    : null;
  const traceContext = astCacheIsPlainObject(overrides.traceContext)
    ? astCacheJsonClone(overrides.traceContext)
    : null;

  return {
    backend,
    namespace,
    defaultTtlSec,
    maxMemoryEntries,
    driveFolderId,
    driveFileName,
    storageUri,
    lockTimeoutMs,
    lockScope,
    updateStatsOnGet,
    traceCollector,
    traceContext
  };
}
