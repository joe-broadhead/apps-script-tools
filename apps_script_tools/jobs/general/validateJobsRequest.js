const AST_JOBS_ALLOWED_STATUSES = Object.freeze([
  'queued',
  'running',
  'paused',
  'failed',
  'completed',
  'canceled'
]);

const AST_JOBS_ORCHESTRATION_ALLOWED_MODES = Object.freeze([
  'run',
  'enqueue'
]);

const AST_JOBS_ORCHESTRATION_MAX_ITEMS = 5000;
const AST_JOBS_ORCHESTRATION_DEFAULT_MAX_CONCURRENCY = 10;
const AST_JOBS_ORCHESTRATION_MAX_CONCURRENCY = 1000;

const AST_JOBS_DEFAULT_OPTIONS = Object.freeze({
  maxRetries: 2,
  maxRuntimeMs: 240000,
  leaseTtlMs: 120000,
  checkpointStore: 'properties',
  autoResume: true,
  propertyPrefix: 'AST_JOBS_JOB_'
});

function astJobsIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astJobsNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astJobsNormalizePositiveInt(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < min) {
    return fallback;
  }

  const floored = Math.floor(normalized);
  return Math.min(max, floored);
}

function astJobsCloneObject(value) {
  if (!astJobsIsPlainObject(value)) {
    return {};
  }

  return Object.assign({}, value);
}

function astJobsNormalizeJobId(jobId, label = 'jobId') {
  const normalized = astJobsNormalizeString(jobId, null);
  if (!normalized) {
    throw new AstJobsValidationError(`Missing required ${label}`);
  }

  return normalized;
}

function astJobsResolveHandlerName(handler, stepId) {
  if (typeof handler === 'string') {
    const handlerName = astJobsNormalizeString(handler, null);
    if (handlerName) {
      return handlerName;
    }
  }

  if (typeof handler === 'function') {
    const handlerName = astJobsNormalizeString(handler.name, null);
    if (handlerName) {
      return handlerName;
    }
  }

  throw new AstJobsValidationError('Step handler must be a global function name string or a named function', {
    stepId
  });
}

function astJobsNormalizeStepDependencies(dependsOn, stepId) {
  if (dependsOn == null) {
    return [];
  }

  const source = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
  const unique = new Set();
  const output = [];

  for (let idx = 0; idx < source.length; idx += 1) {
    const dependency = astJobsNormalizeString(source[idx], null);
    if (!dependency) {
      throw new AstJobsValidationError('Step dependency IDs must be non-empty strings', {
        stepId,
        index: idx
      });
    }

    if (dependency === stepId) {
      throw new AstJobsValidationError('A step cannot depend on itself', {
        stepId
      });
    }

    if (unique.has(dependency)) {
      continue;
    }

    unique.add(dependency);
    output.push(dependency);
  }

  return output;
}

function astJobsValidateDependencyGraph(steps) {
  const stepsById = {};
  const visiting = new Set();
  const visited = new Set();

  for (let idx = 0; idx < steps.length; idx += 1) {
    stepsById[steps[idx].id] = steps[idx];
  }

  const visit = stepId => {
    if (visited.has(stepId)) {
      return;
    }

    if (visiting.has(stepId)) {
      throw new AstJobsValidationError('Detected a dependency cycle in job steps', {
        stepId
      });
    }

    visiting.add(stepId);
    const step = stepsById[stepId];

    for (let depIdx = 0; depIdx < step.dependsOn.length; depIdx += 1) {
      const dependencyId = step.dependsOn[depIdx];
      if (!stepsById[dependencyId]) {
        throw new AstJobsValidationError('Step dependency references an unknown step', {
          stepId,
          dependencyId
        });
      }

      visit(dependencyId);
    }

    visiting.delete(stepId);
    visited.add(stepId);
  };

  Object.keys(stepsById).forEach(visit);
}

function astJobsNormalizeOptions(options = {}) {
  if (!astJobsIsPlainObject(options)) {
    throw new AstJobsValidationError('Job options must be an object');
  }

  const normalized = {};

  if (typeof options.maxRetries !== 'undefined') {
    normalized.maxRetries = astJobsNormalizePositiveInt(
      options.maxRetries,
      AST_JOBS_DEFAULT_OPTIONS.maxRetries,
      0,
      20
    );
  }

  if (typeof options.maxRuntimeMs !== 'undefined') {
    normalized.maxRuntimeMs = astJobsNormalizePositiveInt(
      options.maxRuntimeMs,
      AST_JOBS_DEFAULT_OPTIONS.maxRuntimeMs,
      1000,
      600000
    );
  }

  if (typeof options.leaseTtlMs !== 'undefined') {
    normalized.leaseTtlMs = astJobsNormalizePositiveInt(
      options.leaseTtlMs,
      AST_JOBS_DEFAULT_OPTIONS.leaseTtlMs,
      1000,
      600000
    );
  }

  if (typeof options.checkpointStore !== 'undefined') {
    normalized.checkpointStore = astJobsNormalizeString(
      options.checkpointStore,
      AST_JOBS_DEFAULT_OPTIONS.checkpointStore
    ).toLowerCase();
  }

  if (typeof options.autoResume !== 'undefined') {
    normalized.autoResume = Boolean(options.autoResume);
  }

  if (typeof options.propertyPrefix !== 'undefined') {
    normalized.propertyPrefix = astJobsNormalizeString(
      options.propertyPrefix,
      AST_JOBS_DEFAULT_OPTIONS.propertyPrefix
    );
  }

  return normalized;
}

function astJobsNormalizeSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new AstJobsValidationError('Job requires a non-empty steps array');
  }

  const normalized = [];
  const stepIds = new Set();

  for (let idx = 0; idx < steps.length; idx += 1) {
    const step = steps[idx];
    if (!astJobsIsPlainObject(step)) {
      throw new AstJobsValidationError('Each step must be an object', {
        index: idx
      });
    }

    const stepId = astJobsNormalizeString(step.id, null);
    if (!stepId) {
      throw new AstJobsValidationError('Each step requires a non-empty id', {
        index: idx
      });
    }

    if (stepIds.has(stepId)) {
      throw new AstJobsValidationError('Step IDs must be unique', {
        stepId
      });
    }
    stepIds.add(stepId);

    const handlerName = astJobsResolveHandlerName(step.handler, stepId);
    const dependsOn = astJobsNormalizeStepDependencies(step.dependsOn, stepId);
    const payload = typeof step.payload === 'undefined' ? null : step.payload;

    normalized.push({
      id: stepId,
      handlerName,
      dependsOn,
      payload
    });
  }

  astJobsValidateDependencyGraph(normalized);
  return normalized;
}

function astJobsValidateRunRequest(request = {}) {
  if (!astJobsIsPlainObject(request)) {
    throw new AstJobsValidationError('Job request must be an object');
  }

  const name = astJobsNormalizeString(request.name, null);
  if (!name) {
    throw new AstJobsValidationError('Job request requires a non-empty name');
  }

  return {
    name,
    steps: astJobsNormalizeSteps(request.steps),
    options: astJobsNormalizeOptions(request.options || {})
  };
}

function astJobsValidateEnqueueRequest(request = {}) {
  return astJobsValidateRunRequest(request);
}

function astJobsValidateListFilters(filters = {}) {
  if (!astJobsIsPlainObject(filters)) {
    throw new AstJobsValidationError('Job list filters must be an object');
  }

  const status = astJobsNormalizeString(filters.status, null);
  if (status && !AST_JOBS_ALLOWED_STATUSES.includes(status)) {
    throw new AstJobsValidationError('Invalid status filter', {
      status
    });
  }

  return {
    status: status || null,
    name: astJobsNormalizeString(filters.name, null),
    limit: astJobsNormalizePositiveInt(filters.limit, 100, 1, 1000)
  };
}

function astJobsNormalizeOrchestrationMode(mode, fallback = 'run') {
  const fallbackMode = astJobsNormalizeString(fallback, 'run').toLowerCase();
  if (!AST_JOBS_ORCHESTRATION_ALLOWED_MODES.includes(fallbackMode)) {
    throw new AstJobsValidationError('Invalid orchestration fallback mode', {
      fallback
    });
  }

  if (typeof mode === 'undefined' || mode === null || mode === '') {
    return fallbackMode;
  }

  const normalized = astJobsNormalizeString(mode, null);
  if (!normalized) {
    throw new AstJobsValidationError('Invalid orchestration mode', {
      mode
    });
  }

  const lowered = normalized.toLowerCase();

  if (!AST_JOBS_ORCHESTRATION_ALLOWED_MODES.includes(lowered)) {
    throw new AstJobsValidationError('Invalid orchestration mode', {
      mode
    });
  }

  return lowered;
}

function astJobsNormalizeOrchestrationItems(items, label = 'items') {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AstJobsValidationError(`${label} must be a non-empty array`);
  }

  if (items.length > AST_JOBS_ORCHESTRATION_MAX_ITEMS) {
    throw new AstJobsValidationError(`${label} exceeds supported max size`, {
      maxItems: AST_JOBS_ORCHESTRATION_MAX_ITEMS,
      count: items.length
    });
  }

  return items.slice();
}

function astJobsNormalizeOrchestrationConcurrency(value) {
  return astJobsNormalizePositiveInt(
    value,
    AST_JOBS_ORCHESTRATION_DEFAULT_MAX_CONCURRENCY,
    1,
    AST_JOBS_ORCHESTRATION_MAX_CONCURRENCY
  );
}

