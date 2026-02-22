let AST_JOBS_RUNTIME_CONFIG = {};

const AST_JOBS_CANONICAL_CONFIG_KEYS = Object.freeze([
  'AST_JOBS_DEFAULT_MAX_RETRIES',
  'AST_JOBS_DEFAULT_MAX_RUNTIME_MS',
  'AST_JOBS_CHECKPOINT_STORE',
  'AST_JOBS_PROPERTY_PREFIX'
]);

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
  return astJobsGetRuntimeConfig();
}

function astJobsClearRuntimeConfig() {
  AST_JOBS_RUNTIME_CONFIG = {};
  return {};
}

function astJobsGetScriptPropertiesHandle() {
  if (
    typeof PropertiesService === 'undefined' ||
    !PropertiesService ||
    typeof PropertiesService.getScriptProperties !== 'function'
  ) {
    throw new AstJobsCapabilityError('PropertiesService.getScriptProperties is not available in this runtime');
  }

  const scriptProperties = PropertiesService.getScriptProperties();
  if (!scriptProperties) {
    throw new AstJobsCapabilityError('Script properties store is not available');
  }

  return scriptProperties;
}

function astJobsReadAllScriptProperties() {
  const scriptProperties = astJobsGetScriptPropertiesHandle();
  if (typeof scriptProperties.getProperties !== 'function') {
    return {};
  }

  const entries = scriptProperties.getProperties();
  return astJobsIsPlainObject(entries) ? entries : {};
}

function astJobsGetScriptConfigSnapshot() {
  const output = {};
  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const entries = typeof scriptProperties.getProperties === 'function'
    ? scriptProperties.getProperties()
    : {};

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

  const resolveValue = (requestKey, canonicalKey, fallback) => {
    const requestValue = astJobsNormalizeConfigValue(options[requestKey]);
    if (requestValue != null) {
      return requestValue;
    }

    const runtimeValue = astJobsNormalizeConfigValue(runtimeConfig[canonicalKey]);
    if (runtimeValue != null) {
      return runtimeValue;
    }

    const scriptValue = astJobsNormalizeConfigValue(scriptConfig[canonicalKey]);
    if (scriptValue != null) {
      return scriptValue;
    }

    return fallback;
  };

  const maxRetries = astJobsNormalizePositiveInt(
    resolveValue('maxRetries', 'AST_JOBS_DEFAULT_MAX_RETRIES', AST_JOBS_DEFAULT_OPTIONS.maxRetries),
    AST_JOBS_DEFAULT_OPTIONS.maxRetries,
    0,
    20
  );

  const maxRuntimeMs = astJobsNormalizePositiveInt(
    resolveValue('maxRuntimeMs', 'AST_JOBS_DEFAULT_MAX_RUNTIME_MS', AST_JOBS_DEFAULT_OPTIONS.maxRuntimeMs),
    AST_JOBS_DEFAULT_OPTIONS.maxRuntimeMs,
    1000,
    600000
  );

  const checkpointStore = astJobsNormalizeString(
    resolveValue('checkpointStore', 'AST_JOBS_CHECKPOINT_STORE', AST_JOBS_DEFAULT_OPTIONS.checkpointStore),
    AST_JOBS_DEFAULT_OPTIONS.checkpointStore
  ).toLowerCase();

  const propertyPrefix = astJobsNormalizeString(
    resolveValue('propertyPrefix', 'AST_JOBS_PROPERTY_PREFIX', AST_JOBS_DEFAULT_OPTIONS.propertyPrefix),
    AST_JOBS_DEFAULT_OPTIONS.propertyPrefix
  );

  return {
    maxRetries,
    maxRuntimeMs,
    checkpointStore,
    autoResume: options.autoResume == null ? AST_JOBS_DEFAULT_OPTIONS.autoResume : Boolean(options.autoResume),
    propertyPrefix
  };
}

function astJobsBuildPropertyKey(jobId, propertyPrefix) {
  return `${propertyPrefix}${jobId}`;
}

function astJobsCloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function astJobsParseStoredJob(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return astJobsIsPlainObject(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function astJobsLooksLikeJobRecord(value) {
  return (
    astJobsIsPlainObject(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.steps)
  );
}

function astJobsFindJobRecordInAllProperties(jobId) {
  const normalizedJobId = astJobsNormalizeJobId(jobId);
  const entries = astJobsReadAllScriptProperties();
  const keys = Object.keys(entries);

  for (let idx = 0; idx < keys.length; idx += 1) {
    const propertyKey = keys[idx];
    const parsed = astJobsParseStoredJob(entries[propertyKey]);
    if (!parsed || !astJobsLooksLikeJobRecord(parsed)) {
      continue;
    }

    if (parsed.id === normalizedJobId) {
      return {
        propertyKey,
        job: parsed
      };
    }
  }

  return null;
}

function astJobsReadJobRecord(jobId, options = {}) {
  const normalizedJobId = astJobsNormalizeJobId(jobId);
  const executionOptions = astJobsResolveExecutionOptions(options);
  const propertyKey = astJobsBuildPropertyKey(normalizedJobId, executionOptions.propertyPrefix);
  const scriptProperties = astJobsGetScriptPropertiesHandle();

  let rawValue = null;
  if (typeof scriptProperties.getProperty === 'function') {
    rawValue = scriptProperties.getProperty(propertyKey);
  } else {
    const entries = astJobsReadAllScriptProperties();
    rawValue = entries[propertyKey] || null;
  }

  const parsedDirect = astJobsParseStoredJob(rawValue);
  if (parsedDirect) {
    return astJobsCloneSerializable(parsedDirect);
  }

  const fallback = astJobsFindJobRecordInAllProperties(normalizedJobId);
  if (fallback && fallback.job) {
    return astJobsCloneSerializable(fallback.job);
  }

  throw new AstJobsNotFoundError('Job not found', {
    jobId: normalizedJobId
  });
}

function astJobsWriteJobRecord(job, options = {}) {
  if (!astJobsIsPlainObject(job)) {
    throw new AstJobsValidationError('Job record must be an object');
  }

  const normalizedJobId = astJobsNormalizeJobId(job.id);
  const executionOptions = astJobsResolveExecutionOptions(
    Object.assign({}, options, {
      propertyPrefix: job.options && job.options.propertyPrefix
    })
  );
  const propertyKey = astJobsBuildPropertyKey(normalizedJobId, executionOptions.propertyPrefix);

  let serialized;
  try {
    serialized = JSON.stringify(job);
  } catch (error) {
    throw new AstJobsValidationError('Job record must be JSON serializable', {
      jobId: normalizedJobId
    }, error);
  }

  const scriptProperties = astJobsGetScriptPropertiesHandle();
  if (typeof scriptProperties.setProperty === 'function') {
    scriptProperties.setProperty(propertyKey, serialized);
  } else if (typeof scriptProperties.setProperties === 'function') {
    const entries = astJobsReadAllScriptProperties();
    entries[propertyKey] = serialized;
    scriptProperties.setProperties(entries, true);
  } else {
    throw new AstJobsCapabilityError('Script properties store does not support writes');
  }

  return astJobsCloneSerializable(job);
}

function astJobsListJobRecords(filters = {}, options = {}) {
  const normalizedFilters = astJobsValidateListFilters(filters);
  const executionOptions = astJobsResolveExecutionOptions(options);
  const propertyPrefix = executionOptions.propertyPrefix;
  const hasExplicitPrefix = astJobsNormalizeString(options.propertyPrefix, null) != null;
  const entries = astJobsReadAllScriptProperties();
  const output = [];

  Object.keys(entries).forEach(key => {
    if (hasExplicitPrefix && !String(key).startsWith(propertyPrefix)) {
      return;
    }

    if (!hasExplicitPrefix && !String(key).startsWith(propertyPrefix)) {
      // When no explicit prefix is requested, include other prefixes only if the payload
      // looks like a persisted jobs record.
      const candidate = astJobsParseStoredJob(entries[key]);
      if (!candidate || !astJobsLooksLikeJobRecord(candidate)) {
        return;
      }

      if (normalizedFilters.status && candidate.status !== normalizedFilters.status) {
        return;
      }

      if (normalizedFilters.name && candidate.name !== normalizedFilters.name) {
        return;
      }

      output.push(candidate);
      return;
    }

    const parsed = astJobsParseStoredJob(entries[key]);
    if (!parsed || !astJobsLooksLikeJobRecord(parsed)) {
      return;
    }

    if (normalizedFilters.status && parsed.status !== normalizedFilters.status) {
      return;
    }

    if (normalizedFilters.name && parsed.name !== normalizedFilters.name) {
      return;
    }

    output.push(parsed);
  });

  output.sort((left, right) => {
    const leftCreatedAt = astJobsNormalizeString(left.createdAt, '');
    const rightCreatedAt = astJobsNormalizeString(right.createdAt, '');
    return leftCreatedAt < rightCreatedAt ? 1 : (leftCreatedAt > rightCreatedAt ? -1 : 0);
  });

  return output
    .slice(0, normalizedFilters.limit)
    .map(item => astJobsCloneSerializable(item));
}

const __astJobsStoreRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsStoreRoot.astJobsGetRuntimeConfig = astJobsGetRuntimeConfig;
__astJobsStoreRoot.astJobsSetRuntimeConfig = astJobsSetRuntimeConfig;
__astJobsStoreRoot.astJobsClearRuntimeConfig = astJobsClearRuntimeConfig;
__astJobsStoreRoot.astJobsResolveExecutionOptions = astJobsResolveExecutionOptions;
__astJobsStoreRoot.astJobsReadJobRecord = astJobsReadJobRecord;
__astJobsStoreRoot.astJobsWriteJobRecord = astJobsWriteJobRecord;
__astJobsStoreRoot.astJobsListJobRecords = astJobsListJobRecords;
__astJobsStoreRoot.astJobsFindJobRecordInAllProperties = astJobsFindJobRecordInAllProperties;
this.astJobsGetRuntimeConfig = astJobsGetRuntimeConfig;
this.astJobsSetRuntimeConfig = astJobsSetRuntimeConfig;
this.astJobsClearRuntimeConfig = astJobsClearRuntimeConfig;
this.astJobsResolveExecutionOptions = astJobsResolveExecutionOptions;
this.astJobsReadJobRecord = astJobsReadJobRecord;
this.astJobsWriteJobRecord = astJobsWriteJobRecord;
this.astJobsListJobRecords = astJobsListJobRecords;
this.astJobsFindJobRecordInAllProperties = astJobsFindJobRecordInAllProperties;
