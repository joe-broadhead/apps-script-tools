let AST_JOBS_RUNTIME_CONFIG = {};

const AST_JOBS_DEFAULT_LOCK_TIMEOUT_MS = 30000;
const AST_JOBS_INDEX_BUCKET_COUNT = 16;
const AST_JOBS_PREFIX_REGISTRY_KEY = 'AST_JOBS_PREFIX_REGISTRY';
const AST_JOBS_LOCATOR_PREFIX = 'AST_JOBS_LOCATOR_';

function astJobsInvalidateScriptPropertiesSnapshotCache() {
  if (typeof astConfigInvalidateScriptPropertiesSnapshotMemoized === 'function') {
    astConfigInvalidateScriptPropertiesSnapshotMemoized();
  }
}

const AST_JOBS_CANONICAL_CONFIG_KEYS = Object.freeze([
  'AST_JOBS_DEFAULT_MAX_RETRIES',
  'AST_JOBS_DEFAULT_MAX_RUNTIME_MS',
  'AST_JOBS_LEASE_TTL_MS',
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
  let scriptConfigSnapshot = null;

  const getScriptConfigSnapshot = () => {
    if (scriptConfigSnapshot == null) {
      scriptConfigSnapshot = astJobsGetScriptConfigSnapshot();
    }
    return scriptConfigSnapshot;
  };

  const resolveValue = (requestKey, canonicalKey, fallback) => {
    const requestValue = astJobsNormalizeConfigValue(options[requestKey]);
    if (requestValue != null) {
      return requestValue;
    }

    const runtimeValue = astJobsNormalizeConfigValue(runtimeConfig[canonicalKey]);
    if (runtimeValue != null) {
      return runtimeValue;
    }

    const scriptValue = astJobsNormalizeConfigValue(getScriptConfigSnapshot()[canonicalKey]);
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

  const leaseTtlMs = astJobsNormalizePositiveInt(
    resolveValue('leaseTtlMs', 'AST_JOBS_LEASE_TTL_MS', AST_JOBS_DEFAULT_OPTIONS.leaseTtlMs),
    AST_JOBS_DEFAULT_OPTIONS.leaseTtlMs,
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
    leaseTtlMs,
    checkpointStore,
    autoResume: options.autoResume == null ? AST_JOBS_DEFAULT_OPTIONS.autoResume : Boolean(options.autoResume),
    propertyPrefix
  };
}

function astJobsNormalizeJobVersion(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function astJobsResolveLockTimeoutMs(options = {}) {
  if (!astJobsIsPlainObject(options)) {
    return AST_JOBS_DEFAULT_LOCK_TIMEOUT_MS;
  }

  return astJobsNormalizePositiveInt(
    options.lockTimeoutMs,
    AST_JOBS_DEFAULT_LOCK_TIMEOUT_MS,
    1,
    60000
  );
}

function astJobsBuildPropertyKey(jobId, propertyPrefix) {
  return `${propertyPrefix}${jobId}`;
}

function astJobsBuildLocatorKey(jobId) {
  return `${AST_JOBS_LOCATOR_PREFIX}${jobId}`;
}

function astJobsHashString(value) {
  const normalized = String(value || '');
  let hash = 0;
  for (let idx = 0; idx < normalized.length; idx += 1) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(idx)) | 0;
  }
  return Math.abs(hash);
}

function astJobsBuildIndexBucketId(jobId) {
  return astJobsHashString(jobId) % AST_JOBS_INDEX_BUCKET_COUNT;
}

function astJobsBuildIndexBucketKey(propertyPrefix, bucketId) {
  return `${propertyPrefix}INDEX_BUCKET_${bucketId}`;
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

function astJobsReadProperty(scriptProperties, key) {
  if (typeof scriptProperties.getProperty === 'function') {
    return scriptProperties.getProperty(key);
  }
  return null;
}

function astJobsWritePropertiesEntries(scriptProperties, entries = {}) {
  const source = astJobsIsPlainObject(entries) ? entries : {};
  const keys = Object.keys(source);
  if (keys.length === 0) {
    return;
  }

  if (typeof scriptProperties.setProperties === 'function') {
    scriptProperties.setProperties(source, false);
    return;
  }

  if (typeof scriptProperties.setProperty === 'function') {
    keys.forEach(key => {
      scriptProperties.setProperty(key, source[key]);
    });
    return;
  }

  throw new AstJobsCapabilityError('Script properties store does not support writes');
}

function astJobsAcquireScriptLock(lockTimeoutMs) {
  if (
    typeof LockService === 'undefined' ||
    !LockService ||
    typeof LockService.getScriptLock !== 'function'
  ) {
    return null;
  }

  const lock = LockService.getScriptLock();
  if (!lock || typeof lock.tryLock !== 'function') {
    return null;
  }

  const timeoutMs = astJobsNormalizePositiveInt(
    lockTimeoutMs,
    AST_JOBS_DEFAULT_LOCK_TIMEOUT_MS,
    1,
    60000
  );

  if (!lock.tryLock(timeoutMs)) {
    throw new AstJobsConflictError('Could not acquire jobs script lock', {
      lockTimeoutMs: timeoutMs
    });
  }

  return lock;
}

function astJobsReleaseScriptLock(lock) {
  if (!lock || typeof lock.releaseLock !== 'function') {
    return;
  }

  try {
    lock.releaseLock();
  } catch (_error) {
    // Best effort release.
  }
}

function astJobsWithScriptLock(lockTimeoutMs, callback) {
  const lock = astJobsAcquireScriptLock(lockTimeoutMs);
  try {
    return callback();
  } finally {
    astJobsReleaseScriptLock(lock);
  }
}

function astJobsReadPrefixRegistry(scriptProperties) {
  const parsed = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, AST_JOBS_PREFIX_REGISTRY_KEY));
  if (!parsed || !Array.isArray(parsed.prefixes)) {
    return [];
  }

  const seen = new Set();
  const prefixes = [];
  for (let idx = 0; idx < parsed.prefixes.length; idx += 1) {
    const prefix = astJobsNormalizeString(parsed.prefixes[idx], null);
    if (!prefix || seen.has(prefix)) {
      continue;
    }
    seen.add(prefix);
    prefixes.push(prefix);
  }

  return prefixes;
}