function astJobsNormalizeOrchestrationStepIdPrefix(value, fallback) {
  const normalized = astJobsNormalizeString(value, fallback);
  if (!normalized) {
    throw new AstJobsValidationError('Step ID prefix must be a non-empty string');
  }

  return normalized;
}

function astJobsNormalizeChainTasks(tasks, stepIdPrefix) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new AstJobsValidationError('Chain tasks must be a non-empty array');
  }

  const normalized = [];
  const seenStepIds = new Set();

  for (let idx = 0; idx < tasks.length; idx += 1) {
    const task = tasks[idx];
    if (!astJobsIsPlainObject(task)) {
      throw new AstJobsValidationError('Each chain task must be an object', {
        index: idx
      });
    }

    const fallbackId = `${stepIdPrefix}_${idx + 1}`;
    const stepId = astJobsNormalizeString(task.id, fallbackId);
    if (!stepId) {
      throw new AstJobsValidationError('Chain task id must be a non-empty string', {
        index: idx
      });
    }

    if (seenStepIds.has(stepId)) {
      throw new AstJobsValidationError('Chain task IDs must be unique', {
        stepId
      });
    }
    seenStepIds.add(stepId);

    normalized.push({
      id: stepId,
      handlerName: astJobsResolveHandlerName(task.handler, stepId),
      payload: typeof task.payload === 'undefined' ? null : task.payload
    });
  }

  return normalized;
}

function astJobsValidateChainRequest(request = {}) {
  if (!astJobsIsPlainObject(request)) {
    throw new AstJobsValidationError('Chain request must be an object');
  }

  const name = astJobsNormalizeString(request.name, null);
  if (!name) {
    throw new AstJobsValidationError('Chain request requires a non-empty name');
  }

  const stepIdPrefix = astJobsNormalizeOrchestrationStepIdPrefix(request.stepIdPrefix, 'chain_step');
  const tasks = astJobsNormalizeChainTasks(request.tasks, stepIdPrefix);

  return {
    name,
    mode: astJobsNormalizeOrchestrationMode(request.mode, 'run'),
    options: astJobsNormalizeOptions(request.options || {}),
    stepIdPrefix,
    tasks
  };
}

function astJobsValidateEnqueueManyRequest(request = {}) {
  if (!astJobsIsPlainObject(request)) {
    throw new AstJobsValidationError('enqueueMany request must be an object');
  }

  const name = astJobsNormalizeString(request.name, null);
  if (!name) {
    throw new AstJobsValidationError('enqueueMany request requires a non-empty name');
  }

  const stepIdPrefix = astJobsNormalizeOrchestrationStepIdPrefix(request.stepIdPrefix, 'item');
  const handlerName = astJobsResolveHandlerName(request.handler, stepIdPrefix);
  const items = astJobsNormalizeOrchestrationItems(request.items, 'items');

  return {
    name,
    mode: astJobsNormalizeOrchestrationMode(request.mode, 'enqueue'),
    options: astJobsNormalizeOptions(request.options || {}),
    stepIdPrefix,
    handlerName,
    items,
    sharedPayload: typeof request.sharedPayload === 'undefined' ? null : request.sharedPayload,
    maxConcurrency: astJobsNormalizeOrchestrationConcurrency(request.maxConcurrency)
  };
}

function astJobsValidateMapReduceRequest(request = {}) {
  if (!astJobsIsPlainObject(request)) {
    throw new AstJobsValidationError('mapReduce request must be an object');
  }

  const name = astJobsNormalizeString(request.name, null);
  if (!name) {
    throw new AstJobsValidationError('mapReduce request requires a non-empty name');
  }

  const mapConfig = astJobsIsPlainObject(request.map) ? request.map : {};
  const reduceConfig = astJobsIsPlainObject(request.reduce) ? request.reduce : {};
  const mapStepIdPrefix = astJobsNormalizeOrchestrationStepIdPrefix(
    mapConfig.stepIdPrefix || request.mapStepIdPrefix,
    'map'
  );
  const reduceStepId = astJobsNormalizeString(reduceConfig.id || request.reduceStepId, 'reduce');
  if (!reduceStepId) {
    throw new AstJobsValidationError('mapReduce reduce step id must be non-empty');
  }

  return {
    name,
    mode: astJobsNormalizeOrchestrationMode(request.mode, 'run'),
    options: astJobsNormalizeOptions(request.options || {}),
    items: astJobsNormalizeOrchestrationItems(request.items, 'items'),
    maxConcurrency: astJobsNormalizeOrchestrationConcurrency(request.maxConcurrency),
    mapStepIdPrefix,
    mapHandlerName: astJobsResolveHandlerName(mapConfig.handler || request.mapHandler, mapStepIdPrefix),
    reduceStepId,
    reduceHandlerName: astJobsResolveHandlerName(reduceConfig.handler || request.reduceHandler, reduceStepId),
    mapPayload: typeof mapConfig.payload === 'undefined' ? (
      typeof request.mapPayload === 'undefined' ? null : request.mapPayload
    ) : mapConfig.payload,
    reducePayload: typeof reduceConfig.payload === 'undefined' ? (
      typeof request.reducePayload === 'undefined' ? null : request.reducePayload
    ) : reduceConfig.payload
  };
}

