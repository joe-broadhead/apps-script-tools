function astConfigIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astConfigNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astConfigNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function astConfigNormalizeKeys(keys) {
  if (!Array.isArray(keys)) {
    return null;
  }

  const output = [];
  const seen = {};

  for (let idx = 0; idx < keys.length; idx += 1) {
    const normalized = astConfigNormalizeString(keys[idx], '');
    if (!normalized || seen[normalized]) {
      continue;
    }

    seen[normalized] = true;
    output.push(normalized);
  }

  return output;
}

function astConfigNormalizeValue(value, includeEmpty = false) {
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

const AST_CONFIG_DEFAULT_HANDLE_CACHE_ID = 'default';
const AST_CONFIG_EMPTY_KEYS_CACHE_ID = '__empty__';

let AST_CONFIG_SCRIPT_PROPERTIES_CACHE = {
  nextHandleId: 1,
  handles: {},
  handleRegistry: []
};

function astConfigCloneEntries(entries) {
  if (!astConfigIsPlainObject(entries)) {
    return {};
  }
  return Object.assign({}, entries);
}

function astConfigBuildSnapshotCacheKey(keys) {
  const normalizedKeys = astConfigNormalizeKeys(keys);
  if (!Array.isArray(normalizedKeys)) {
    return '*';
  }
  if (normalizedKeys.length === 0) {
    return AST_CONFIG_EMPTY_KEYS_CACHE_ID;
  }
  return normalizedKeys.slice().sort().join('\u0001');
}

function astConfigProjectEntriesForKeys(entries, requestedKeys) {
  if (!Array.isArray(requestedKeys)) {
    return astConfigCloneEntries(entries);
  }

  const output = {};
  for (let idx = 0; idx < requestedKeys.length; idx += 1) {
    const key = requestedKeys[idx];
    if (!Object.prototype.hasOwnProperty.call(entries, key)) {
      continue;
    }
    output[key] = entries[key];
  }

  return output;
}

function astConfigInvalidateScriptPropertiesSnapshotMemoized() {
  AST_CONFIG_SCRIPT_PROPERTIES_CACHE = {
    nextHandleId: 1,
    handles: {},
    handleRegistry: []
  };
  return true;
}

function astConfigResolveHandleCacheId(handle) {
  if (!handle || typeof handle !== 'object') {
    return AST_CONFIG_DEFAULT_HANDLE_CACHE_ID;
  }

  const registry = AST_CONFIG_SCRIPT_PROPERTIES_CACHE.handleRegistry;
  for (let idx = 0; idx < registry.length; idx += 1) {
    if (registry[idx].handle === handle) {
      return registry[idx].id;
    }
  }

  const id = `h${AST_CONFIG_SCRIPT_PROPERTIES_CACHE.nextHandleId}`;
  AST_CONFIG_SCRIPT_PROPERTIES_CACHE.nextHandleId += 1;
  registry.push({ id, handle });
  return id;
}

function astConfigGetHandleCache(handle, options = {}) {
  const explicitCacheScopeId = astConfigNormalizeString(options.cacheScopeId, '');
  const cacheId = explicitCacheScopeId || astConfigResolveHandleCacheId(handle);
  const handles = AST_CONFIG_SCRIPT_PROPERTIES_CACHE.handles;

  if (!Object.prototype.hasOwnProperty.call(handles, cacheId)) {
    handles[cacheId] = {};
  }

  return handles[cacheId];
}

function astConfigResolveScriptPropertiesHandle(options = {}) {
  const providedHandle = options.scriptProperties;
  if (
    providedHandle &&
    (
      typeof providedHandle.getProperties === 'function'
      || typeof providedHandle.getProperty === 'function'
    )
  ) {
    return providedHandle;
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
    // Intentionally swallow script property access failures.
  }

  return null;
}

function astConfigReadEntriesFromHandle(handle, requestedKeys = null) {
  if (!handle) {
    return {};
  }

  const output = {};
  const hasRequestedKeys = Array.isArray(requestedKeys);

  if (typeof handle.getProperties === 'function') {
    const map = handle.getProperties();
    if (astConfigIsPlainObject(map)) {
      const keys = hasRequestedKeys ? requestedKeys : Object.keys(map);

      for (let idx = 0; idx < keys.length; idx += 1) {
        const key = keys[idx];
        if (Object.prototype.hasOwnProperty.call(map, key)) {
          output[key] = map[key];
        }
      }
    }
  }

  if (hasRequestedKeys && typeof handle.getProperty === 'function') {
    for (let idx = 0; idx < requestedKeys.length; idx += 1) {
      const key = requestedKeys[idx];
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        continue;
      }

      const value = handle.getProperty(key);
      if (typeof value !== 'undefined') {
        output[key] = value;
      }
    }
  }

  return output;
}

