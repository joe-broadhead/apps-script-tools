function astTriggersNowIso() {
  return new Date().toISOString();
}

function astTriggersStableSerialize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => astTriggersStableSerialize(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(key => `${JSON.stringify(key)}:${astTriggersStableSerialize(value[key])}`);
  return `{${entries.join(',')}}`;
}

function astTriggersHashString(value) {
  const text = String(value || '');
  try {
    if (
      typeof Utilities !== 'undefined'
      && Utilities
      && typeof Utilities.computeDigest === 'function'
    ) {
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
      return digest
        .map(byte => {
          const normalized = byte < 0 ? byte + 256 : byte;
          return normalized.toString(16).padStart(2, '0');
        })
        .join('');
    }
  } catch (_error) {
    // Fall through to JS hash fallback.
  }

  let hash = 2166136261;
  for (let idx = 0; idx < text.length; idx += 1) {
    hash ^= text.charCodeAt(idx);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, '0');
}

function astTriggersBuildDefinitionSignature(normalizedRequest) {
  return astTriggersHashString(
    astTriggersStableSerialize({
      enabled: normalizedRequest.enabled,
      schedule: normalizedRequest.schedule,
      dispatch: normalizedRequest.dispatch,
      metadata: normalizedRequest.metadata
    })
  );
}

function astTriggersBuildBindingSignature(config) {
  const normalized = config || {};
  return astTriggersHashString(
    astTriggersStableSerialize({
      enabled: Boolean(normalized.enabled),
      schedule: normalized.schedule || {},
      dispatchHandler: normalized.dispatchHandler
        ? String(normalized.dispatchHandler)
        : null
    })
  );
}

function astTriggersResolveIdentity(normalizedRequest) {
  if (normalizedRequest.id) {
    return normalizedRequest.id;
  }

  const derived = astTriggersHashString(
    astTriggersStableSerialize({
      schedule: normalizedRequest.schedule,
      dispatch: normalizedRequest.dispatch
    })
  ).slice(0, 16);

  return `trigger_${derived}`;
}

function astTriggersResolveWeekDayEnum(weekDay) {
  if (!weekDay) {
    return null;
  }

  if (
    typeof ScriptApp !== 'undefined'
    && ScriptApp
    && ScriptApp.WeekDay
    && ScriptApp.WeekDay[weekDay]
  ) {
    return ScriptApp.WeekDay[weekDay];
  }

  return weekDay;
}

function astTriggersApplyScheduleToBuilder(builder, schedule) {
  if (schedule.timeZone && typeof builder.inTimezone === 'function') {
    builder = builder.inTimezone(schedule.timeZone);
  }

  if (schedule.type === 'every_minutes') {
    return builder.everyMinutes(schedule.every);
  }

  if (schedule.type === 'every_hours') {
    builder = builder.everyHours(schedule.every);
    if (schedule.nearMinute != null && typeof builder.nearMinute === 'function') {
      builder = builder.nearMinute(schedule.nearMinute);
    }
    return builder;
  }

  if (schedule.type === 'every_days') {
    builder = builder.everyDays(schedule.every);
    if (schedule.atHour != null && typeof builder.atHour === 'function') {
      builder = builder.atHour(schedule.atHour);
    }
    if (schedule.nearMinute != null && typeof builder.nearMinute === 'function') {
      builder = builder.nearMinute(schedule.nearMinute);
    }
    return builder;
  }

  if (schedule.type === 'every_weeks') {
    builder = builder.everyWeeks(schedule.every);
    const weekDayEnum = astTriggersResolveWeekDayEnum(schedule.onWeekDay);
    if (weekDayEnum != null && typeof builder.onWeekDay === 'function') {
      builder = builder.onWeekDay(weekDayEnum);
    }
    if (schedule.atHour != null && typeof builder.atHour === 'function') {
      builder = builder.atHour(schedule.atHour);
    }
    if (schedule.nearMinute != null && typeof builder.nearMinute === 'function') {
      builder = builder.nearMinute(schedule.nearMinute);
    }
    return builder;
  }

  throw new AstTriggersValidationError(
    `Unsupported schedule.type '${schedule.type}'`,
    { scheduleType: schedule.type }
  );
}

function astTriggersRequireScriptApp(methodName) {
  if (
    typeof ScriptApp === 'undefined'
    || !ScriptApp
    || typeof ScriptApp.getProjectTriggers !== 'function'
  ) {
    throw new AstTriggersCapabilityError(
      `ScriptApp is required for triggers.${methodName}`
    );
  }

  return ScriptApp;
}

