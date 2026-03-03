const AST_JOBS_DLQ_PREFIX_REGISTRY_KEY = 'AST_JOBS_DLQ_PREFIX_REGISTRY';
const AST_JOBS_DLQ_LOCATOR_PREFIX = 'AST_JOBS_DLQ_LOCATOR_';
const AST_JOBS_DLQ_SUFFIX = 'DLQ_';
const AST_JOBS_DLQ_REPLAY_IDEMPOTENCY_PREFIX = 'AST_JOBS_DLQ_REPLAY_IDEMPOTENCY_';

function astJobsDlqNowIso() {
  return new Date().toISOString();
}

function astJobsDlqClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function astJobsBuildDlqPropertyPrefix(propertyPrefix) {
  const normalized = astJobsNormalizeString(propertyPrefix, AST_JOBS_DEFAULT_OPTIONS.propertyPrefix);
  if (normalized.endsWith(AST_JOBS_DLQ_SUFFIX)) {
    return normalized;
  }
  return `${normalized}${AST_JOBS_DLQ_SUFFIX}`;
}

function astJobsBuildDlqPropertyKey(jobId, propertyPrefix) {
  return `${astJobsBuildDlqPropertyPrefix(propertyPrefix)}${astJobsNormalizeJobId(jobId)}`;
}

function astJobsBuildDlqLocatorKey(jobId) {
  return `${AST_JOBS_DLQ_LOCATOR_PREFIX}${astJobsNormalizeJobId(jobId)}`;
}

function astJobsBuildReplayIdempotencyPropertyKey(idempotencyKey, propertyPrefix) {
  return `${astJobsBuildDlqPropertyPrefix(propertyPrefix)}${AST_JOBS_DLQ_REPLAY_IDEMPOTENCY_PREFIX}${astJobsHashString(idempotencyKey)}`;
}

function astJobsIsDlqEntry(value) {
  return (
    astJobsIsPlainObject(value) &&
    astJobsNormalizeString(value.jobId, null) != null &&
    astJobsNormalizeString(value.propertyPrefix, null) != null
  );
}

function astJobsReadDlqPrefixRegistry(scriptProperties) {
  const parsed = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, AST_JOBS_DLQ_PREFIX_REGISTRY_KEY));
  if (!parsed || !Array.isArray(parsed.prefixes)) {
    return [];
  }

  const seen = new Set();
  const output = [];
  for (let idx = 0; idx < parsed.prefixes.length; idx += 1) {
    const prefix = astJobsNormalizeString(parsed.prefixes[idx], null);
    if (!prefix || seen.has(prefix)) {
      continue;
    }
    seen.add(prefix);
    output.push(prefix);
  }
  return output;
}

function astJobsWriteDlqPrefixRegistry(scriptProperties, prefixes) {
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
    [AST_JOBS_DLQ_PREFIX_REGISTRY_KEY]: JSON.stringify({
      prefixes: normalized
    })
  });
}

function astJobsRegisterDlqPrefix(scriptProperties, dlqPropertyPrefix) {
  const normalized = astJobsNormalizeString(dlqPropertyPrefix, null);
  if (!normalized) {
    return;
  }

  const existing = astJobsReadDlqPrefixRegistry(scriptProperties);
  if (existing.includes(normalized)) {
    return;
  }
  existing.push(normalized);
  astJobsWriteDlqPrefixRegistry(scriptProperties, existing);
}

function astJobsBuildDlqSummary(entry, dlqPropertyPrefix, propertyKey) {
  const normalizedJobId = astJobsNormalizeJobId(entry.jobId);
  return {
    jobId: normalizedJobId,
    name: astJobsNormalizeString(entry.name, ''),
    state: astJobsNormalizeString(entry.state, 'queued'),
    movedAt: astJobsNormalizeString(entry.movedAt, ''),
    propertyPrefix: astJobsNormalizeString(entry.propertyPrefix, AST_JOBS_DEFAULT_OPTIONS.propertyPrefix),
    dlqPropertyPrefix: astJobsNormalizeString(dlqPropertyPrefix, astJobsBuildDlqPropertyPrefix(entry.propertyPrefix)),
    propertyKey: astJobsNormalizeString(
      propertyKey,
      astJobsBuildDlqPropertyKey(normalizedJobId, entry.propertyPrefix)
    ),
    indexBucket: astJobsBuildIndexBucketId(normalizedJobId)
  };
}