function astJobsWritePrefixRegistry(scriptProperties, prefixes) {
  const seen = new Set();
  const normalized = [];
  for (let idx = 0; idx < prefixes.length; idx += 1) {
    const prefix = astJobsNormalizeString(prefixes[idx], null);
    if (!prefix || seen.has(prefix)) {
      continue;
    }
    seen.add(prefix);
    normalized.push(prefix);
  }

  astJobsWritePropertiesEntries(scriptProperties, {
    [AST_JOBS_PREFIX_REGISTRY_KEY]: JSON.stringify({
      prefixes: normalized
    })
  });
}

function astJobsRegisterPropertyPrefix(scriptProperties, propertyPrefix) {
  const normalizedPrefix = astJobsNormalizeString(propertyPrefix, null);
  if (!normalizedPrefix) {
    return;
  }

  const existing = astJobsReadPrefixRegistry(scriptProperties);
  if (existing.includes(normalizedPrefix)) {
    return;
  }

  existing.push(normalizedPrefix);
  astJobsWritePrefixRegistry(scriptProperties, existing);
}

function astJobsReadIndexBucket(scriptProperties, propertyPrefix, bucketId) {
  const key = astJobsBuildIndexBucketKey(propertyPrefix, bucketId);
  const parsed = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, key));
  if (!parsed || !astJobsIsPlainObject(parsed.items)) {
    return {};
  }
  return parsed.items;
}

function astJobsWriteIndexBucket(scriptProperties, propertyPrefix, bucketId, items) {
  const key = astJobsBuildIndexBucketKey(propertyPrefix, bucketId);
  const payload = JSON.stringify({
    items: astJobsIsPlainObject(items) ? items : {}
  });

  astJobsWritePropertiesEntries(scriptProperties, {
    [key]: payload
  });
}