function astTriggersGetProjectTriggersSafe() {
  try {
    const scriptApp = astTriggersRequireScriptApp('list');
    return scriptApp.getProjectTriggers();
  } catch (_error) {
    return [];
  }
}

function astTriggersFindProjectTriggerByUid(triggerUid) {
  const normalizedUid = astTriggersNormalizeString(triggerUid, null);
  if (!normalizedUid) {
    return null;
  }

  const triggers = astTriggersGetProjectTriggersSafe();
  for (let idx = 0; idx < triggers.length; idx += 1) {
    const trigger = triggers[idx];
    if (!trigger || typeof trigger.getUniqueId !== 'function') {
      continue;
    }
    if (trigger.getUniqueId() === normalizedUid) {
      return trigger;
    }
  }
  return null;
}

function astTriggersDeleteProjectTriggerByUid(triggerUid) {
  const trigger = astTriggersFindProjectTriggerByUid(triggerUid);
  if (!trigger) {
    return false;
  }

  const scriptApp = astTriggersRequireScriptApp('delete');
  scriptApp.deleteTrigger(trigger);
  return true;
}

function astTriggersCreateProjectTrigger(resolvedConfig, normalizedRequest) {
  const scriptApp = astTriggersRequireScriptApp('upsert');
  if (typeof scriptApp.newTrigger !== 'function') {
    throw new AstTriggersCapabilityError(
      'ScriptApp.newTrigger is not available in this runtime'
    );
  }

  let builder = scriptApp.newTrigger(resolvedConfig.dispatchHandler);
  if (!builder || typeof builder.timeBased !== 'function') {
    throw new AstTriggersCapabilityError(
      'ScriptApp.newTrigger(...).timeBased() is not available in this runtime'
    );
  }

  builder = builder.timeBased();
  builder = astTriggersApplyScheduleToBuilder(builder, normalizedRequest.schedule);
  if (!builder || typeof builder.create !== 'function') {
    throw new AstTriggersCapabilityError(
      'Trigger builder create() is not available'
    );
  }

  const trigger = builder.create();
  const triggerUid = trigger && typeof trigger.getUniqueId === 'function'
    ? trigger.getUniqueId()
    : null;

  return {
    trigger,
    triggerUid
  };
}

function astTriggersResolveJobsApi() {
  if (typeof AST_JOBS !== 'undefined' && AST_JOBS) {
    return AST_JOBS;
  }

  if (typeof AST !== 'undefined' && AST && AST.Jobs) {
    return AST.Jobs;
  }

  return null;
}

function astTriggersBuildDerivedJobRequest(definition) {
  const payload = Object.prototype.hasOwnProperty.call(definition.dispatch, 'payload')
    ? definition.dispatch.payload
    : null;

  return {
    name: `trigger_${definition.id}`,
    steps: [
      {
        id: 'trigger_step',
        handler: definition.dispatch.handler,
        payload
      }
    ]
  };
}

function astTriggersGetGlobalHandler(handlerName) {
  const normalizedName = astTriggersNormalizeString(handlerName, null);
  if (!normalizedName) {
    return null;
  }

  const root = typeof globalThis !== 'undefined' ? globalThis : this;
  const candidate = root ? root[normalizedName] : null;
  return typeof candidate === 'function' ? candidate : null;
}

function astTriggersExecuteDispatch(definition, event = {}, source = 'manual') {
  const dispatch = definition.dispatch || {};
  const envelope = {
    triggerId: definition.id,
    triggerUid: definition.triggerUid || null,
    source,
    firedAt: astTriggersNowIso(),
    schedule: definition.schedule,
    metadata: definition.metadata || {},
    event: astTriggersIsPlainObject(event) ? astTriggersCloneObject(event) : {}
  };

  if (dispatch.mode === 'direct') {
    const handler = astTriggersGetGlobalHandler(dispatch.handler);
    if (!handler) {
      throw new AstTriggersDispatchError(
        `Direct dispatch handler '${dispatch.handler}' is not defined`,
        {
          triggerId: definition.id,
          handler: dispatch.handler
        }
      );
    }

    const input = Object.assign({}, envelope, {
      payload: Object.prototype.hasOwnProperty.call(dispatch, 'payload')
        ? dispatch.payload
        : null
    });
    const result = handler(input);
    if (result && typeof result.then === 'function') {
      throw new AstTriggersDispatchError(
        'Direct dispatch handler must be synchronous',
        {
          triggerId: definition.id,
          handler: dispatch.handler
        }
      );
    }

    return {
      mode: 'direct',
      handler: dispatch.handler,
      result
    };
  }

  if (dispatch.mode === 'jobs') {
    const jobsApi = astTriggersResolveJobsApi();
    if (!jobsApi || typeof jobsApi.enqueue !== 'function') {
      throw new AstTriggersDispatchError(
        'AST.Jobs is required for dispatch.mode=jobs',
        { triggerId: definition.id }
      );
    }

    const jobRequest = dispatch.job
      ? astTriggersCloneObject(dispatch.job)
      : astTriggersBuildDerivedJobRequest(definition);

    const enqueued = jobsApi.enqueue(jobRequest);
    let resumed = null;
    if (dispatch.autoResumeJobs && typeof jobsApi.resume === 'function' && enqueued && enqueued.id) {
      resumed = jobsApi.resume(enqueued.id);
    }

    return {
      mode: 'jobs',
      enqueued,
      resumed
    };
  }

  throw new AstTriggersDispatchError(
    `Unsupported dispatch mode '${dispatch.mode}'`,
    { triggerId: definition.id }
  );
}