function astJobsUpsertDlqIndexes(entry, dlqPropertyPrefix, propertyKey, scriptProperties) {
  const summary = astJobsBuildDlqSummary(entry, dlqPropertyPrefix, propertyKey);
  const bucketItems = astJobsReadIndexBucket(
    scriptProperties,
    summary.dlqPropertyPrefix,
    summary.indexBucket
  );
  bucketItems[summary.jobId] = summary;

  astJobsRegisterDlqPrefix(scriptProperties, summary.dlqPropertyPrefix);
  astJobsWriteIndexBucket(
    scriptProperties,
    summary.dlqPropertyPrefix,
    summary.indexBucket,
    bucketItems
  );
  astJobsWritePropertiesEntries(scriptProperties, {
    [astJobsBuildDlqLocatorKey(summary.jobId)]: JSON.stringify({
      dlqPropertyPrefix: summary.dlqPropertyPrefix,
      propertyKey: summary.propertyKey,
      movedAt: summary.movedAt,
      state: summary.state
    })
  });
}

function astJobsReadDlqEntryFromPropertyKey(scriptProperties, propertyKey) {
  const parsed = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, propertyKey));
  return astJobsIsDlqEntry(parsed) ? parsed : null;
}

function astJobsResolveDlqLocation(jobId, options = {}, scriptProperties) {
  const normalizedJobId = astJobsNormalizeJobId(jobId);
  const explicitPrefix = astJobsNormalizeString(options.propertyPrefix, null);
  if (explicitPrefix) {
    return {
      dlqPropertyPrefix: astJobsBuildDlqPropertyPrefix(explicitPrefix),
      propertyKey: astJobsBuildDlqPropertyKey(normalizedJobId, explicitPrefix)
    };
  }

  const locator = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, astJobsBuildDlqLocatorKey(normalizedJobId)));
  if (
    locator &&
    astJobsNormalizeString(locator.dlqPropertyPrefix, null) &&
    astJobsNormalizeString(locator.propertyKey, null)
  ) {
    return {
      dlqPropertyPrefix: locator.dlqPropertyPrefix,
      propertyKey: locator.propertyKey
    };
  }

  const registry = astJobsReadDlqPrefixRegistry(scriptProperties);
  for (let idx = 0; idx < registry.length; idx += 1) {
    const dlqPropertyPrefix = registry[idx];
    const propertyKey = `${dlqPropertyPrefix}${normalizedJobId}`;
    if (astJobsReadDlqEntryFromPropertyKey(scriptProperties, propertyKey)) {
      return {
        dlqPropertyPrefix,
        propertyKey
      };
    }
  }

  const executionOptions = astJobsResolveExecutionOptions(options);
  return {
    dlqPropertyPrefix: astJobsBuildDlqPropertyPrefix(executionOptions.propertyPrefix),
    propertyKey: astJobsBuildDlqPropertyKey(normalizedJobId, executionOptions.propertyPrefix)
  };
}

function astJobsReadDlqEntry(jobId, options = {}) {
  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const location = astJobsResolveDlqLocation(jobId, options, scriptProperties);
  const entry = astJobsReadDlqEntryFromPropertyKey(scriptProperties, location.propertyKey);
  if (!entry) {
    return null;
  }
  return astJobsDlqClone(entry);
}

function astJobsDeletePropertyEntry(scriptProperties, key) {
  if (typeof scriptProperties.deleteProperty === 'function') {
    scriptProperties.deleteProperty(key);
    return;
  }
  if (typeof scriptProperties.setProperty === 'function') {
    scriptProperties.setProperty(key, '');
    return;
  }
  throw new AstJobsCapabilityError('Script properties store does not support deleting properties', {
    key
  });
}

function astJobsRemoveDlqIndexes(jobId, dlqPropertyPrefix, scriptProperties) {
  const normalizedJobId = astJobsNormalizeJobId(jobId);
  const bucketId = astJobsBuildIndexBucketId(normalizedJobId);
  const bucketItems = astJobsReadIndexBucket(scriptProperties, dlqPropertyPrefix, bucketId);
  if (Object.prototype.hasOwnProperty.call(bucketItems, normalizedJobId)) {
    delete bucketItems[normalizedJobId];
    astJobsWriteIndexBucket(scriptProperties, dlqPropertyPrefix, bucketId, bucketItems);
  }
  astJobsDeletePropertyEntry(scriptProperties, astJobsBuildDlqLocatorKey(normalizedJobId));
}

