const AST_JOBS_ALLOWED_STATUSES = Object.freeze([
  'queued',
  'running',
  'paused',
  'failed',
  'completed',
  'canceled'
]);

const AST_JOBS_DEFAULT_OPTIONS = Object.freeze({
  maxRetries: 2,
  maxRuntimeMs: 240000,
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

const __astJobsValidateRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astJobsValidateRoot.AST_JOBS_ALLOWED_STATUSES = AST_JOBS_ALLOWED_STATUSES;
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
this.AST_JOBS_ALLOWED_STATUSES = AST_JOBS_ALLOWED_STATUSES;
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