function astTriggersResolveDefinitionByRunRequest(normalizedRequest, resolvedConfig) {
  if (normalizedRequest.id) {
    const byId = astTriggersReadDefinition(resolvedConfig, normalizedRequest.id);
    if (!byId) {
      throw new AstTriggersNotFoundError(
        `Trigger definition '${normalizedRequest.id}' was not found`,
        { id: normalizedRequest.id }
      );
    }
    return byId;
  }

  const mappedId = astTriggersLookupIdByTriggerUid(resolvedConfig, normalizedRequest.triggerUid);
  if (mappedId) {
    const byMappedId = astTriggersReadDefinition(resolvedConfig, mappedId);
    if (byMappedId) {
      return byMappedId;
    }
  }

  const ids = astTriggersListDefinitionIds(resolvedConfig);
  for (let idx = 0; idx < ids.length; idx += 1) {
    const definition = astTriggersReadDefinition(resolvedConfig, ids[idx]);
    if (!definition) {
      continue;
    }
    if (definition.triggerUid === normalizedRequest.triggerUid) {
      return definition;
    }
  }

  throw new AstTriggersNotFoundError(
    `No trigger definition found for triggerUid '${normalizedRequest.triggerUid}'`,
    { triggerUid: normalizedRequest.triggerUid }
  );
}

function astTriggersBuildDefinitionRecord(resolvedConfig, id, existingDefinition, normalizedRequest, triggerUid) {
  const nowIso = astTriggersNowIso();
  return {
    id,
    enabled: normalizedRequest.enabled,
    triggerUid: normalizedRequest.enabled ? triggerUid : null,
    schedule: astTriggersCloneObject(normalizedRequest.schedule),
    dispatch: astTriggersCloneObject(normalizedRequest.dispatch),
    metadata: astTriggersCloneObject(normalizedRequest.metadata),
    signature: astTriggersBuildDefinitionSignature(normalizedRequest),
    dispatchHandler: resolvedConfig.dispatchHandler,
    createdAt: existingDefinition && existingDefinition.createdAt
      ? existingDefinition.createdAt
      : nowIso,
    updatedAt: nowIso
  };
}