function astJobsWriteDlqEntry(entry, options = {}) {
  if (!astJobsIsDlqEntry(entry)) {
    throw new AstJobsValidationError('DLQ entry must include jobId and propertyPrefix');
  }

  const normalizedEntry = astJobsDlqClone(entry);
  normalizedEntry.jobId = astJobsNormalizeJobId(normalizedEntry.jobId);
  normalizedEntry.propertyPrefix = astJobsNormalizeString(
    normalizedEntry.propertyPrefix,
    AST_JOBS_DEFAULT_OPTIONS.propertyPrefix
  );
  normalizedEntry.name = astJobsNormalizeString(normalizedEntry.name, '');
  normalizedEntry.state = astJobsNormalizeString(normalizedEntry.state, 'queued');
  normalizedEntry.movedAt = astJobsNormalizeString(normalizedEntry.movedAt, astJobsDlqNowIso());
  normalizedEntry.failedAt = astJobsNormalizeString(normalizedEntry.failedAt, normalizedEntry.movedAt);

  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const lockTimeoutMs = astJobsResolveLockTimeoutMs({
    lockTimeoutMs: options.lockTimeoutMs
  });
  const dlqPropertyPrefix = astJobsBuildDlqPropertyPrefix(normalizedEntry.propertyPrefix);
  const propertyKey = astJobsBuildDlqPropertyKey(normalizedEntry.jobId, normalizedEntry.propertyPrefix);

  astJobsWithScriptLock(lockTimeoutMs, () => {
    astJobsWritePropertiesEntries(scriptProperties, {
      [propertyKey]: JSON.stringify(normalizedEntry)
    });
    astJobsUpsertDlqIndexes(normalizedEntry, dlqPropertyPrefix, propertyKey, scriptProperties);
  });

  return astJobsDlqClone(normalizedEntry);
}

function astJobsBuildDlqRetrySummary(job) {
  const attemptsByStep = {};
  const failedStepIds = [];
  let totalAttempts = 0;

  const steps = Array.isArray(job && job.steps) ? job.steps : [];
  for (let idx = 0; idx < steps.length; idx += 1) {
    const step = steps[idx];
    if (!astJobsIsPlainObject(step)) {
      continue;
    }
    const stepId = astJobsNormalizeString(step.id, null);
    if (!stepId) {
      continue;
    }
    const attempts = astJobsNormalizePositiveInt(step.attempts, 0, 0, 1000000);
    attemptsByStep[stepId] = attempts;
    totalAttempts += attempts;
    if (step.state === 'failed') {
      failedStepIds.push(stepId);
    }
  }

  return {
    maxRetries: astJobsNormalizePositiveInt(job && job.options && job.options.maxRetries, 0, 0, 20),
    totalAttempts,
    failedStepIds,
    attemptsByStep
  };
}

function astJobsBuildDlqEntryFromJob(job, existingEntry = null) {
  const previousReplay = astJobsIsPlainObject(existingEntry && existingEntry.replay)
    ? existingEntry.replay
    : {};

  return {
    jobId: astJobsNormalizeJobId(job.id),
    name: astJobsNormalizeString(job.name, ''),
    propertyPrefix: astJobsNormalizeString(
      job && job.options && job.options.propertyPrefix,
      AST_JOBS_DEFAULT_OPTIONS.propertyPrefix
    ),
    sourceStatus: astJobsNormalizeString(job.status, 'failed'),
    failedAt: astJobsNormalizeString(job.updatedAt, astJobsDlqNowIso()),
    movedAt: astJobsNormalizeString(existingEntry && existingEntry.movedAt, astJobsDlqNowIso()),
    state: 'queued',
    lastError: astJobsIsPlainObject(job.lastError) ? astJobsDlqClone(job.lastError) : null,
    retry: astJobsBuildDlqRetrySummary(job),
    replay: {
      count: astJobsNormalizePositiveInt(previousReplay.count, 0, 0, 1000000),
      lastReplayAt: astJobsNormalizeString(previousReplay.lastReplayAt, null),
      lastReplayStatus: astJobsNormalizeString(previousReplay.lastReplayStatus, null),
      lastReplayError: astJobsIsPlainObject(previousReplay.lastReplayError)
        ? astJobsDlqClone(previousReplay.lastReplayError)
        : null,
      lastIdempotencyKey: astJobsNormalizeString(previousReplay.lastIdempotencyKey, null)
    }
  };
}