function astJobsBuildJobSummary(job, propertyPrefix, propertyKey) {
  const normalizedPrefix = astJobsNormalizeString(propertyPrefix, AST_JOBS_DEFAULT_OPTIONS.propertyPrefix);
  const normalizedPropertyKey = astJobsNormalizeString(
    propertyKey,
    astJobsBuildPropertyKey(astJobsNormalizeJobId(job.id), normalizedPrefix)
  );
  const bucketId = astJobsBuildIndexBucketId(job.id);

  return {
    id: job.id,
    name: astJobsNormalizeString(job.name, ''),
    status: astJobsNormalizeString(job.status, 'queued'),
    createdAt: astJobsNormalizeString(job.createdAt, ''),
    updatedAt: astJobsNormalizeString(job.updatedAt, ''),
    propertyPrefix: normalizedPrefix,
    propertyKey: normalizedPropertyKey,
    version: astJobsNormalizeJobVersion(job.version, 0),
    indexBucket: bucketId
  };
}

function astJobsUpsertJobIndexes(job, propertyPrefix, propertyKey, scriptProperties) {
  const summary = astJobsBuildJobSummary(job, propertyPrefix, propertyKey);
  const bucketItems = astJobsReadIndexBucket(
    scriptProperties,
    summary.propertyPrefix,
    summary.indexBucket
  );

  bucketItems[job.id] = summary;

  astJobsRegisterPropertyPrefix(scriptProperties, summary.propertyPrefix);
  astJobsWriteIndexBucket(
    scriptProperties,
    summary.propertyPrefix,
    summary.indexBucket,
    bucketItems
  );

  astJobsWritePropertiesEntries(scriptProperties, {
    [astJobsBuildLocatorKey(job.id)]: JSON.stringify(summary)
  });
}

function astJobsReadJobFromPropertyKey(scriptProperties, propertyKey) {
  const parsed = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, propertyKey));
  if (!parsed || !astJobsLooksLikeJobRecord(parsed)) {
    return null;
  }
  return parsed;
}

function astJobsResolveJobLocation(jobId, executionOptions, options = {}, scriptProperties) {
  const explicitPrefix = astJobsNormalizeString(options.propertyPrefix, null);
  if (explicitPrefix) {
    return {
      propertyPrefix: executionOptions.propertyPrefix,
      propertyKey: astJobsBuildPropertyKey(jobId, executionOptions.propertyPrefix),
      fromLocator: false
    };
  }

  const locator = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, astJobsBuildLocatorKey(jobId)));
  if (
    locator &&
    astJobsNormalizeString(locator.propertyPrefix, null) &&
    astJobsNormalizeString(locator.propertyKey, null)
  ) {
    return {
      propertyPrefix: locator.propertyPrefix,
      propertyKey: locator.propertyKey,
      fromLocator: true
    };
  }

  return {
    propertyPrefix: executionOptions.propertyPrefix,
    propertyKey: astJobsBuildPropertyKey(jobId, executionOptions.propertyPrefix),
    fromLocator: false
  };
}

function astJobsReadJobRecord(jobId, options = {}) {
  const normalizedJobId = astJobsNormalizeJobId(jobId);
  const executionOptions = astJobsResolveExecutionOptions(options);
  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const location = astJobsResolveJobLocation(normalizedJobId, executionOptions, options, scriptProperties);
  const parsed = astJobsReadJobFromPropertyKey(scriptProperties, location.propertyKey);

  if (parsed) {
    parsed.version = astJobsNormalizeJobVersion(parsed.version, 0);
    return astJobsCloneSerializable(parsed);
  }

  throw new AstJobsNotFoundError('Job not found', {
    jobId: normalizedJobId
  });
}

