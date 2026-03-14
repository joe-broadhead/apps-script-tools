function cookbookAssert_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Cookbook assertion failed.');
  }
}

function cookbookConfigureRuntimes_(ASTX, config) {
  ASTX.Jobs.clearConfig();
  ASTX.Triggers.clearConfig();

  ASTX.Jobs.configure({
    AST_JOBS_DEFAULT_MAX_RETRIES: config.JOBS_TRIGGERS_MAX_RETRIES,
    AST_JOBS_DEFAULT_MAX_RUNTIME_MS: config.JOBS_TRIGGERS_MAX_RUNTIME_MS,
    AST_JOBS_LEASE_TTL_MS: config.JOBS_TRIGGERS_MAX_RUNTIME_MS,
    AST_JOBS_CHECKPOINT_STORE: 'properties',
    AST_JOBS_PROPERTY_PREFIX: config.JOBS_TRIGGERS_JOB_PREFIX
  }, {
    merge: false
  });

  ASTX.Triggers.configure({
    AST_TRIGGERS_PROPERTY_PREFIX: config.JOBS_TRIGGERS_TRIGGER_PROPERTY_PREFIX,
    AST_TRIGGERS_DEFAULT_TIMEZONE: config.JOBS_TRIGGERS_TIMEZONE,
    AST_TRIGGERS_DEFAULT_DISPATCH_MODE: 'direct',
    AST_TRIGGERS_JOBS_AUTO_RESUME: 'true'
  }, {
    merge: false
  });
}

function cookbookCollectKnownJobIds_(ASTX, config) {
  const names = cookbookJobNames_(config);
  const ids = {};

  Object.keys(names).forEach(function (key) {
    const jobs = ASTX.Jobs.list({
      name: names[key],
      limit: 100
    });
    for (let idx = 0; idx < jobs.length; idx += 1) {
      ids[jobs[idx].id] = true;
    }
  });

  return Object.keys(ids);
}

function cookbookCleanupState_(ASTX, config) {
  const props = cookbookScriptProperties_();
  const deletedTriggerIds = [];
  const triggerIds = cookbookTriggerIds_(config);

  for (let idx = 0; idx < triggerIds.length; idx += 1) {
    try {
      const response = ASTX.Triggers.delete({
        id: triggerIds[idx]
      });
      if (response && response.deleted > 0) {
        deletedTriggerIds.push(triggerIds[idx]);
      }
    } catch (error) {
      if (!error || !error.message || String(error.message).toLowerCase().indexOf('not found') === -1) {
        throw error;
      }
    }
  }

  const entries = typeof props.getProperties === 'function' ? props.getProperties() : {};
  const keysToDelete = {};
  const protectedMarkers = [
    cookbookRetryMarkerKey_(config),
    cookbookDlqReplayMarkerKey_(config)
  ];

  Object.keys(entries).forEach(function (key) {
    if (
      key.indexOf(config.JOBS_TRIGGERS_JOB_PREFIX) === 0 ||
      key.indexOf(config.JOBS_TRIGGERS_TRIGGER_PROPERTY_PREFIX) === 0 ||
      protectedMarkers.indexOf(key) !== -1
    ) {
      keysToDelete[key] = true;
    }
  });

  const jobIds = cookbookCollectKnownJobIds_(ASTX, config);
  for (let idx = 0; idx < jobIds.length; idx += 1) {
    keysToDelete['AST_JOBS_LOCATOR_' + jobIds[idx]] = true;
    keysToDelete['AST_JOBS_DLQ_LOCATOR_' + jobIds[idx]] = true;
  }

  const deletedKeys = Object.keys(keysToDelete);
  for (let idx = 0; idx < deletedKeys.length; idx += 1) {
    props.deleteProperty(deletedKeys[idx]);
  }

  ASTX.Jobs.clearConfig();
  ASTX.Triggers.clearConfig();

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    deletedTriggerIds: deletedTriggerIds,
    deletedJobIds: jobIds,
    deletedPropertyCount: deletedKeys.length
  };
}

function cookbookDirectTriggerHandler(input) {
  return {
    ok: true,
    payload: input && input.payload ? input.payload : null,
    source: input && input.source ? input.source : null
  };
}

function cookbookJobsRetryableStep(input) {
  const config = cookbookRequireValidConfig_().config;
  const props = cookbookScriptProperties_();
  const markerKey = cookbookRetryMarkerKey_(config);
  if (props.getProperty(markerKey) !== 'done') {
    props.setProperty(markerKey, 'done');
    throw new Error('retry-once');
  }
  return {
    recovered: true,
    value: input && input.payload ? input.payload.value : null
  };
}

