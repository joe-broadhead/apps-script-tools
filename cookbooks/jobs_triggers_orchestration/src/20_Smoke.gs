function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  const startCleanup = cookbookCleanupState_(ASTX, config);
  cookbookConfigureRuntimes_(ASTX, config);

  const smokeJobName = cookbookJobNames_(config).smokeRetry;
  const directTriggerId = cookbookDirectTriggerId_(config);
  const directRequest = {
    id: directTriggerId,
    schedule: cookbookTriggerSchedule_(config),
    dispatch: {
      mode: 'direct',
      handler: 'cookbookDirectTriggerHandler',
      payload: {
        marker: 'smoke'
      }
    },
    metadata: {
      cookbook: cookbookName_(),
      flow: 'smoke'
    }
  };

  const triggerUpsert = ASTX.Triggers.upsert(directRequest);
  cookbookAssert_(
    triggerUpsert.created === true || triggerUpsert.updated === true || triggerUpsert.noop === true,
    'Expected direct trigger upsert to succeed.'
  );

  const triggerListed = ASTX.Triggers.list({
    filters: {
      ids: [directTriggerId]
    },
    options: {
      limit: 10
    }
  });
  cookbookAssert_(triggerListed.page.total === 1, 'Expected exactly one direct trigger definition.');

  const triggerRunNow = ASTX.Triggers.runNow({
    id: directTriggerId
  });
  cookbookAssert_(triggerRunNow.status === 'ok', 'Expected direct trigger runNow to succeed.');
  cookbookAssert_(triggerRunNow.dispatchMode === 'direct', 'Expected direct dispatch mode.');

  const queued = ASTX.Jobs.enqueue({
    name: smokeJobName,
    options: cookbookJobOptions_(config, {
      maxRetries: 1
    }),
    steps: [
      {
        id: 'retry_once_step',
        handler: 'cookbookJobsRetryableStep',
        payload: {
          value: 5
        }
      }
    ]
  });
  cookbookAssert_(queued.status === 'queued', 'Expected smoke job to start queued.');

  const firstResume = ASTX.Jobs.resume(queued.id);
  cookbookAssert_(firstResume.status === 'paused', 'Expected first resume to pause for retry.');

  const secondResume = ASTX.Jobs.resume(queued.id);
  cookbookAssert_(secondResume.status === 'completed', 'Expected second resume to complete.');

  const status = ASTX.Jobs.status(queued.id);
  const listed = ASTX.Jobs.list({
    name: smokeJobName,
    limit: 10
  });
  cookbookAssert_(status.status === 'completed', 'Expected smoke status lookup to be completed.');
  cookbookAssert_(listed.some(function (job) { return job.id === queued.id; }), 'Expected smoke job to appear in list output.');

  const triggerDeleted = ASTX.Triggers.delete({
    id: directTriggerId
  });

  const endCleanup = cookbookCleanupState_(ASTX, config);

  return {
    status: 'ok',
    cookbook: cookbookName_(),
    entrypoint: 'runCookbookSmoke',
    appName: config.JOBS_TRIGGERS_APP_NAME,
    startCleanup: startCleanup,
    trigger: {
      id: directTriggerId,
      created: triggerUpsert.created === true,
      updated: triggerUpsert.updated === true,
      noop: triggerUpsert.noop === true,
      listedTotal: triggerListed.page.total,
      runNowMode: triggerRunNow.dispatchMode,
      runNowSource: triggerRunNow.result && triggerRunNow.result.result
        ? triggerRunNow.result.result.source
        : null,
      deleted: triggerDeleted.deleted || 0
    },
    job: {
      id: queued.id,
      name: smokeJobName,
      transitions: [queued.status, firstResume.status, secondResume.status],
      listedCount: listed.length,
      finalStatus: status.status,
      finalValue: status.results ? status.results.retry_once_step : null
    },
    endCleanup: endCleanup,
    completedAt: new Date().toISOString()
  };
}