function astJobsListDlqEntriesInternal(filters = {}, options = {}) {
  const normalizedFilters = astJobsIsPlainObject(filters) ? filters : {};
  const stateFilter = astJobsNormalizeString(normalizedFilters.state, null);
  const nameFilter = astJobsNormalizeString(normalizedFilters.name, null);
  const jobIdFilter = astJobsNormalizeString(normalizedFilters.jobId, null);
  const limit = astJobsNormalizePositiveInt(normalizedFilters.limit, 100, 1, 2000);

  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const explicitPrefix = astJobsNormalizeString(options.propertyPrefix, null);
  const prefixes = explicitPrefix
    ? [astJobsBuildDlqPropertyPrefix(explicitPrefix)]
    : astJobsReadDlqPrefixRegistry(scriptProperties);
  if (!explicitPrefix && prefixes.length === 0) {
    const entries = astJobsReadAllScriptProperties(scriptProperties);
    const keys = Object.keys(entries);
    const discovered = [];
    const seen = new Set();
    for (let idx = 0; idx < keys.length; idx += 1) {
      const propertyKey = keys[idx];
      const parsed = astJobsParseStoredJob(entries[propertyKey]);
      if (!astJobsIsDlqEntry(parsed)) {
        continue;
      }
      const prefix = astJobsBuildDlqPropertyPrefix(parsed.propertyPrefix);
      if (!seen.has(prefix)) {
        seen.add(prefix);
        discovered.push(prefix);
      }
    }
    if (discovered.length > 0) {
      prefixes.push(...discovered);
      try {
        astJobsWriteDlqPrefixRegistry(scriptProperties, discovered);
      } catch (_error) {
        // Best-effort registry bootstrap.
      }
    }
  }
  if (prefixes.length === 0) {
    return [];
  }

  const dedupeSummaries = {};
  for (let pIdx = 0; pIdx < prefixes.length; pIdx += 1) {
    const dlqPrefix = prefixes[pIdx];
    for (let bucketId = 0; bucketId < AST_JOBS_INDEX_BUCKET_COUNT; bucketId += 1) {
      const items = astJobsReadIndexBucket(scriptProperties, dlqPrefix, bucketId);
      const ids = Object.keys(items);
      for (let idx = 0; idx < ids.length; idx += 1) {
        const id = ids[idx];
        const summary = items[id];
        if (!astJobsIsPlainObject(summary)) {
          continue;
        }
        if (stateFilter && summary.state !== stateFilter) {
          continue;
        }
        if (nameFilter && summary.name !== nameFilter) {
          continue;
        }
        if (jobIdFilter && summary.jobId !== jobIdFilter) {
          continue;
        }
        dedupeSummaries[id] = summary;
      }
    }
  }

  const summaries = Object.keys(dedupeSummaries).map(id => dedupeSummaries[id]);
  summaries.sort((left, right) => {
    const leftMoved = astJobsNormalizeString(left && left.movedAt, '');
    const rightMoved = astJobsNormalizeString(right && right.movedAt, '');
    if (leftMoved === rightMoved) {
      return 0;
    }
    return leftMoved < rightMoved ? 1 : -1;
  });

  const output = [];
  for (let idx = 0; idx < summaries.length; idx += 1) {
    if (output.length >= limit) {
      break;
    }
    const summary = summaries[idx];
    const propertyKey = astJobsNormalizeString(summary && summary.propertyKey, null);
    if (!propertyKey) {
      continue;
    }
    const entry = astJobsReadDlqEntryFromPropertyKey(scriptProperties, propertyKey);
    if (!entry) {
      continue;
    }
    if (stateFilter && entry.state !== stateFilter) {
      continue;
    }
    if (nameFilter && entry.name !== nameFilter) {
      continue;
    }
    if (jobIdFilter && entry.jobId !== jobIdFilter) {
      continue;
    }
    output.push(astJobsDlqClone(entry));
  }

  return output;
}

