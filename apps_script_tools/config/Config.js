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

function astConfigFromScriptProperties(options = {}) {
  if (!astConfigIsPlainObject(options)) {
    throw new Error('AST.Config.fromScriptProperties options must be an object');
  }

  const requestedKeys = astConfigNormalizeKeys(options.keys);

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
  const entries = astConfigReadEntriesFromHandle(scriptProperties, requestedKeys);
  return astConfigBuildOutput(entries, Object.assign({}, options, {
    keys: requestedKeys
  }));
}

const AST_CONFIG = Object.freeze({
  fromScriptProperties: astConfigFromScriptProperties
});

const __astConfigRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astConfigRoot.astConfigFromScriptProperties = astConfigFromScriptProperties;
__astConfigRoot.AST_CONFIG = AST_CONFIG;
this.astConfigFromScriptProperties = astConfigFromScriptProperties;
this.AST_CONFIG = AST_CONFIG;
