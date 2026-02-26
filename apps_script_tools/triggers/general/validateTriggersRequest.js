const AST_TRIGGERS_OPERATIONS = Object.freeze([
  'upsert',
  'list',
  'delete',
  'run_now'
]);

const AST_TRIGGERS_SCHEDULE_TYPES = Object.freeze([
  'every_minutes',
  'every_hours',
  'every_days',
  'every_weeks'
]);

const AST_TRIGGERS_DISPATCH_MODES = Object.freeze([
  'direct',
  'jobs'
]);

const AST_TRIGGERS_WEEK_DAYS = Object.freeze([
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
]);

function astTriggersIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astTriggersCloneObject(value) {
  return Object.assign({}, value || {});
}

function astTriggersNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function astTriggersNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  return fallback;
}

function astTriggersNormalizeInteger(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return fallback;
  }

  if (numeric < min || numeric > max) {
    return fallback;
  }

  return numeric;
}

function astTriggersNormalizeOperation(operation, fallback = 'list') {
  const normalized = astTriggersNormalizeString(operation, fallback);
  return normalized ? normalized.toLowerCase() : fallback;
}

function astTriggersNormalizeIdentity(value, fallback = null) {
  const normalized = astTriggersNormalizeString(value, fallback);
  if (!normalized) {
    return fallback;
  }

  const output = normalized.replace(/[^a-zA-Z0-9_-]/g, '_');
  return output.length > 120 ? output.slice(0, 120) : output;
}

function astTriggersNormalizeWeekDay(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value >= 0 && value <= 6) {
      return AST_TRIGGERS_WEEK_DAYS[value];
    }
    if (value >= 1 && value <= 7) {
      return AST_TRIGGERS_WEEK_DAYS[value % 7];
    }
  }

  const normalized = astTriggersNormalizeString(value, null);
  if (!normalized) {
    return null;
  }

  const canonical = normalized.toUpperCase();
  return AST_TRIGGERS_WEEK_DAYS.indexOf(canonical) === -1
    ? null
    : canonical;
}

function astTriggersValidateSchedule(schedule, resolvedConfig = {}) {
  if (!astTriggersIsPlainObject(schedule)) {
    throw new AstTriggersValidationError('Trigger upsert request requires a schedule object');
  }

  const type = astTriggersNormalizeString(schedule.type, null);
  if (!type || AST_TRIGGERS_SCHEDULE_TYPES.indexOf(type) === -1) {
    throw new AstTriggersValidationError(
      `Unsupported schedule.type '${schedule.type}'`,
      { supportedTypes: AST_TRIGGERS_SCHEDULE_TYPES.slice() }
    );
  }

  const every = astTriggersNormalizeInteger(schedule.every, 1, 1, 60);
  const atHour = astTriggersNormalizeInteger(schedule.atHour, null, 0, 23);
  const nearMinute = astTriggersNormalizeInteger(schedule.nearMinute, null, 0, 59);
  const weekDay = astTriggersNormalizeWeekDay(schedule.onWeekDay);

  if (type === 'every_minutes' && every > 30) {
    throw new AstTriggersValidationError(
      'schedule.every must be <= 30 for every_minutes',
      { type, every }
    );
  }

  if (type === 'every_hours' && every > 23) {
    throw new AstTriggersValidationError(
      'schedule.every must be <= 23 for every_hours',
      { type, every }
    );
  }

  if (type === 'every_weeks' && !weekDay) {
    throw new AstTriggersValidationError(
      'schedule.onWeekDay is required for every_weeks',
      { type }
    );
  }

  if (type !== 'every_weeks' && weekDay) {
    throw new AstTriggersValidationError(
      'schedule.onWeekDay is only supported for every_weeks',
      { type }
    );
  }

  const timeZone = astTriggersNormalizeString(
    schedule.timeZone,
    astTriggersNormalizeString(resolvedConfig.defaultTimeZone, null)
  );

  return {
    type,
    every,
    atHour,
    nearMinute,
    onWeekDay: weekDay,
    timeZone
  };
}

function astTriggersNormalizeDispatchJob(rawJob) {
  if (!astTriggersIsPlainObject(rawJob)) {
    return null;
  }

  return astTriggersCloneObject(rawJob);
}

function astTriggersValidateDispatch(dispatch, request = {}, resolvedConfig = {}) {
  const rawDispatch = astTriggersIsPlainObject(dispatch)
    ? astTriggersCloneObject(dispatch)
    : {};

  const mode = astTriggersNormalizeString(
    rawDispatch.mode,
    astTriggersNormalizeString(resolvedConfig.defaultDispatchMode, 'direct')
  );

  if (AST_TRIGGERS_DISPATCH_MODES.indexOf(mode) === -1) {
    throw new AstTriggersValidationError(
      `Unsupported dispatch.mode '${mode}'`,
      { supportedModes: AST_TRIGGERS_DISPATCH_MODES.slice() }
    );
  }

  const handler = astTriggersNormalizeString(
    rawDispatch.handler,
    astTriggersNormalizeString(request.handler, null)
  );

  const payload = Object.prototype.hasOwnProperty.call(rawDispatch, 'payload')
    ? rawDispatch.payload
    : (Object.prototype.hasOwnProperty.call(request, 'payload') ? request.payload : null);
  const autoResumeJobs = astTriggersNormalizeBoolean(
    rawDispatch.autoResumeJobs,
    astTriggersNormalizeBoolean(resolvedConfig.jobsAutoResume, false)
  );
  const job = astTriggersNormalizeDispatchJob(rawDispatch.job);

  if (mode === 'direct' && !handler) {
    throw new AstTriggersValidationError(
      'dispatch.handler is required when dispatch.mode=direct'
    );
  }

  if (mode === 'jobs' && !job && !handler) {
    throw new AstTriggersValidationError(
      'dispatch.job or dispatch.handler is required when dispatch.mode=jobs'
    );
  }

  return {
    mode,
    handler,
    payload,
    job,
    autoResumeJobs
  };
}