function astConfigReadEntriesFromHandleMemoized(handle, requestedKeys = null, options = {}) {
  if (!handle) {
    return {};
  }

  const disableCache = astConfigNormalizeBoolean(options.disableCache, false);
  const forceRefresh = astConfigNormalizeBoolean(options.forceRefresh, false);

  if (disableCache) {
    return astConfigReadEntriesFromHandle(handle, requestedKeys);
  }

  if (forceRefresh) {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }

  const cacheKey = astConfigBuildSnapshotCacheKey(requestedKeys);
  const handleCache = astConfigGetHandleCache(handle, options);

  if (Object.prototype.hasOwnProperty.call(handleCache, cacheKey)) {
    return astConfigCloneEntries(handleCache[cacheKey]);
  }

  const entries = astConfigReadEntriesFromHandle(handle, requestedKeys);
  handleCache[cacheKey] = astConfigCloneEntries(entries);
  return astConfigCloneEntries(entries);
}

function astConfigBuildOutput(entries, options = {}) {
  const includeEmpty = astConfigNormalizeBoolean(options.includeEmpty, false);
  const requestedKeys = astConfigNormalizeKeys(options.keys);
  const prefix = astConfigNormalizeString(options.prefix, '');
  const stripPrefix = astConfigNormalizeBoolean(options.stripPrefix, false);
  const keys = Array.isArray(requestedKeys) ? requestedKeys : Object.keys(entries || {}).sort();
  const output = {};

  for (let idx = 0; idx < keys.length; idx += 1) {
    const sourceKey = astConfigNormalizeString(keys[idx], '');
    if (!sourceKey) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(entries, sourceKey)) {
      continue;
    }

    if (prefix && !sourceKey.startsWith(prefix)) {
      continue;
    }

    const targetKey = stripPrefix && prefix
      ? sourceKey.slice(prefix.length)
      : sourceKey;

    const normalizedKey = astConfigNormalizeString(targetKey, '');
    if (!normalizedKey) {
      continue;
    }

    const normalizedValue = astConfigNormalizeValue(entries[sourceKey], includeEmpty);
    if (normalizedValue == null) {
      continue;
    }

    output[normalizedKey] = normalizedValue;
  }

  return output;
}

function astConfigGetScriptPropertiesSnapshotMemoized(options = {}) {
  if (!astConfigIsPlainObject(options)) {
    throw new Error('Script properties snapshot options must be an object');
  }

  const requestedKeys = astConfigNormalizeKeys(options.keys);
  const hasExplicitScriptPropertiesHandle = Boolean(
    options.scriptProperties
    && (
      typeof options.scriptProperties.getProperties === 'function'
      || typeof options.scriptProperties.getProperty === 'function'
    )
  );

  if (astConfigIsPlainObject(options.properties)) {
    return astConfigBuildOutput(options.properties, Object.assign({}, options, {
      keys: requestedKeys
    }));
  }

  if (
    astConfigIsPlainObject(options.scriptProperties)
    && typeof options.scriptProperties.getProperties !== 'function'
    && typeof options.scriptProperties.getProperty !== 'function'
  ) {
    return astConfigBuildOutput(options.scriptProperties, Object.assign({}, options, {
      keys: requestedKeys
    }));
  }

  const scriptProperties = astConfigResolveScriptPropertiesHandle(options);
  const entries = astConfigReadEntriesFromHandleMemoized(
    scriptProperties,
    requestedKeys,
    Object.assign({}, options, {
      cacheScopeId: hasExplicitScriptPropertiesHandle
        ? ''
        : AST_CONFIG_DEFAULT_HANDLE_CACHE_ID
    })
  );
  return astConfigBuildOutput(entries, Object.assign({}, options, {
    keys: requestedKeys
  }));
}

function astConfigFromScriptProperties(options = {}) {
  if (!astConfigIsPlainObject(options)) {
    throw new Error('AST.Config.fromScriptProperties options must be an object');
  }

  return astConfigGetScriptPropertiesSnapshotMemoized(options);
}

const AST_CONFIG = Object.freeze({
  fromScriptProperties: astConfigFromScriptProperties
});

const __astConfigRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astConfigRoot.astConfigFromScriptProperties = astConfigFromScriptProperties;
__astConfigRoot.astConfigGetScriptPropertiesSnapshotMemoized = astConfigGetScriptPropertiesSnapshotMemoized;
__astConfigRoot.astConfigInvalidateScriptPropertiesSnapshotMemoized = astConfigInvalidateScriptPropertiesSnapshotMemoized;
__astConfigRoot.AST_CONFIG = AST_CONFIG;
this.astConfigFromScriptProperties = astConfigFromScriptProperties;
this.astConfigGetScriptPropertiesSnapshotMemoized = astConfigGetScriptPropertiesSnapshotMemoized;
this.astConfigInvalidateScriptPropertiesSnapshotMemoized = astConfigInvalidateScriptPropertiesSnapshotMemoized;
this.AST_CONFIG = AST_CONFIG;
