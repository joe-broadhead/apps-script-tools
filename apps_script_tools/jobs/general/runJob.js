function astJobsNowIso() {
  return new Date().toISOString();
}

function astJobsGenerateJobId() {
  try {
    if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.getUuid === 'function') {
      const uuid = astJobsNormalizeString(Utilities.getUuid(), null);
      if (uuid) {
        return uuid;
      }
    }
  } catch (_error) {
    // Fallback below.
  }

  return `job_${new Date().getTime()}_${Math.floor(Math.random() * 1000000)}`;
}

function astJobsGenerateWorkerId() {
  try {
    if (typeof Utilities !== 'undefined' && Utilities && typeof Utilities.getUuid === 'function') {
      const uuid = astJobsNormalizeString(Utilities.getUuid(), null);
      if (uuid) {
        return `worker_${uuid}`;
      }
    }
  } catch (_error) {
    // Fallback below.
  }

  return `worker_${new Date().getTime()}_${Math.floor(Math.random() * 1000000)}`;
}

function astJobsCloneSerializableValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function astJobsEnsureCheckpointStoreSupported(executionOptions) {
  if (executionOptions.checkpointStore !== 'properties') {
    throw new AstJobsCapabilityError('Only checkpointStore=properties is currently supported', {
      checkpointStore: executionOptions.checkpointStore
    });
  }
}

function astJobsResolveHandler(handlerName) {
  const resolvedName = astJobsNormalizeString(handlerName, null);
  if (!resolvedName) {
    throw new AstJobsValidationError('Step handler name is required');
  }

  const root = typeof globalThis !== 'undefined' ? globalThis : this;
  const handler = root[resolvedName];
  if (typeof handler !== 'function') {
    throw new AstJobsStepExecutionError('Step handler was not found in global scope', {
      handlerName: resolvedName
    });
  }

  return handler;
}

function astJobsCreateStepState(step) {
  return {
    id: step.id,
    handlerName: step.handlerName,
    dependsOn: step.dependsOn.slice(),
    payload: step.payload,
    state: 'pending',
    attempts: 0,
    startedAt: null,
    completedAt: null,
    lastError: null
  };
}

function astJobsCreateJobRecord(normalizedRequest, executionOptions) {
  const now = astJobsNowIso();
  return {
    id: astJobsGenerateJobId(),
    version: 0,
    name: normalizedRequest.name,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    pausedAt: null,
    completedAt: null,
    canceledAt: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastHeartbeatAt: null,
    lastError: null,
    options: executionOptions,
    steps: normalizedRequest.steps.map(astJobsCreateStepState),
    results: {}
  };
}

function astJobsBuildStepsById(job) {
  const output = {};
  for (let idx = 0; idx < job.steps.length; idx += 1) {
    output[job.steps[idx].id] = job.steps[idx];
  }
  return output;
}

function astJobsAreDependenciesCompleted(step, stepsById) {
  for (let idx = 0; idx < step.dependsOn.length; idx += 1) {
    const dependencyId = step.dependsOn[idx];
    const dependency = stepsById[dependencyId];
    if (!dependency || dependency.state !== 'completed') {
      return false;
    }
  }

  return true;
}

function astJobsFindRunnableStep(job) {
  const stepsById = astJobsBuildStepsById(job);

  for (let idx = 0; idx < job.steps.length; idx += 1) {
    const step = job.steps[idx];
    if (step.state !== 'pending') {
      continue;
    }

    if (astJobsAreDependenciesCompleted(step, stepsById)) {
      return step;
    }
  }

  return null;
}

function astJobsSerializeError(error) {
  return {
    name: astJobsNormalizeString(error && error.name, 'Error'),
    message: astJobsNormalizeString(error && error.message, 'Unknown error'),
    details: astJobsIsPlainObject(error && error.details) ? error.details : {}
  };
}

function astJobsBuildStepContext(job, step) {
  return {
    jobId: job.id,
    stepId: step.id,
    name: job.name,
    attempt: step.attempts + 1,
    results: astJobsCloneSerializableValue(job.results),
    payload: step.payload
  };
}

function astJobsNormalizeStepOutput(output, step) {
  const value = typeof output === 'undefined' ? null : output;

  try {
    return astJobsCloneSerializableValue(value);
  } catch (error) {
    throw new AstJobsStepExecutionError('Step handler output must be JSON serializable', {
      stepId: step.id,
      handlerName: step.handlerName
    }, error);
  }
}