function astJobsWriteJobRecordCas(job, expectedVersion = null, options = {}) {
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
  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const lockTimeoutMs = astJobsResolveLockTimeoutMs(options);
  const normalizedExpectedVersion = expectedVersion == null
    ? null
    : astJobsNormalizeJobVersion(expectedVersion, null);

  if (expectedVersion != null && normalizedExpectedVersion == null) {
    throw new AstJobsValidationError('expectedVersion must be a non-negative integer when provided', {
      expectedVersion
    });
  }

  return astJobsWithScriptLock(lockTimeoutMs, () => {
    const existing = astJobsReadJobFromPropertyKey(scriptProperties, propertyKey);
    const currentVersion = astJobsNormalizeJobVersion(existing && existing.version, 0);

    if (normalizedExpectedVersion != null && currentVersion !== normalizedExpectedVersion) {
      throw new AstJobsConflictError('Job record version conflict', {
        jobId: normalizedJobId,
        expectedVersion: normalizedExpectedVersion,
        actualVersion: currentVersion
      });
    }

    const persisted = astJobsCloneSerializable(job);
    persisted.id = normalizedJobId;
    persisted.version = currentVersion + 1;
    persisted.options = astJobsIsPlainObject(persisted.options) ? persisted.options : {};
    persisted.options.propertyPrefix = executionOptions.propertyPrefix;

    let serialized;
    try {
      serialized = JSON.stringify(persisted);
    } catch (error) {
      throw new AstJobsValidationError('Job record must be JSON serializable', {
        jobId: normalizedJobId
      }, error);
    }

    astJobsWritePropertiesEntries(scriptProperties, {
      [propertyKey]: serialized
    });
    astJobsUpsertJobIndexes(persisted, executionOptions.propertyPrefix, propertyKey, scriptProperties);

    job.version = persisted.version;
    job.options = astJobsIsPlainObject(job.options) ? job.options : {};
    job.options.propertyPrefix = executionOptions.propertyPrefix;

    return astJobsCloneSerializable(persisted);
  });
}

function astJobsWriteJobRecord(job, options = {}) {
  const expectedVersion = astJobsNormalizeJobVersion(job && job.version, null);
  return astJobsWriteJobRecordCas(job, expectedVersion, options);
}

function astJobsFindJobRecordInAllProperties(jobId, options = {}) {
  try {
    const normalizedJobId = astJobsNormalizeJobId(jobId);
    const executionOptions = astJobsResolveExecutionOptions(options);
    const scriptProperties = astJobsGetScriptPropertiesHandle();
    const location = astJobsResolveJobLocation(normalizedJobId, executionOptions, options, scriptProperties);
    const parsed = astJobsReadJobFromPropertyKey(scriptProperties, location.propertyKey);

    if (!parsed) {
      return null;
    }

    return {
      propertyKey: location.propertyKey,
      job: astJobsCloneSerializable(parsed)
    };
  } catch (_error) {
    return null;
  }
}

function astJobsResolveListPrefixes(scriptProperties, executionOptions, options = {}) {
  const explicitPrefix = astJobsNormalizeString(options.propertyPrefix, null);
  if (explicitPrefix) {
    return [executionOptions.propertyPrefix];
  }

  const registry = astJobsReadPrefixRegistry(scriptProperties);
  if (registry.length === 0) {
    return [executionOptions.propertyPrefix];
  }

  if (!registry.includes(executionOptions.propertyPrefix)) {
    registry.push(executionOptions.propertyPrefix);
  }

  return registry;
}

function astJobsCollectBucketSummaries(
  scriptProperties,
  propertyPrefix,
  normalizedFilters,
  dedupeMap
) {
  for (let bucketId = 0; bucketId < AST_JOBS_INDEX_BUCKET_COUNT; bucketId += 1) {
    const items = astJobsReadIndexBucket(scriptProperties, propertyPrefix, bucketId);
    const ids = Object.keys(items);

    for (let idx = 0; idx < ids.length; idx += 1) {
      const id = ids[idx];
      const summary = items[id];
      if (!astJobsIsPlainObject(summary)) {
        continue;
      }

      if (normalizedFilters.status && summary.status !== normalizedFilters.status) {
        continue;
      }

      if (normalizedFilters.name && summary.name !== normalizedFilters.name) {
        continue;
      }

      const existing = dedupeMap[id];
      if (!existing) {
        dedupeMap[id] = summary;
        continue;
      }

      const existingUpdated = astJobsNormalizeString(existing.updatedAt, '');
      const incomingUpdated = astJobsNormalizeString(summary.updatedAt, '');
      if (incomingUpdated > existingUpdated) {
        dedupeMap[id] = summary;
      }
    }
  }
}