function cookbookJobsChainSeedHandler(input) {
  return Number(input && input.payload ? input.payload.base : 0) + 1;
}

function cookbookJobsChainFinalizeHandler(input) {
  return Number(input && input.results ? input.results.chain_step_1 : 0) * 2;
}

function cookbookJobsFanoutHandler(input) {
  const payload = input && input.payload ? input.payload : {};
  const multiplier = payload.shared ? Number(payload.shared.multiplier || 1) : 1;
  return {
    item: payload.item || null,
    scaled: Number(payload.item && payload.item.value ? payload.item.value : 0) * multiplier,
    position: payload.position
  };
}

function cookbookJobsMapHandler(input) {
  const payload = input && input.payload ? input.payload : {};
  const bias = payload.shared ? Number(payload.shared.bias || 0) : 0;
  return Number(payload.item && payload.item.score ? payload.item.score : 0) + bias;
}

function cookbookJobsReduceHandler(input) {
  const payload = input && input.payload ? input.payload : {};
  const results = input && input.results ? input.results : {};
  const ids = Array.isArray(payload.mapStepIds) ? payload.mapStepIds : [];
  let sum = 0;
  for (let idx = 0; idx < ids.length; idx += 1) {
    sum += Number(results[ids[idx]] || 0);
  }
  return sum;
}

function cookbookJobsScheduledHandler(input) {
  const payload = input && input.payload ? input.payload : {};
  return {
    processed: Number(payload.value || 0) * 2,
    source: 'scheduled_job'
  };
}

function cookbookJobsDlqReplayHandler() {
  const config = cookbookRequireValidConfig_().config;
  const props = cookbookScriptProperties_();
  const markerKey = cookbookDlqReplayMarkerKey_(config);
  if (props.getProperty(markerKey) !== 'ready') {
    props.setProperty(markerKey, 'ready');
    throw new Error('fail-before-dlq-replay');
  }
  return {
    replayed: true
  };
}

