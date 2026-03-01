function astJobsCloneSerializableOrchestrationValue(value, label, details = {}) {
  const normalizedLabel = astJobsNormalizeString(label, 'value');

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    throw new AstJobsValidationError(`${normalizedLabel} must be JSON serializable`, details, error);
  }
}

function astJobsBuildWindowDependencyIds(stepIds, index, maxConcurrency) {
  if (index < maxConcurrency) {
    return [];
  }

  return [stepIds[index - maxConcurrency]];
}

function astJobsCreateStateCounts() {
  return {
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    canceled: 0
  };
}

function astJobsAggregateStateCounts(job, stepIds) {
  const counts = astJobsCreateStateCounts();
  if (!job || !Array.isArray(job.steps) || !Array.isArray(stepIds)) {
    return counts;
  }

  const include = new Set(stepIds);
  for (let idx = 0; idx < job.steps.length; idx += 1) {
    const step = job.steps[idx];
    if (!step || !include.has(step.id)) {
      continue;
    }

    counts.total += 1;
    const state = astJobsNormalizeString(step.state, 'pending');
    if (Object.prototype.hasOwnProperty.call(counts, state)) {
      counts[state] += 1;
    }
  }

  return counts;
}

function astJobsDeriveAggregatedStatus(counts, parentStatus) {
  if (!counts || counts.total === 0) {
    return astJobsNormalizeString(parentStatus, 'queued');
  }

  if (counts.failed > 0) {
    return 'failed';
  }

  if (counts.running > 0) {
    return 'running';
  }

  if (counts.pending > 0) {
    if (parentStatus === 'queued') {
      return 'queued';
    }
    if (parentStatus === 'paused') {
      return 'paused';
    }
    return 'pending';
  }

  if (counts.canceled === counts.total) {
    return 'canceled';
  }

  if (counts.completed === counts.total) {
    return 'completed';
  }

  return 'mixed';
}

function astJobsNormalizeOrchestrationStageStepIds(stage) {
  if (!astJobsIsPlainObject(stage)) {
    return [];
  }

  if (Array.isArray(stage.stepIds)) {
    return stage.stepIds
      .map(id => astJobsNormalizeString(id, null))
      .filter(Boolean);
  }

  const singleStepId = astJobsNormalizeString(stage.stepId, null);
  return singleStepId ? [singleStepId] : [];
}

function astJobsBuildOrchestrationSummary(job, helper, mode, summaryPlan) {
  const normalizedPlan = astJobsIsPlainObject(summaryPlan) ? summaryPlan : {};
  const childStepIds = Array.isArray(normalizedPlan.childStepIds)
    ? normalizedPlan.childStepIds.map(id => astJobsNormalizeString(id, null)).filter(Boolean)
    : [];
  const stages = astJobsIsPlainObject(normalizedPlan.stages) ? normalizedPlan.stages : {};
  const stageNames = Object.keys(stages).sort();
  const stageSummary = {};

  for (let idx = 0; idx < stageNames.length; idx += 1) {
    const stageName = stageNames[idx];
    const stage = stages[stageName];
    const stepIds = astJobsNormalizeOrchestrationStageStepIds(stage);
    const counts = astJobsAggregateStateCounts(job, stepIds);

    stageSummary[stageName] = {
      status: astJobsDeriveAggregatedStatus(counts, job && job.status),
      counts
    };

    if (astJobsIsPlainObject(stage) && stage.maxConcurrency) {
      stageSummary[stageName].maxConcurrency = stage.maxConcurrency;
    }
  }

  const childCounts = astJobsAggregateStateCounts(job, childStepIds);
  return {
    helper,
    mode,
    parent: {
      jobId: job && job.id ? job.id : null,
      status: job && job.status ? job.status : null
    },
    children: {
      status: astJobsDeriveAggregatedStatus(childCounts, job && job.status),
      counts: childCounts
    },
    stages: stageSummary
  };
}

function astJobsAttachOrchestrationSummary(job, helper, mode, summaryPlan) {
  const clonedJob = astJobsCloneSerializableOrchestrationValue(job, 'job');
  clonedJob.orchestration = astJobsBuildOrchestrationSummary(clonedJob, helper, mode, summaryPlan);
  return clonedJob;
}

function astJobsExecuteOrchestrationJob(request, mode) {
  if (mode === 'enqueue') {
    return astJobsEnqueue(request);
  }
  return astJobsRun(request);
}

function astJobsChain(request = {}) {
  const normalized = astJobsValidateChainRequest(request);
  const steps = [];
  const stepIds = [];

  for (let idx = 0; idx < normalized.tasks.length; idx += 1) {
    const task = normalized.tasks[idx];
    const step = {
      id: task.id,
      handler: task.handlerName,
      payload: typeof task.payload === 'undefined' ? null : task.payload
    };

    if (idx > 0) {
      step.dependsOn = [normalized.tasks[idx - 1].id];
    }

    steps.push(step);
    stepIds.push(task.id);
  }

  const job = astJobsExecuteOrchestrationJob({
    name: normalized.name,
    options: normalized.options,
    steps
  }, normalized.mode);

  return astJobsAttachOrchestrationSummary(job, 'chain', normalized.mode, {
    childStepIds: stepIds,
    stages: {
      chain: {
        stepIds
      }
    }
  });
}