function astJobsListJobRecords(filters = {}, options = {}) {
  const normalizedFilters = astJobsValidateListFilters(filters);
  const executionOptions = astJobsResolveExecutionOptions(options);
  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const prefixes = astJobsResolveListPrefixes(scriptProperties, executionOptions, options);
  const dedupeSummaries = {};
  const output = [];

  for (let idx = 0; idx < prefixes.length; idx += 1) {
    astJobsCollectBucketSummaries(
      scriptProperties,
      prefixes[idx],
      normalizedFilters,
      dedupeSummaries
    );
  }

  const summaries = Object.keys(dedupeSummaries).map(id => dedupeSummaries[id]);
  summaries.sort((left, right) => {
    const leftCreatedAt = astJobsNormalizeString(left && left.createdAt, '');
    const rightCreatedAt = astJobsNormalizeString(right && right.createdAt, '');
    if (leftCreatedAt === rightCreatedAt) {
      return 0;
    }
    return leftCreatedAt < rightCreatedAt ? 1 : -1;
  });

  for (let idx = 0; idx < summaries.length; idx += 1) {
    if (output.length >= normalizedFilters.limit) {
      break;
    }

    const summary = summaries[idx];
    const propertyKey = astJobsNormalizeString(summary && summary.propertyKey, null);
    if (!propertyKey) {
      continue;
    }

    const record = astJobsReadJobFromPropertyKey(scriptProperties, propertyKey);
    if (!record) {
      continue;
    }

    if (normalizedFilters.status && record.status !== normalizedFilters.status) {
      continue;
    }

    if (normalizedFilters.name && record.name !== normalizedFilters.name) {
      continue;
    }

    record.version = astJobsNormalizeJobVersion(record.version, 0);
    output.push(astJobsCloneSerializable(record));
  }

  return output;
}

function astJobsIsLeaseActive(job, nowMs = new Date().getTime()) {
  const owner = astJobsNormalizeString(job && job.leaseOwner, null);
  if (!owner) {
    return false;
  }

  const leaseExpiresAtMs = new Date(job.leaseExpiresAt || '').getTime();
  if (!Number.isFinite(leaseExpiresAtMs)) {
    return false;
  }

  return leaseExpiresAtMs > nowMs;
}

function astJobsApplyLeaseState(job, workerId, leaseTtlMs) {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAtIso = new Date(now.getTime() + leaseTtlMs).toISOString();

  job.leaseOwner = workerId;
  job.leaseExpiresAt = expiresAtIso;
  job.lastHeartbeatAt = nowIso;
  job.updatedAt = nowIso;
}

function astJobsClearLeaseState(job) {
  job.leaseOwner = null;
  job.leaseExpiresAt = null;
  job.lastHeartbeatAt = null;
}

function astJobsAcquireLease(jobId, workerId, leaseTtlMs, options = {}) {
  const normalizedWorkerId = astJobsNormalizeString(workerId, null);
  if (!normalizedWorkerId) {
    throw new AstJobsValidationError('workerId is required to acquire a job lease');
  }

  const normalizedLeaseTtlMs = astJobsNormalizePositiveInt(
    leaseTtlMs,
    AST_JOBS_DEFAULT_OPTIONS.leaseTtlMs,
    1000,
    600000
  );

  const job = astJobsReadJobRecord(jobId, options);
  const nowMs = new Date().getTime();
  if (astJobsIsLeaseActive(job, nowMs) && job.leaseOwner !== normalizedWorkerId) {
    throw new AstJobsConflictError('Job lease is already held by another worker', {
      jobId: job.id,
      workerId: normalizedWorkerId,
      leaseOwner: job.leaseOwner,
      leaseExpiresAt: job.leaseExpiresAt
    });
  }

  astJobsApplyLeaseState(job, normalizedWorkerId, normalizedLeaseTtlMs);
  return astJobsWriteJobRecordCas(job, job.version, {
    propertyPrefix: job.options && job.options.propertyPrefix,
    lockTimeoutMs: options.lockTimeoutMs
  });
}