function astJobsPersistJob(job, persistOptions = {}) {
  job.updatedAt = astJobsNowIso();
  const persisted = astJobsWriteJobRecordCas(job, job.version, {
    propertyPrefix: job.options && job.options.propertyPrefix,
    lockTimeoutMs: persistOptions.lockTimeoutMs
  });
  job.version = persisted.version;
  return persisted;
}

function astJobsSetPaused(job) {
  job.status = 'paused';
  job.pausedAt = astJobsNowIso();
}

function astJobsSetFailed(job) {
  job.status = 'failed';
}

function astJobsSetCompleted(job) {
  job.status = 'completed';
  job.completedAt = astJobsNowIso();
  job.pausedAt = null;
}

function astJobsExecuteStep(job, step, persistOptions = {}) {
  step.state = 'running';
  if (!step.startedAt) {
    step.startedAt = astJobsNowIso();
  }

  astJobsPersistJob(job, persistOptions);

  try {
    const handler = astJobsResolveHandler(step.handlerName);
    const output = handler(astJobsBuildStepContext(job, step));

    if (output && typeof output.then === 'function') {
      throw new AstJobsStepExecutionError('Async step handlers are not supported', {
        stepId: step.id,
        handlerName: step.handlerName
      });
    }

    const normalizedOutput = astJobsNormalizeStepOutput(output, step);
    step.state = 'completed';
    step.completedAt = astJobsNowIso();
    step.lastError = null;
    job.results[step.id] = normalizedOutput;
    job.lastError = null;
    return true;
  } catch (error) {
    step.attempts += 1;
    step.lastError = astJobsSerializeError(error);
    job.lastError = Object.assign({
      stepId: step.id
    }, step.lastError);

    if (step.attempts > job.options.maxRetries) {
      step.state = 'failed';
      astJobsSetFailed(job);
    } else {
      step.state = 'pending';
      astJobsSetPaused(job);
    }

    return false;
  } finally {
    astJobsPersistJob(job, persistOptions);
  }
}

function astJobsFinalizeWhenNoRunnableStep(job) {
  const hasPending = job.steps.some(step => step.state === 'pending');
  const hasRunning = job.steps.some(step => step.state === 'running');
  const hasFailed = job.steps.some(step => step.state === 'failed');
  const allCompleted = job.steps.every(step => step.state === 'completed');

  if (allCompleted) {
    astJobsSetCompleted(job);
    return;
  }

  if (hasFailed) {
    astJobsSetFailed(job);
    return;
  }

  if (hasPending && !hasRunning) {
    astJobsSetFailed(job);
    job.lastError = {
      name: 'AstJobsConflictError',
      message: 'Job contains pending steps that cannot run due to unmet dependencies',
      details: {}
    };
    return;
  }

  astJobsSetPaused(job);
}

function astJobsResolveLeaseTtlMs(job, requestOptions = {}) {
  return astJobsNormalizePositiveInt(
    requestOptions.leaseTtlMs,
    astJobsNormalizePositiveInt(
      job && job.options && job.options.leaseTtlMs,
      AST_JOBS_DEFAULT_OPTIONS.leaseTtlMs,
      1000,
      600000
    ),
    1000,
    600000
  );
}

function astJobsEnsureResumableStatus(job, normalizedJobId, workerId) {
  if (job.status === 'completed' || job.status === 'canceled') {
    throw new AstJobsConflictError('Job is not resumable in its current state', {
      jobId: normalizedJobId,
      status: job.status
    });
  }

  if (job.status === 'failed') {
    throw new AstJobsConflictError('Job exceeded retry limits and is marked failed', {
      jobId: normalizedJobId,
      status: job.status
    });
  }

  if (job.status === 'running' && job.leaseOwner !== workerId) {
    throw new AstJobsConflictError('Job is already running', {
      jobId: normalizedJobId
    });
  }
}