function astTriggersUpsert(normalizedRequest, resolvedConfig) {
  const id = astTriggersResolveIdentity(normalizedRequest);
  const existing = astTriggersReadDefinition(resolvedConfig, id);
  const nextSignature = astTriggersBuildDefinitionSignature(normalizedRequest);
  const existingDispatchHandler = existing && existing.dispatchHandler
    ? String(existing.dispatchHandler)
    : null;
  const nextDispatchHandler = resolvedConfig && resolvedConfig.dispatchHandler
    ? String(resolvedConfig.dispatchHandler)
    : null;
  const existingBindingSignature = astTriggersBuildBindingSignature({
    enabled: existing ? existing.enabled : false,
    schedule: existing ? existing.schedule : null,
    dispatchHandler: existingDispatchHandler
  });
  const nextBindingSignature = astTriggersBuildBindingSignature({
    enabled: normalizedRequest.enabled,
    schedule: normalizedRequest.schedule,
    dispatchHandler: nextDispatchHandler
  });
  const existingTrigger = existing && existing.triggerUid
    ? astTriggersFindProjectTriggerByUid(existing.triggerUid)
    : null;
  const existingTriggerHealthy = Boolean(existing && existing.triggerUid && existingTrigger);

  const noop = Boolean(
    existing
    && existing.signature === nextSignature
    && existingBindingSignature === nextBindingSignature
    && (
      normalizedRequest.enabled === false
      || existingTriggerHealthy
    )
  );

  if (noop) {
    return {
      status: 'ok',
      operation: 'upsert',
      id,
      triggerUid: existing.triggerUid || null,
      created: false,
      updated: false,
      noop: true,
      dryRun: normalizedRequest.options.dryRun
    };
  }

  const ids = astTriggersListDefinitionIds(resolvedConfig);
  if (ids.indexOf(id) === -1) {
    ids.push(id);
    ids.sort();
  }

  const shouldRecreateTrigger = Boolean(
    normalizedRequest.enabled
    && (
      existingBindingSignature !== nextBindingSignature
      || !existingTriggerHealthy
    )
  );

  let deletedExistingTrigger = false;
  if (
    !normalizedRequest.options.dryRun
    && existing
    && existing.triggerUid
    && (!normalizedRequest.enabled || shouldRecreateTrigger)
  ) {
    deletedExistingTrigger = astTriggersDeleteProjectTriggerByUid(existing.triggerUid);
  }

  let triggerUid = null;
  if (normalizedRequest.enabled) {
    if (!normalizedRequest.options.dryRun && shouldRecreateTrigger) {
      const created = astTriggersCreateProjectTrigger(resolvedConfig, normalizedRequest);
      triggerUid = created.triggerUid || null;
    } else {
      triggerUid = existing && existing.triggerUid ? existing.triggerUid : null;
    }
  }

  const definition = astTriggersBuildDefinitionRecord(
    resolvedConfig,
    id,
    existing,
    normalizedRequest,
    triggerUid
  );

  if (!normalizedRequest.options.dryRun) {
    astTriggersWriteDefinition(resolvedConfig, id, definition);
    astTriggersWriteIdIndex(resolvedConfig, ids);

    if (existing && existing.triggerUid) {
      astTriggersUnmapTriggerUid(resolvedConfig, existing.triggerUid);
    }
    if (triggerUid) {
      astTriggersMapTriggerUid(resolvedConfig, triggerUid, id);
    }
  }

  const output = {
    status: 'ok',
    operation: 'upsert',
    id,
    triggerUid,
    created: !existing,
    updated: Boolean(existing),
    noop: false,
    dryRun: normalizedRequest.options.dryRun,
    actions: {
      deletedExistingTrigger,
      createdTrigger: Boolean(normalizedRequest.enabled && shouldRecreateTrigger)
    }
  };

  if (normalizedRequest.options.includeRaw) {
    output.definition = definition;
  }

  return output;
}

function astTriggersList(normalizedRequest, resolvedConfig) {
  const ids = astTriggersListDefinitionIds(resolvedConfig);
  const projectTriggers = astTriggersGetProjectTriggersSafe();
  const projectTriggerByUid = {};

  projectTriggers.forEach(trigger => {
    if (!trigger || typeof trigger.getUniqueId !== 'function') {
      return;
    }
    projectTriggerByUid[trigger.getUniqueId()] = trigger;
  });

  const allDefinitions = ids
    .map(id => astTriggersReadDefinition(resolvedConfig, id))
    .filter(Boolean);
  let definitions = allDefinitions.slice();

  if (normalizedRequest.filters.id) {
    definitions = definitions.filter(definition => definition.id === normalizedRequest.filters.id);
  }

  if (normalizedRequest.filters.ids) {
    const idSet = {};
    normalizedRequest.filters.ids.forEach(id => {
      idSet[id] = true;
    });
    definitions = definitions.filter(definition => idSet[definition.id]);
  }

  if (normalizedRequest.filters.enabled != null) {
    definitions = definitions.filter(definition => Boolean(definition.enabled) === normalizedRequest.filters.enabled);
  }

  definitions.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const total = definitions.length;
  const offset = normalizedRequest.options.offset;
  const limit = normalizedRequest.options.limit;
  const paged = definitions.slice(offset, offset + limit);

  const items = paged.map(definition => {
    const triggerUid = astTriggersNormalizeString(definition.triggerUid, null);
    const triggerExists = Boolean(triggerUid && projectTriggerByUid[triggerUid]);
    const item = {
      id: definition.id,
      enabled: Boolean(definition.enabled),
      triggerUid,
      triggerExists,
      dispatchMode: definition.dispatch && definition.dispatch.mode
        ? definition.dispatch.mode
        : null,
      schedule: definition.schedule || {},
      createdAt: definition.createdAt || null,
      updatedAt: definition.updatedAt || null
    };

    if (normalizedRequest.options.includeRaw) {
      item.definition = definition;
    }

    return item;
  });

  const output = {
    status: 'ok',
    operation: 'list',
    page: {
      limit,
      offset,
      returned: items.length,
      total,
      hasMore: offset + items.length < total
    },
    items
  };

  if (normalizedRequest.options.includeOrphans) {
    const knownUids = {};
    allDefinitions.forEach(definition => {
      if (definition && definition.triggerUid) {
        knownUids[definition.triggerUid] = true;
      }
    });

    const orphans = [];
    Object.keys(projectTriggerByUid).forEach(uid => {
      if (knownUids[uid]) {
        return;
      }

      const trigger = projectTriggerByUid[uid];
      orphans.push({
        triggerUid: uid,
        handler: typeof trigger.getHandlerFunction === 'function'
          ? trigger.getHandlerFunction()
          : null
      });
    });
    output.orphans = orphans;
  }

  return output;
}