function astJobsMoveToDlq(jobId, options = {}) {
  const normalized = astJobsValidateMoveToDlqRequest(jobId, options);
  const job = astJobsReadJobRecord(normalized.jobId, normalized.options);
  if (job.status !== 'failed') {
    throw new AstJobsConflictError('Only failed jobs can be moved to DLQ', {
      jobId: normalized.jobId,
      status: job.status
    });
  }

  const existingEntry = astJobsReadDlqEntry(normalized.jobId, {
    propertyPrefix: job.options && job.options.propertyPrefix
  });
  const entry = astJobsBuildDlqEntryFromJob(job, existingEntry);
  return astJobsWriteDlqEntry(entry, normalized.options);
}

function astJobsListFailed(filters = {}, options = {}) {
  const normalized = astJobsValidateListFailedFilters(filters);
  const failedJobs = astJobsListJobRecords({
    status: 'failed',
    name: normalized.name,
    limit: normalized.limit
  }, options);

  const output = [];
  for (let idx = 0; idx < failedJobs.length; idx += 1) {
    if (output.length >= normalized.limit) {
      break;
    }

    const job = failedJobs[idx];
    const dlqEntry = astJobsReadDlqEntry(job.id, {
      propertyPrefix: job && job.options && job.options.propertyPrefix
    });
    const inDlq = dlqEntry != null;

    if (normalized.inDlq === 'only' && !inDlq) {
      continue;
    }
    if (normalized.inDlq === 'exclude' && inDlq) {
      continue;
    }
    if (normalized.dlqState && (!dlqEntry || dlqEntry.state !== normalized.dlqState)) {
      continue;
    }

    const item = {
      jobId: job.id,
      name: job.name,
      status: job.status,
      failedAt: astJobsNormalizeString(job.updatedAt, job.createdAt),
      lastError: astJobsIsPlainObject(job.lastError) ? astJobsDlqClone(job.lastError) : null,
      inDlq,
      dlq: dlqEntry
        ? {
          state: dlqEntry.state,
          movedAt: dlqEntry.movedAt,
          replay: astJobsIsPlainObject(dlqEntry.replay) ? astJobsDlqClone(dlqEntry.replay) : null
        }
        : null
    };

    if (normalized.includeJob) {
      item.job = astJobsDlqClone(job);
    }
    output.push(item);
  }

  return output;
}

function astJobsResetJobForReplay(job) {
  const normalized = astJobsDlqClone(job);
  normalized.status = 'paused';
  normalized.pausedAt = astJobsDlqNowIso();
  normalized.lastError = null;
  normalized.leaseOwner = null;
  normalized.leaseExpiresAt = null;
  normalized.lastHeartbeatAt = null;
  normalized.canceledAt = null;
  normalized.completedAt = null;

  const steps = Array.isArray(normalized.steps) ? normalized.steps : [];
  let pendingCount = 0;
  for (let idx = 0; idx < steps.length; idx += 1) {
    const step = steps[idx];
    if (!astJobsIsPlainObject(step)) {
      continue;
    }
    if (step.state === 'completed') {
      continue;
    }

    const previousError = astJobsIsPlainObject(step.lastError) ? astJobsDlqClone(step.lastError) : null;
    if (previousError) {
      const history = Array.isArray(step.failureHistory) ? step.failureHistory.slice() : [];
      history.push({
        attempts: astJobsNormalizePositiveInt(step.attempts, 0, 0, 1000000),
        lastError: previousError,
        recordedAt: astJobsDlqNowIso()
      });
      step.failureHistory = history;
    }

    step.state = 'pending';
    step.attempts = 0;
    step.startedAt = null;
    step.completedAt = null;
    step.lastError = null;
    pendingCount += 1;
  }

  if (pendingCount === 0) {
    throw new AstJobsConflictError('No replayable steps were found for failed job', {
      jobId: normalized.id
    });
  }

  return normalized;
}

function astJobsSerializeDlqError(error) {
  return {
    name: astJobsNormalizeString(error && error.name, 'Error'),
    message: astJobsNormalizeString(error && error.message, 'Unknown error'),
    details: astJobsIsPlainObject(error && error.details) ? astJobsDlqClone(error.details) : {}
  };
}

function astJobsWriteReplayIdempotencyResult(idempotencyKey, result, propertyPrefix) {
  const normalizedKey = astJobsNormalizeString(idempotencyKey, null);
  if (!normalizedKey) {
    return;
  }

  const scriptProperties = astJobsGetScriptPropertiesHandle();
  astJobsWritePropertiesEntries(scriptProperties, {
    [astJobsBuildReplayIdempotencyPropertyKey(normalizedKey, propertyPrefix)]: JSON.stringify({
      idempotencyKey: normalizedKey,
      createdAt: astJobsDlqNowIso(),
      result: astJobsDlqClone(result)
    })
  });
}

