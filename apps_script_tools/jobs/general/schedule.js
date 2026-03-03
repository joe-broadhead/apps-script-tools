function astJobsScheduleClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function astJobsResolveTriggersApi() {
  if (typeof AST_TRIGGERS !== 'undefined' && AST_TRIGGERS && typeof AST_TRIGGERS.run === 'function') {
    return AST_TRIGGERS;
  }

  if (typeof AST !== 'undefined' && AST && AST.Triggers && typeof AST.Triggers.run === 'function') {
    return AST.Triggers;
  }

  throw new AstJobsCapabilityError('AST.Triggers is required for AST.Jobs.schedule');
}

function astJobsScheduleStableSerialize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => astJobsScheduleStableSerialize(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(key => `${JSON.stringify(key)}:${astJobsScheduleStableSerialize(value[key])}`);
  return `{${entries.join(',')}}`;
}

function astJobsScheduleHash(value) {
  if (typeof astJobsHashString === 'function') {
    return String(astJobsHashString(value));
  }

  const text = String(value || '');
  let hash = 2166136261;
  for (let idx = 0; idx < text.length; idx += 1) {
    hash ^= text.charCodeAt(idx);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(16);
}

function astJobsBuildScheduleTriggerId(normalizedRequest) {
  if (normalizedRequest.id) {
    return normalizedRequest.id;
  }

  const signature = astJobsScheduleStableSerialize({
    schedule: normalizedRequest.schedule,
    autoResumeJobs: normalizedRequest.autoResumeJobs,
    job: {
      name: normalizedRequest.job.name,
      steps: normalizedRequest.job.steps,
      options: normalizedRequest.job.options
    }
  });
  return `jobs_schedule_${astJobsScheduleHash(signature).slice(0, 16)}`;
}

function astJobsBuildTriggerDispatchJob(normalizedJob) {
  return {
    name: normalizedJob.name,
    steps: normalizedJob.steps.map(step => ({
      id: step.id,
      handler: step.handlerName,
      dependsOn: step.dependsOn.slice(),
      payload: step.payload
    })),
    options: astJobsCloneObject(normalizedJob.options)
  };
}

function astJobsBuildScheduleMetadata(normalizedRequest) {
  const metadata = astJobsIsPlainObject(normalizedRequest.metadata)
    ? astJobsScheduleClone(normalizedRequest.metadata)
    : {};
  const bridgeMeta = astJobsIsPlainObject(metadata.astJobs)
    ? astJobsScheduleClone(metadata.astJobs)
    : {};
  bridgeMeta.bridge = 'schedule';
  bridgeMeta.jobName = normalizedRequest.job.name;
  metadata.astJobs = bridgeMeta;
  return metadata;
}

function astJobsBuildScheduleUpsertRequest(normalizedRequest) {
  return {
    operation: 'upsert',
    id: astJobsBuildScheduleTriggerId(normalizedRequest),
    enabled: normalizedRequest.enabled,
    schedule: astJobsScheduleClone(normalizedRequest.schedule),
    metadata: astJobsBuildScheduleMetadata(normalizedRequest),
    dispatch: {
      mode: 'jobs',
      autoResumeJobs: normalizedRequest.autoResumeJobs,
      job: astJobsBuildTriggerDispatchJob(normalizedRequest.job)
    },
    options: {
      dryRun: normalizedRequest.dryRun
    }
  };
}

function astJobsBuildScheduleForwardRequest(normalizedRequest) {
  const output = {
    operation: normalizedRequest.operation
  };

  if (normalizedRequest.id) {
    output.id = normalizedRequest.id;
  }
  if (normalizedRequest.triggerUid) {
    output.triggerUid = normalizedRequest.triggerUid;
  }
  if (normalizedRequest.operation === 'list') {
    output.limit = normalizedRequest.limit;
    output.includeOrphans = normalizedRequest.includeOrphans;
  }
  if (normalizedRequest.dryRun) {
    output.options = {
      dryRun: true
    };
  }

  return output;
}

function astJobsSchedule(request = {}) {
  const normalizedRequest = astJobsValidateScheduleRequest(request);
  const triggersApi = astJobsResolveTriggersApi();

  const triggerRequest = normalizedRequest.operation === 'upsert'
    ? astJobsBuildScheduleUpsertRequest(normalizedRequest)
    : astJobsBuildScheduleForwardRequest(normalizedRequest);

  const triggerResponse = triggersApi.run(triggerRequest);

  if (normalizedRequest.operation !== 'upsert') {
    return {
      status: 'ok',
      operation: normalizedRequest.operation,
      request: triggerRequest,
      result: triggerResponse
    };
  }

  return {
    status: 'ok',
    operation: 'upsert',
    triggerId: triggerRequest.id,
    request: triggerRequest,
    result: triggerResponse
  };
}

const __astJobsScheduleRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsScheduleRoot.astJobsSchedule = astJobsSchedule;
this.astJobsSchedule = astJobsSchedule;
