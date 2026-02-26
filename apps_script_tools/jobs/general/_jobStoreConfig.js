/* Internal runtime/script-property config resolution helpers for Jobs store/runtime. */

let AST_JOBS_RUNTIME_CONFIG = {};

const AST_JOBS_CANONICAL_CONFIG_KEYS = Object.freeze([
  'AST_JOBS_DEFAULT_MAX_RETRIES',
  'AST_JOBS_DEFAULT_MAX_RUNTIME_MS',
  'AST_JOBS_LEASE_TTL_MS',
  'AST_JOBS_CHECKPOINT_STORE',
  'AST_JOBS_PROPERTY_PREFIX'
]);

function astJobsInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

function astJobsNormalizeConfigValue(value) {
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

function astJobsNormalizeConfigToken(key) {
  const normalized = astJobsNormalizeString(key, null);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function astJobsCanonicalConfigKey(key) {
  const token = astJobsNormalizeConfigToken(key);
  if (!token) {
    return null;
  }

  if (token === 'astjobsdefaultmaxretries' || token === 'maxretries') {
    return 'AST_JOBS_DEFAULT_MAX_RETRIES';
  }

  if (token === 'astjobsdefaultmaxruntimems' || token === 'maxruntimems') {
    return 'AST_JOBS_DEFAULT_MAX_RUNTIME_MS';
  }

  if (token === 'astjobsleasettlms' || token === 'leasettlms') {
    return 'AST_JOBS_LEASE_TTL_MS';
  }

  if (token === 'astjobscheckpointstore' || token === 'checkpointstore') {
    return 'AST_JOBS_CHECKPOINT_STORE';
  }

  if (token === 'astjobspropertyprefix' || token === 'propertyprefix') {
    return 'AST_JOBS_PROPERTY_PREFIX';
  }

  return null;
}

function astJobsGetRuntimeConfig() {
  return astJobsCloneObject(AST_JOBS_RUNTIME_CONFIG);
}

function astJobsSetRuntimeConfig(config = {}, options = {}) {
  if (!astJobsIsPlainObject(config)) {
    throw new AstJobsValidationError('Jobs runtime config must be an object');
  }

  if (!astJobsIsPlainObject(options)) {
    throw new AstJobsValidationError('Jobs runtime config options must be an object');
  }

  const merge = options.merge !== false;
  const next = merge ? astJobsGetRuntimeConfig() : {};

  Object.keys(config).forEach(key => {
    const canonicalKey = astJobsCanonicalConfigKey(key);
    if (!canonicalKey || !AST_JOBS_CANONICAL_CONFIG_KEYS.includes(canonicalKey)) {
      return;
    }

    const normalizedValue = astJobsNormalizeConfigValue(config[key]);
    if (normalizedValue == null) {
      delete next[canonicalKey];
      return;
    }

    next[canonicalKey] = normalizedValue;
  });

  AST_JOBS_RUNTIME_CONFIG = next;
  astJobsInvalidateScriptPropertiesSnapshotCache();
  return astJobsGetRuntimeConfig();
}

function astJobsClearRuntimeConfig() {
  AST_JOBS_RUNTIME_CONFIG = {};
  astJobsInvalidateScriptPropertiesSnapshotCache();
  return {};
}

function astJobsGetScriptConfigSnapshot() {
  const output = {};
  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const entries = typeof astConfigGetScriptPropertiesSnapshotMemoized === 'function'
    ? astConfigGetScriptPropertiesSnapshotMemoized({
      scriptProperties,
      keys: AST_JOBS_CANONICAL_CONFIG_KEYS
    })
    : (typeof scriptProperties.getProperties === 'function'
      ? scriptProperties.getProperties()
      : {});

  if (astJobsIsPlainObject(entries)) {
    Object.keys(entries).forEach(key => {
      const canonicalKey = astJobsCanonicalConfigKey(key);
      if (!canonicalKey) {
        return;
      }

      const normalizedValue = astJobsNormalizeConfigValue(entries[key]);
      if (normalizedValue != null) {
        output[canonicalKey] = normalizedValue;
      }
    });
  }

  if (typeof scriptProperties.getProperty === 'function') {
    AST_JOBS_CANONICAL_CONFIG_KEYS.forEach(key => {
      if (output[key]) {
        return;
      }

      const normalizedValue = astJobsNormalizeConfigValue(scriptProperties.getProperty(key));
      if (normalizedValue != null) {
        output[key] = normalizedValue;
      }
    });
  }

  return output;
}

function astJobsResolveExecutionOptions(options = {}) {
  if (!astJobsIsPlainObject(options)) {
    throw new AstJobsValidationError('Job options must be an object');
  }

  const runtimeConfig = astJobsGetRuntimeConfig();
  const scriptConfig = astJobsGetScriptConfigSnapshot();
  const resolveCandidates = (requestKey, canonicalKey) => ([
    options[requestKey],
    runtimeConfig[canonicalKey],
    scriptConfig[canonicalKey]
  ]);

  const resolveString = (requestKey, canonicalKey, fallback) => {
    const candidates = resolveCandidates(requestKey, canonicalKey);

    if (typeof astConfigResolveFirstString === 'function') {
      return astConfigResolveFirstString(candidates, fallback);
    }

    for (let idx = 0; idx < candidates.length; idx += 1) {
      const value = astJobsNormalizeConfigValue(candidates[idx]);
      if (value != null) {
        return value;
      }
    }

    return fallback;
  };

  const resolveInteger = (requestKey, canonicalKey, fallback, min, max) => {
    const candidates = resolveCandidates(requestKey, canonicalKey);

    if (typeof astConfigResolveFirstInteger === 'function') {
      const resolved = astConfigResolveFirstInteger(candidates, {
        fallback,
        min,
        strict: false
      });

      if (resolved != null) {
        return Math.min(max, resolved);
      }
    }

    for (let idx = 0; idx < candidates.length; idx += 1) {
      const value = candidates[idx];
      if (value == null || value === '' || typeof value === 'boolean') {
        continue;
      }

      const normalized = astJobsNormalizePositiveInt(value, null, min, max);
      if (normalized != null) {
        return normalized;
      }
    }

    return fallback;
  };

  const maxRetries = resolveInteger(
    'maxRetries',
    'AST_JOBS_DEFAULT_MAX_RETRIES',
    AST_JOBS_DEFAULT_OPTIONS.maxRetries,
    0,
    20
  );

  const maxRuntimeMs = resolveInteger(
    'maxRuntimeMs',
    'AST_JOBS_DEFAULT_MAX_RUNTIME_MS',
    AST_JOBS_DEFAULT_OPTIONS.maxRuntimeMs,
    1000,
    600000
  );

  const leaseTtlMs = resolveInteger(
    'leaseTtlMs',
    'AST_JOBS_LEASE_TTL_MS',
    AST_JOBS_DEFAULT_OPTIONS.leaseTtlMs,
    1000,
    600000
  );

  const checkpointStore = astJobsNormalizeString(
    resolveString('checkpointStore', 'AST_JOBS_CHECKPOINT_STORE', AST_JOBS_DEFAULT_OPTIONS.checkpointStore),
    AST_JOBS_DEFAULT_OPTIONS.checkpointStore
  ).toLowerCase();

  const propertyPrefix = astJobsNormalizeString(
    resolveString('propertyPrefix', 'AST_JOBS_PROPERTY_PREFIX', AST_JOBS_DEFAULT_OPTIONS.propertyPrefix),
    AST_JOBS_DEFAULT_OPTIONS.propertyPrefix
  );

  return {
    maxRetries,
    maxRuntimeMs,
    leaseTtlMs,
    checkpointStore,
    autoResume: options.autoResume == null ? AST_JOBS_DEFAULT_OPTIONS.autoResume : Boolean(options.autoResume),
    propertyPrefix
  };
}