function astJobsReadReplayIdempotencyResult(idempotencyKey, propertyPrefix) {
  const normalizedKey = astJobsNormalizeString(idempotencyKey, null);
  if (!normalizedKey) {
    return null;
  }

  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const propertyKey = astJobsBuildReplayIdempotencyPropertyKey(normalizedKey, propertyPrefix);
  const parsed = astJobsParseStoredJob(astJobsReadProperty(scriptProperties, propertyKey));
  if (!parsed || parsed.idempotencyKey !== normalizedKey || !astJobsIsPlainObject(parsed.result)) {
    return null;
  }
  return astJobsDlqClone(parsed.result);
}

function astJobsReplayDlq(request = {}) {
  const normalized = astJobsValidateReplayDlqRequest(request);
  const replayPropertyPrefix = astJobsNormalizeString(
    normalized.propertyPrefix,
    AST_JOBS_DEFAULT_OPTIONS.propertyPrefix
  );

  if (normalized.idempotencyKey) {
    const cached = astJobsReadReplayIdempotencyResult(normalized.idempotencyKey, replayPropertyPrefix);
    if (cached) {
      cached.idempotent = true;
      return cached;
    }
  }

  const dlqEntries = astJobsListDlqEntriesInternal({
    state: 'queued',
    name: normalized.name,
    limit: normalized.limit
  }, {
    propertyPrefix: normalized.propertyPrefix
  });

  const batchSize = Math.min(dlqEntries.length, normalized.limit, normalized.maxConcurrency);
  const selectedEntries = dlqEntries.slice(0, batchSize);
  const items = [];
  let replayedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < selectedEntries.length; idx += 1) {
    const entry = selectedEntries[idx];
    const replayedItem = {
      jobId: entry.jobId,
      beforeState: entry.state,
      resultStatus: 'skipped',
      afterState: entry.state
    };

    try {
      const persisted = astJobsReadJobRecord(entry.jobId, {
        propertyPrefix: entry.propertyPrefix
      });
      if (persisted.status !== 'failed') {
        replayedItem.reason = `Job is not failed (status=${persisted.status})`;
        skippedCount += 1;
        items.push(replayedItem);
        continue;
      }

      const reset = astJobsResetJobForReplay(persisted);
      astJobsWriteJobRecordCas(reset, reset.version, {
        propertyPrefix: reset.options && reset.options.propertyPrefix,
        lockTimeoutMs: normalized.lockTimeoutMs
      });

      const replayedJob = astJobsResume(reset.id, {
        propertyPrefix: reset.options && reset.options.propertyPrefix,
        lockTimeoutMs: normalized.lockTimeoutMs
      });

      const updatedEntry = astJobsReadDlqEntry(entry.jobId, {
        propertyPrefix: entry.propertyPrefix
      }) || entry;
      const replay = astJobsIsPlainObject(updatedEntry.replay) ? updatedEntry.replay : {};
      updatedEntry.replay = {
        count: astJobsNormalizePositiveInt(replay.count, 0, 0, 1000000) + 1,
        lastReplayAt: astJobsDlqNowIso(),
        lastReplayStatus: replayedJob.status,
        lastReplayError: replayedJob.status === 'failed' && astJobsIsPlainObject(replayedJob.lastError)
          ? astJobsDlqClone(replayedJob.lastError)
          : null,
        lastIdempotencyKey: normalized.idempotencyKey || null
      };
      updatedEntry.state = replayedJob.status === 'failed' ? 'queued' : 'replayed';
      if (replayedJob.status === 'failed' && astJobsIsPlainObject(replayedJob.lastError)) {
        updatedEntry.lastError = astJobsDlqClone(replayedJob.lastError);
      }
      astJobsWriteDlqEntry(updatedEntry, {
        propertyPrefix: updatedEntry.propertyPrefix,
        lockTimeoutMs: normalized.lockTimeoutMs
      });

      replayedItem.resultStatus = replayedJob.status;
      replayedItem.afterState = updatedEntry.state;
      replayedItem.jobVersion = replayedJob.version;
      if (replayedJob.status === 'failed') {
        failedCount += 1;
      } else {
        replayedCount += 1;
      }
    } catch (error) {
      failedCount += 1;
      replayedItem.resultStatus = 'error';
      replayedItem.afterState = 'queued';
      replayedItem.error = astJobsSerializeDlqError(error);

      try {
        const failedEntry = astJobsReadDlqEntry(entry.jobId, {
          propertyPrefix: entry.propertyPrefix
        }) || entry;
        const replay = astJobsIsPlainObject(failedEntry.replay) ? failedEntry.replay : {};
        failedEntry.replay = {
          count: astJobsNormalizePositiveInt(replay.count, 0, 0, 1000000) + 1,
          lastReplayAt: astJobsDlqNowIso(),
          lastReplayStatus: 'error',
          lastReplayError: astJobsSerializeDlqError(error),
          lastIdempotencyKey: normalized.idempotencyKey || null
        };
        failedEntry.state = 'queued';
        astJobsWriteDlqEntry(failedEntry, {
          propertyPrefix: failedEntry.propertyPrefix,
          lockTimeoutMs: normalized.lockTimeoutMs
        });
      } catch (_persistError) {
        // Best-effort metadata update.
      }
    }

    items.push(replayedItem);
  }

  const result = {
    status: 'ok',
    idempotent: false,
    request: {
      name: normalized.name,
      limit: normalized.limit,
      maxConcurrency: normalized.maxConcurrency,
      propertyPrefix: normalized.propertyPrefix || null
    },
    processed: selectedEntries.length,
    counts: {
      replayed: replayedCount,
      failed: failedCount,
      skipped: skippedCount
    },
    items
  };

  if (normalized.idempotencyKey) {
    astJobsWriteReplayIdempotencyResult(normalized.idempotencyKey, result, replayPropertyPrefix);
  }

  return result;
}