function astJobsMaybeRenewLease(job, workerId, leaseTtlMs, leaseOptions = {}) {
  const leaseExpiryMs = new Date(job.leaseExpiresAt || '').getTime();
  if (!Number.isFinite(leaseExpiryMs)) {
    return;
  }

  const renewLeadMs = Math.max(1000, Math.floor(leaseTtlMs / 3));
  const nowMs = new Date().getTime();
  if (nowMs < (leaseExpiryMs - renewLeadMs)) {
    return;
  }

  const renewed = astJobsRenewLease(job.id, workerId, leaseTtlMs, leaseOptions);
  job.version = renewed.version;
  job.leaseOwner = renewed.leaseOwner;
  job.leaseExpiresAt = renewed.leaseExpiresAt;
  job.lastHeartbeatAt = renewed.lastHeartbeatAt;
  job.updatedAt = renewed.updatedAt;
}

function astJobsExecutePersistedJob(jobId, options = {}) {
  const normalizedJobId = astJobsNormalizeJobId(jobId);
  const persistOptions = {
    lockTimeoutMs: options.lockTimeoutMs
  };
  const workerId = astJobsNormalizeString(options.workerId, astJobsGenerateWorkerId());

  let job = astJobsReadJobRecord(normalizedJobId, options);
  astJobsEnsureCheckpointStoreSupported(job.options || {});

  const leaseTtlMs = astJobsResolveLeaseTtlMs(job, options);
  const leaseOptions = {
    propertyPrefix: job.options && job.options.propertyPrefix,
    lockTimeoutMs: options.lockTimeoutMs
  };

  job = astJobsAcquireLease(normalizedJobId, workerId, leaseTtlMs, leaseOptions);

  try {
    astJobsEnsureResumableStatus(job, normalizedJobId, workerId);

    if (!job.startedAt) {
      job.startedAt = astJobsNowIso();
    }
    job.pausedAt = null;
    job.status = 'running';
    astJobsPersistJob(job, persistOptions);

    const startedAtMs = new Date().getTime();
    while (true) {
      astJobsMaybeRenewLease(job, workerId, leaseTtlMs, leaseOptions);

      const elapsedMs = new Date().getTime() - startedAtMs;
      if (elapsedMs >= job.options.maxRuntimeMs) {
        astJobsSetPaused(job);
        break;
      }

      const runnableStep = astJobsFindRunnableStep(job);
      if (!runnableStep) {
        astJobsFinalizeWhenNoRunnableStep(job);
        break;
      }

      const succeeded = astJobsExecuteStep(job, runnableStep, persistOptions);
      if (!succeeded) {
        break;
      }
    }

    astJobsPersistJob(job, persistOptions);
    return astJobsCloneSerializableValue(job);
  } finally {
    try {
      astJobsReleaseLease(normalizedJobId, workerId, leaseOptions);
    } catch (_error) {
      // Best effort release to avoid masking primary execution errors.
    }
  }
}

function astJobsRun(request = {}) {
  const normalizedRequest = astJobsValidateRunRequest(request);
  const executionOptions = astJobsResolveExecutionOptions(normalizedRequest.options);
  astJobsEnsureCheckpointStoreSupported(executionOptions);

  const job = astJobsCreateJobRecord(normalizedRequest, executionOptions);
  astJobsWriteJobRecordCas(job, 0, {
    propertyPrefix: executionOptions.propertyPrefix
  });

  return astJobsExecutePersistedJob(job.id, {
    propertyPrefix: executionOptions.propertyPrefix,
    leaseTtlMs: executionOptions.leaseTtlMs
  });
}

function astJobsEnqueue(request = {}) {
  const normalizedRequest = astJobsValidateEnqueueRequest(request);
  const executionOptions = astJobsResolveExecutionOptions(normalizedRequest.options);
  astJobsEnsureCheckpointStoreSupported(executionOptions);

  const job = astJobsCreateJobRecord(normalizedRequest, executionOptions);
  astJobsWriteJobRecordCas(job, 0, {
    propertyPrefix: executionOptions.propertyPrefix
  });

  return astJobsCloneSerializableValue(job);
}

const __astJobsRunRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsRunRoot.astJobsRun = astJobsRun;
__astJobsRunRoot.astJobsEnqueue = astJobsEnqueue;
__astJobsRunRoot.astJobsExecutePersistedJob = astJobsExecutePersistedJob;
this.astJobsRun = astJobsRun;
this.astJobsEnqueue = astJobsEnqueue;
this.astJobsExecutePersistedJob = astJobsExecutePersistedJob;