function astTriggersDelete(normalizedRequest, resolvedConfig) {
  const ids = normalizedRequest.options.all
    ? astTriggersListDefinitionIds(resolvedConfig)
    : [normalizedRequest.id];
  const results = [];
  let deletedCount = 0;

  ids.forEach(id => {
    const definition = astTriggersReadDefinition(resolvedConfig, id);
    if (!definition) {
      return;
    }

    const triggerUid = astTriggersNormalizeString(definition.triggerUid, null);
    let deletedProjectTrigger = false;
    if (!normalizedRequest.options.dryRun && triggerUid) {
      deletedProjectTrigger = astTriggersDeleteProjectTriggerByUid(triggerUid);
    } else if (triggerUid) {
      deletedProjectTrigger = Boolean(astTriggersFindProjectTriggerByUid(triggerUid));
    }

    if (!normalizedRequest.options.dryRun) {
      astTriggersDeleteDefinition(resolvedConfig, id);
      if (triggerUid) {
        astTriggersUnmapTriggerUid(resolvedConfig, triggerUid);
      }
    }

    results.push({
      id,
      triggerUid,
      deletedProjectTrigger
    });
    deletedCount += 1;
  });

  if (!normalizedRequest.options.dryRun) {
    const remaining = astTriggersListDefinitionIds(resolvedConfig).filter(id => {
      for (let idx = 0; idx < results.length; idx += 1) {
        if (results[idx].id === id) {
          return false;
        }
      }
      return true;
    });
    astTriggersWriteIdIndex(resolvedConfig, remaining);
  }

  return {
    status: 'ok',
    operation: 'delete',
    deleted: deletedCount,
    dryRun: normalizedRequest.options.dryRun,
    items: results
  };
}

function astTriggersRunNow(normalizedRequest, resolvedConfig) {
  const definition = astTriggersResolveDefinitionByRunRequest(normalizedRequest, resolvedConfig);
  const result = astTriggersExecuteDispatch(
    definition,
    normalizedRequest.event,
    'run_now'
  );

  const output = {
    status: 'ok',
    operation: 'run_now',
    id: definition.id,
    triggerUid: definition.triggerUid || null,
    dispatchMode: definition.dispatch ? definition.dispatch.mode : null
  };

  if (normalizedRequest.options.includeRaw) {
    output.result = result;
  }

  return output;
}

function astRunTriggersRequest(request = {}, overrides = {}) {
  const baseRequest = astTriggersIsPlainObject(request)
    ? astTriggersCloneObject(request)
    : {};
  const normalizedOverrides = astTriggersIsPlainObject(overrides)
    ? astTriggersCloneObject(overrides)
    : {};
  const resolvedConfig = astTriggersResolveConfig(baseRequest);
  const normalized = astTriggersValidateRequest(
    Object.assign({}, baseRequest, normalizedOverrides),
    resolvedConfig
  );

  if (normalized.operation === 'upsert') {
    return astTriggersUpsert(normalized, resolvedConfig);
  }

  if (normalized.operation === 'list') {
    return astTriggersList(normalized, resolvedConfig);
  }

  if (normalized.operation === 'delete') {
    return astTriggersDelete(normalized, resolvedConfig);
  }

  if (normalized.operation === 'run_now') {
    return astTriggersRunNow(normalized, resolvedConfig);
  }

  throw new AstTriggersValidationError(
    `Unsupported triggers operation '${normalized.operation}'`,
    { operation: normalized.operation }
  );
}

function astTriggersDispatch(event = {}) {
  const triggerUid = astTriggersNormalizeString(
    astTriggersIsPlainObject(event) ? event.triggerUid : null,
    null
  );

  if (!triggerUid) {
    throw new AstTriggersValidationError(
      'Trigger dispatch event is missing triggerUid'
    );
  }

  const resolvedConfig = astTriggersResolveConfig({});
  const definition = astTriggersResolveDefinitionByRunRequest(
    {
      operation: 'run_now',
      triggerUid
    },
    resolvedConfig
  );

  return astTriggersExecuteDispatch(definition, event, 'trigger_event');
}