function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  const startCleanup = cookbookCleanupState_(ASTX, config);
  cookbookConfigureRuntimes_(ASTX, config);

  const names = cookbookJobNames_(config);
  const scheduledTriggerId = cookbookScheduledTriggerId_(config);

  const chain = ASTX.Jobs.chain({
    name: names.chain,
    tasks: [
      {
        handler: 'cookbookJobsChainSeedHandler',
        payload: { base: 3 }
      },
      {
        handler: 'cookbookJobsChainFinalizeHandler'
      }
    ],
    options: cookbookJobOptions_(config)
  });
  cookbookAssert_(chain.status === 'completed', 'Expected chain helper to complete.');

  const fanoutQueued = ASTX.Jobs.enqueueMany({
    name: names.fanout,
    mode: 'enqueue',
    handler: 'cookbookJobsFanoutHandler',
    items: [
      { value: 2 },
      { value: 4 },
      { value: 6 }
    ],
    sharedPayload: {
      multiplier: 3
    },
    maxConcurrency: config.JOBS_TRIGGERS_MAX_CONCURRENCY,
    options: cookbookJobOptions_(config)
  });
  const fanoutCompleted = ASTX.Jobs.resume(fanoutQueued.id);
  cookbookAssert_(fanoutCompleted.status === 'completed', 'Expected enqueueMany flow to complete after resume.');

  const mapReduce = ASTX.Jobs.mapReduce({
    name: names.mapReduce,
    items: [
      { score: 3 },
      { score: 5 },
      { score: 7 }
    ],
    mapHandler: 'cookbookJobsMapHandler',
    reduceHandler: 'cookbookJobsReduceHandler',
    mapPayload: {
      bias: 1
    },
    maxConcurrency: config.JOBS_TRIGGERS_MAX_CONCURRENCY,
    options: cookbookJobOptions_(config)
  });
  cookbookAssert_(mapReduce.status === 'completed', 'Expected mapReduce helper to complete.');

  const scheduledUpsert = ASTX.Jobs.schedule({
    operation: 'upsert',
    id: scheduledTriggerId,
    autoResumeJobs: true,
    schedule: cookbookTriggerSchedule_(config),
    name: names.scheduled,
    steps: [
      {
        id: 'scheduled_step',
        handler: 'cookbookJobsScheduledHandler',
        payload: {
          value: 11
        }
      }
    ],
    options: cookbookJobOptions_(config),
    metadata: {
      cookbook: cookbookName_(),
      flow: 'demo_schedule'
    }
  });
  const scheduledList = ASTX.Jobs.schedule({
    operation: 'list',
    limit: 20,
    includeOrphans: false
  });
  const scheduledRunNow = ASTX.Jobs.schedule({
    operation: 'run_now',
    id: scheduledTriggerId
  });
  const scheduledDelete = ASTX.Jobs.schedule({
    operation: 'delete',
    id: scheduledTriggerId
  });
  cookbookAssert_(scheduledUpsert.status === 'ok', 'Expected schedule upsert to succeed.');
  cookbookAssert_(scheduledRunNow.status === 'ok', 'Expected scheduled trigger run_now to succeed.');

  const failedJob = ASTX.Jobs.run({
    name: names.dlq,
    options: cookbookJobOptions_(config, {
      maxRetries: 0
    }),
    steps: [
      {
        id: 'dlq_step',
        handler: 'cookbookJobsDlqReplayHandler'
      }
    ]
  });
  cookbookAssert_(failedJob.status === 'failed', 'Expected DLQ demo job to fail before replay.');

  const movedToDlq = ASTX.Jobs.moveToDlq(failedJob.id);
  const failedList = ASTX.Jobs.listFailed({
    name: names.dlq,
    inDlq: 'only',
    includeJob: false,
    limit: 20
  });
  const replayKey = config.JOBS_TRIGGERS_TRIGGER_BASE_ID + '_replay';
  const replay = ASTX.Jobs.replayDlq({
    name: names.dlq,
    propertyPrefix: config.JOBS_TRIGGERS_JOB_PREFIX,
    limit: 20,
    maxConcurrency: 1,
    idempotencyKey: replayKey
  });
  const replayRepeat = ASTX.Jobs.replayDlq({
    name: names.dlq,
    propertyPrefix: config.JOBS_TRIGGERS_JOB_PREFIX,
    limit: 20,
    maxConcurrency: 1,
    idempotencyKey: replayKey
  });
  const purge = ASTX.Jobs.purgeDlq({
    name: names.dlq,
    propertyPrefix: config.JOBS_TRIGGERS_JOB_PREFIX,
    state: 'replayed',
    limit: 20
  });

  const demoSummary = {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookDemo',
    appName: config.JOBS_TRIGGERS_APP_NAME,
    startCleanup: startCleanup,
    chain: {
      status: chain.status,
      result: chain.results ? chain.results.chain_step_2 : null
    },
    enqueueMany: {
      queuedStatus: fanoutQueued.status,
      completedStatus: fanoutCompleted.status,
      item3Scaled: fanoutCompleted.results ? fanoutCompleted.results.item_3.scaled : null
    },
    mapReduce: {
      status: mapReduce.status,
      reduce: mapReduce.results ? mapReduce.results.reduce : null,
      mapCount: mapReduce.orchestration && mapReduce.orchestration.stages && mapReduce.orchestration.stages.map
        ? mapReduce.orchestration.stages.map.counts.total
        : null
    },
    schedule: {
      triggerId: scheduledTriggerId,
      created: scheduledUpsert.result ? scheduledUpsert.result.created === true : false,
      updated: scheduledUpsert.result ? scheduledUpsert.result.updated === true : false,
      noop: scheduledUpsert.result ? scheduledUpsert.result.noop === true : false,
      listedTotal: scheduledList.result && scheduledList.result.page ? scheduledList.result.page.total : null,
      listedMatchCount: Array.isArray(scheduledList.result && scheduledList.result.items ? scheduledList.result.items : null)
        ? scheduledList.result.items.filter(function (item) { return item.id === scheduledTriggerId; }).length
        : 0,
      runNowMode: scheduledRunNow.result ? scheduledRunNow.result.dispatchMode : null,
      scheduledValue: scheduledRunNow.result
        && scheduledRunNow.result.result
        && scheduledRunNow.result.result.resumed
        && scheduledRunNow.result.result.resumed.results
        ? scheduledRunNow.result.result.resumed.results.scheduled_step.processed
        : null,
      deleted: scheduledDelete.result ? scheduledDelete.result.deleted || 0 : 0
    },
    dlq: {
      failedStatus: failedJob.status,
      movedState: movedToDlq.state,
      listedCount: failedList.length,
      replayed: replay.counts ? replay.counts.replayed : null,
      replayIdempotent: replayRepeat.idempotent === true,
      purged: purge.deletedCount
    },
    completedAt: new Date().toISOString()
  };

  demoSummary.endCleanup = cookbookCleanupState_(ASTX, config);
  return demoSummary;
}