const __astJobsValidateRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsValidateRoot.AST_JOBS_ALLOWED_STATUSES = AST_JOBS_ALLOWED_STATUSES;
__astJobsValidateRoot.AST_JOBS_ORCHESTRATION_ALLOWED_MODES = AST_JOBS_ORCHESTRATION_ALLOWED_MODES;
__astJobsValidateRoot.AST_JOBS_ORCHESTRATION_MAX_ITEMS = AST_JOBS_ORCHESTRATION_MAX_ITEMS;
__astJobsValidateRoot.AST_JOBS_ORCHESTRATION_DEFAULT_MAX_CONCURRENCY = AST_JOBS_ORCHESTRATION_DEFAULT_MAX_CONCURRENCY;
__astJobsValidateRoot.AST_JOBS_ORCHESTRATION_MAX_CONCURRENCY = AST_JOBS_ORCHESTRATION_MAX_CONCURRENCY;
__astJobsValidateRoot.AST_JOBS_DEFAULT_OPTIONS = AST_JOBS_DEFAULT_OPTIONS;
__astJobsValidateRoot.astJobsIsPlainObject = astJobsIsPlainObject;
__astJobsValidateRoot.astJobsNormalizeString = astJobsNormalizeString;
__astJobsValidateRoot.astJobsNormalizePositiveInt = astJobsNormalizePositiveInt;
__astJobsValidateRoot.astJobsCloneObject = astJobsCloneObject;
__astJobsValidateRoot.astJobsNormalizeJobId = astJobsNormalizeJobId;
__astJobsValidateRoot.astJobsNormalizeOptions = astJobsNormalizeOptions;
__astJobsValidateRoot.astJobsValidateRunRequest = astJobsValidateRunRequest;
__astJobsValidateRoot.astJobsValidateEnqueueRequest = astJobsValidateEnqueueRequest;
__astJobsValidateRoot.astJobsValidateListFilters = astJobsValidateListFilters;
__astJobsValidateRoot.astJobsValidateChainRequest = astJobsValidateChainRequest;
__astJobsValidateRoot.astJobsValidateEnqueueManyRequest = astJobsValidateEnqueueManyRequest;
__astJobsValidateRoot.astJobsValidateMapReduceRequest = astJobsValidateMapReduceRequest;
this.AST_JOBS_ALLOWED_STATUSES = AST_JOBS_ALLOWED_STATUSES;
this.AST_JOBS_ORCHESTRATION_ALLOWED_MODES = AST_JOBS_ORCHESTRATION_ALLOWED_MODES;
this.AST_JOBS_ORCHESTRATION_MAX_ITEMS = AST_JOBS_ORCHESTRATION_MAX_ITEMS;
this.AST_JOBS_ORCHESTRATION_DEFAULT_MAX_CONCURRENCY = AST_JOBS_ORCHESTRATION_DEFAULT_MAX_CONCURRENCY;
this.AST_JOBS_ORCHESTRATION_MAX_CONCURRENCY = AST_JOBS_ORCHESTRATION_MAX_CONCURRENCY;
this.AST_JOBS_DEFAULT_OPTIONS = AST_JOBS_DEFAULT_OPTIONS;
this.astJobsIsPlainObject = astJobsIsPlainObject;
this.astJobsNormalizeString = astJobsNormalizeString;
this.astJobsNormalizePositiveInt = astJobsNormalizePositiveInt;
this.astJobsCloneObject = astJobsCloneObject;
this.astJobsNormalizeJobId = astJobsNormalizeJobId;
this.astJobsNormalizeOptions = astJobsNormalizeOptions;
this.astJobsValidateRunRequest = astJobsValidateRunRequest;
this.astJobsValidateEnqueueRequest = astJobsValidateEnqueueRequest;
this.astJobsValidateListFilters = astJobsValidateListFilters;
this.astJobsValidateChainRequest = astJobsValidateChainRequest;
this.astJobsValidateEnqueueManyRequest = astJobsValidateEnqueueManyRequest;
this.astJobsValidateMapReduceRequest = astJobsValidateMapReduceRequest;