function astJobsRenewLease(jobId, workerId, leaseTtlMs, options = {}) {
  const normalizedWorkerId = astJobsNormalizeString(workerId, null);
  if (!normalizedWorkerId) {
    throw new AstJobsValidationError('workerId is required to renew a job lease');
  }

  const normalizedLeaseTtlMs = astJobsNormalizePositiveInt(
    leaseTtlMs,
    AST_JOBS_DEFAULT_OPTIONS.leaseTtlMs,
    1000,
    600000
  );

  const job = astJobsReadJobRecord(jobId, options);
  const nowMs = new Date().getTime();
  if (job.leaseOwner !== normalizedWorkerId) {
    if (astJobsIsLeaseActive(job, nowMs)) {
      throw new AstJobsConflictError('Cannot renew lease owned by a different worker', {
        jobId: job.id,
        workerId: normalizedWorkerId,
        leaseOwner: job.leaseOwner
      });
    }

    throw new AstJobsConflictError('Cannot renew an expired or unowned lease', {
      jobId: job.id,
      workerId: normalizedWorkerId,
      leaseOwner: job.leaseOwner
    });
  }

  astJobsApplyLeaseState(job, normalizedWorkerId, normalizedLeaseTtlMs);
  return astJobsWriteJobRecordCas(job, job.version, {
    propertyPrefix: job.options && job.options.propertyPrefix,
    lockTimeoutMs: options.lockTimeoutMs
  });
}

function astJobsReleaseLease(jobId, workerId, options = {}) {
  const normalizedWorkerId = astJobsNormalizeString(workerId, null);
  if (!normalizedWorkerId) {
    throw new AstJobsValidationError('workerId is required to release a job lease');
  }

  const job = astJobsReadJobRecord(jobId, options);
  const nowMs = new Date().getTime();

  if (!astJobsNormalizeString(job.leaseOwner, null)) {
    return astJobsCloneSerializable(job);
  }

  if (job.leaseOwner !== normalizedWorkerId && astJobsIsLeaseActive(job, nowMs)) {
    throw new AstJobsConflictError('Cannot release lease owned by another worker', {
      jobId: job.id,
      workerId: normalizedWorkerId,
      leaseOwner: job.leaseOwner
    });
  }

  astJobsClearLeaseState(job);
  job.updatedAt = new Date().toISOString();
  return astJobsWriteJobRecordCas(job, job.version, {
    propertyPrefix: job.options && job.options.propertyPrefix,
    lockTimeoutMs: options.lockTimeoutMs
  });
}

const __astJobsStoreRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsStoreRoot.astJobsGetRuntimeConfig = astJobsGetRuntimeConfig;
__astJobsStoreRoot.astJobsSetRuntimeConfig = astJobsSetRuntimeConfig;
__astJobsStoreRoot.astJobsClearRuntimeConfig = astJobsClearRuntimeConfig;
__astJobsStoreRoot.astJobsResolveExecutionOptions = astJobsResolveExecutionOptions;
__astJobsStoreRoot.astJobsReadJobRecord = astJobsReadJobRecord;
__astJobsStoreRoot.astJobsWriteJobRecord = astJobsWriteJobRecord;
__astJobsStoreRoot.astJobsWriteJobRecordCas = astJobsWriteJobRecordCas;
__astJobsStoreRoot.astJobsListJobRecords = astJobsListJobRecords;
__astJobsStoreRoot.astJobsFindJobRecordInAllProperties = astJobsFindJobRecordInAllProperties;
__astJobsStoreRoot.astJobsAcquireLease = astJobsAcquireLease;
__astJobsStoreRoot.astJobsRenewLease = astJobsRenewLease;
__astJobsStoreRoot.astJobsReleaseLease = astJobsReleaseLease;
this.astJobsGetRuntimeConfig = astJobsGetRuntimeConfig;
this.astJobsSetRuntimeConfig = astJobsSetRuntimeConfig;
this.astJobsClearRuntimeConfig = astJobsClearRuntimeConfig;
this.astJobsResolveExecutionOptions = astJobsResolveExecutionOptions;
this.astJobsReadJobRecord = astJobsReadJobRecord;
this.astJobsWriteJobRecord = astJobsWriteJobRecord;
this.astJobsWriteJobRecordCas = astJobsWriteJobRecordCas;
this.astJobsListJobRecords = astJobsListJobRecords;
this.astJobsFindJobRecordInAllProperties = astJobsFindJobRecordInAllProperties;
this.astJobsAcquireLease = astJobsAcquireLease;
this.astJobsRenewLease = astJobsRenewLease;
this.astJobsReleaseLease = astJobsReleaseLease;