function astJobsBuildItemPayload(item, index, total, sharedPayload, labelPrefix) {
  const payload = {
    item: astJobsCloneSerializableOrchestrationValue(item, `${labelPrefix} item`, {
      index
    }),
    index,
    position: index + 1,
    total
  };

  if (typeof sharedPayload !== 'undefined' && sharedPayload !== null) {
    payload.shared = sharedPayload;
  }

  return payload;
}

function astJobsEnqueueMany(request = {}) {
  const normalized = astJobsValidateEnqueueManyRequest(request);
  const total = normalized.items.length;
  const sharedPayload = typeof normalized.sharedPayload === 'undefined' || normalized.sharedPayload === null
    ? null
    : astJobsCloneSerializableOrchestrationValue(normalized.sharedPayload, 'enqueueMany sharedPayload');
  const stepIds = normalized.items.map((_item, idx) => `${normalized.stepIdPrefix}_${idx + 1}`);
  const steps = [];

  for (let idx = 0; idx < normalized.items.length; idx += 1) {
    const step = {
      id: stepIds[idx],
      handler: normalized.handlerName,
      payload: astJobsBuildItemPayload(
        normalized.items[idx],
        idx,
        total,
        sharedPayload,
        'enqueueMany'
      )
    };

    const dependencies = astJobsBuildWindowDependencyIds(stepIds, idx, normalized.maxConcurrency);
    if (dependencies.length > 0) {
      step.dependsOn = dependencies;
    }

    steps.push(step);
  }

  const job = astJobsExecuteOrchestrationJob({
    name: normalized.name,
    options: normalized.options,
    steps
  }, normalized.mode);

  return astJobsAttachOrchestrationSummary(job, 'enqueue_many', normalized.mode, {
    childStepIds: stepIds,
    stages: {
      items: {
        stepIds,
        maxConcurrency: normalized.maxConcurrency
      }
    }
  });
}

function astJobsMapReduce(request = {}) {
  const normalized = astJobsValidateMapReduceRequest(request);
  const mapSharedPayload = typeof normalized.mapPayload === 'undefined' || normalized.mapPayload === null
    ? null
    : astJobsCloneSerializableOrchestrationValue(normalized.mapPayload, 'mapReduce mapPayload');
  const mapStepIds = normalized.items.map((_item, idx) => `${normalized.mapStepIdPrefix}_${idx + 1}`);
  const reduceStepId = normalized.reduceStepId;
  const mapStepIdSet = new Set(mapStepIds);

  if (mapStepIdSet.has(reduceStepId)) {
    throw new AstJobsValidationError('mapReduce reduce step id must be distinct from generated map step IDs', {
      reduceStepId
    });
  }

  const steps = [];
  for (let idx = 0; idx < normalized.items.length; idx += 1) {
    const mapStep = {
      id: mapStepIds[idx],
      handler: normalized.mapHandlerName,
      payload: astJobsBuildItemPayload(
        normalized.items[idx],
        idx,
        normalized.items.length,
        mapSharedPayload,
        'mapReduce.map'
      )
    };

    const dependencies = astJobsBuildWindowDependencyIds(mapStepIds, idx, normalized.maxConcurrency);
    if (dependencies.length > 0) {
      mapStep.dependsOn = dependencies;
    }
    steps.push(mapStep);
  }

  const reducePayload = {
    mapStepIds: mapStepIds.slice(),
    total: mapStepIds.length
  };
  if (typeof normalized.reducePayload !== 'undefined' && normalized.reducePayload !== null) {
    reducePayload.shared = astJobsCloneSerializableOrchestrationValue(
      normalized.reducePayload,
      'mapReduce reducePayload'
    );
  }

  steps.push({
    id: reduceStepId,
    handler: normalized.reduceHandlerName,
    dependsOn: mapStepIds.slice(),
    payload: reducePayload
  });

  const job = astJobsExecuteOrchestrationJob({
    name: normalized.name,
    options: normalized.options,
    steps
  }, normalized.mode);

  return astJobsAttachOrchestrationSummary(job, 'map_reduce', normalized.mode, {
    childStepIds: mapStepIds,
    stages: {
      map: {
        stepIds: mapStepIds,
        maxConcurrency: normalized.maxConcurrency
      },
      reduce: {
        stepId: reduceStepId
      }
    }
  });
}

const __astJobsOrchestrationRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsOrchestrationRoot.astJobsChain = astJobsChain;
__astJobsOrchestrationRoot.astJobsEnqueueMany = astJobsEnqueueMany;
__astJobsOrchestrationRoot.astJobsMapReduce = astJobsMapReduce;
this.astJobsChain = astJobsChain;
this.astJobsEnqueueMany = astJobsEnqueueMany;
this.astJobsMapReduce = astJobsMapReduce;