function astTriggersValidateUpsertRequest(rawRequest = {}, resolvedConfig = {}) {
  if (!astTriggersIsPlainObject(rawRequest)) {
    throw new AstTriggersValidationError('Trigger upsert request must be an object');
  }

  const options = astTriggersIsPlainObject(rawRequest.options)
    ? astTriggersCloneObject(rawRequest.options)
    : {};

  return {
    operation: 'upsert',
    id: astTriggersNormalizeIdentity(rawRequest.id, null),
    enabled: astTriggersNormalizeBoolean(rawRequest.enabled, true),
    schedule: astTriggersValidateSchedule(rawRequest.schedule, resolvedConfig),
    dispatch: astTriggersValidateDispatch(rawRequest.dispatch, rawRequest, resolvedConfig),
    metadata: astTriggersIsPlainObject(rawRequest.metadata)
      ? astTriggersCloneObject(rawRequest.metadata)
      : {},
    options: {
      dryRun: astTriggersNormalizeBoolean(options.dryRun, false),
      includeRaw: astTriggersNormalizeBoolean(options.includeRaw, false)
    }
  };
}

function astTriggersValidateListRequest(rawRequest = {}) {
  if (!astTriggersIsPlainObject(rawRequest)) {
    throw new AstTriggersValidationError('Trigger list request must be an object');
  }

  const options = astTriggersIsPlainObject(rawRequest.options)
    ? astTriggersCloneObject(rawRequest.options)
    : {};
  const filters = astTriggersIsPlainObject(rawRequest.filters)
    ? astTriggersCloneObject(rawRequest.filters)
    : {};
  const ids = Array.isArray(filters.ids)
    ? filters.ids
      .map(item => astTriggersNormalizeIdentity(item, null))
      .filter(Boolean)
    : null;

  return {
    operation: 'list',
    filters: {
      id: astTriggersNormalizeIdentity(filters.id || rawRequest.id, null),
      ids: ids && ids.length > 0 ? ids : null,
      enabled: Object.prototype.hasOwnProperty.call(filters, 'enabled')
        ? astTriggersNormalizeBoolean(filters.enabled, true)
        : null
    },
    options: {
      includeRaw: astTriggersNormalizeBoolean(options.includeRaw, false),
      limit: astTriggersNormalizeInteger(options.limit, 100, 1, 1000),
      offset: astTriggersNormalizeInteger(options.offset, 0, 0, 100000),
      includeOrphans: astTriggersNormalizeBoolean(options.includeOrphans, false)
    }
  };
}

function astTriggersValidateDeleteRequest(rawRequest = {}) {
  if (!astTriggersIsPlainObject(rawRequest)) {
    throw new AstTriggersValidationError('Trigger delete request must be an object');
  }

  const options = astTriggersIsPlainObject(rawRequest.options)
    ? astTriggersCloneObject(rawRequest.options)
    : {};
  const deleteAll = astTriggersNormalizeBoolean(options.all, false);
  const id = astTriggersNormalizeIdentity(rawRequest.id, null);

  if (!deleteAll && !id) {
    throw new AstTriggersValidationError(
      'Trigger delete request requires id unless options.all=true'
    );
  }

  return {
    operation: 'delete',
    id,
    options: {
      all: deleteAll,
      dryRun: astTriggersNormalizeBoolean(options.dryRun, false)
    }
  };
}

function astTriggersValidateRunNowRequest(rawRequest = {}) {
  if (!astTriggersIsPlainObject(rawRequest)) {
    throw new AstTriggersValidationError('Trigger runNow request must be an object');
  }

  const options = astTriggersIsPlainObject(rawRequest.options)
    ? astTriggersCloneObject(rawRequest.options)
    : {};
  const id = astTriggersNormalizeIdentity(rawRequest.id, null);
  const triggerUid = astTriggersNormalizeString(rawRequest.triggerUid, null);

  if (!id && !triggerUid) {
    throw new AstTriggersValidationError(
      'Trigger runNow request requires id or triggerUid'
    );
  }

  return {
    operation: 'run_now',
    id,
    triggerUid,
    event: astTriggersIsPlainObject(rawRequest.event)
      ? astTriggersCloneObject(rawRequest.event)
      : {},
    options: {
      includeRaw: astTriggersNormalizeBoolean(options.includeRaw, false)
    }
  };
}

function astTriggersValidateRequest(request = {}, resolvedConfig = {}) {
  const rawRequest = astTriggersIsPlainObject(request)
    ? astTriggersCloneObject(request)
    : {};

  const operation = astTriggersNormalizeOperation(rawRequest.operation, 'list');
  if (AST_TRIGGERS_OPERATIONS.indexOf(operation) === -1) {
    throw new AstTriggersValidationError(
      `Unsupported triggers operation '${operation}'`,
      { supportedOperations: AST_TRIGGERS_OPERATIONS.slice() }
    );
  }

  if (operation === 'upsert') {
    return astTriggersValidateUpsertRequest(rawRequest, resolvedConfig);
  }

  if (operation === 'list') {
    return astTriggersValidateListRequest(rawRequest);
  }

  if (operation === 'delete') {
    return astTriggersValidateDeleteRequest(rawRequest);
  }

  if (operation === 'run_now') {
    return astTriggersValidateRunNowRequest(rawRequest);
  }

  throw new AstTriggersValidationError(
    `Unsupported triggers operation '${operation}'`,
    { supportedOperations: AST_TRIGGERS_OPERATIONS.slice() }
  );
}