function astJobsPurgeDlq(request = {}) {
  const normalized = astJobsValidatePurgeDlqRequest(request);
  const stateFilter = normalized.state === 'all' ? null : normalized.state;
  const entries = astJobsListDlqEntriesInternal({
    state: stateFilter,
    name: normalized.name,
    limit: normalized.limit
  }, {
    propertyPrefix: normalized.propertyPrefix
  });

  const scriptProperties = astJobsGetScriptPropertiesHandle();
  const lockTimeoutMs = astJobsResolveLockTimeoutMs({
    lockTimeoutMs: normalized.lockTimeoutMs
  });
  const deletedJobIds = [];

  astJobsWithScriptLock(lockTimeoutMs, () => {
    for (let idx = 0; idx < entries.length; idx += 1) {
      const entry = entries[idx];
      const jobId = astJobsNormalizeJobId(entry.jobId);
      const propertyPrefix = astJobsNormalizeString(entry.propertyPrefix, AST_JOBS_DEFAULT_OPTIONS.propertyPrefix);
      const propertyKey = astJobsBuildDlqPropertyKey(jobId, propertyPrefix);
      const dlqPropertyPrefix = astJobsBuildDlqPropertyPrefix(propertyPrefix);

      astJobsDeletePropertyEntry(scriptProperties, propertyKey);
      astJobsRemoveDlqIndexes(jobId, dlqPropertyPrefix, scriptProperties);
      deletedJobIds.push(jobId);
    }
  });

  return {
    status: 'ok',
    deletedCount: deletedJobIds.length,
    deletedJobIds
  };
}

const __astJobsDlqRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsDlqRoot.astJobsReadDlqEntry = astJobsReadDlqEntry;
__astJobsDlqRoot.astJobsMoveToDlq = astJobsMoveToDlq;
__astJobsDlqRoot.astJobsListFailed = astJobsListFailed;
__astJobsDlqRoot.astJobsReplayDlq = astJobsReplayDlq;
__astJobsDlqRoot.astJobsPurgeDlq = astJobsPurgeDlq;
__astJobsDlqRoot.astJobsListDlqEntriesInternal = astJobsListDlqEntriesInternal;
this.astJobsReadDlqEntry = astJobsReadDlqEntry;
this.astJobsMoveToDlq = astJobsMoveToDlq;
this.astJobsListFailed = astJobsListFailed;
this.astJobsReplayDlq = astJobsReplayDlq;
this.astJobsPurgeDlq = astJobsPurgeDlq;
this.astJobsListDlqEntriesInternal = astJobsListDlqEntriesInternal;
