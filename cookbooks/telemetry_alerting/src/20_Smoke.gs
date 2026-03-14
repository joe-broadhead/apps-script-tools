function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  cookbookConfigureTelemetry_(ASTX, config);

  const run = cookbookBuildRunContext_('smoke');
  const traces = cookbookRecordSmokeTraces_(ASTX, run);
  const query = ASTX.Telemetry.query({
    filters: {
      traceIds: [run.traceId],
      types: ['span', 'event']
    },
    includeRaw: true,
    page: {
      limit: 100,
      offset: 0
    },
    sort: {
      by: 'timestamp',
      direction: 'asc'
    }
  });
  const aggregate = ASTX.Telemetry.aggregate({
    filters: {
      traceIds: [run.traceId],
      types: ['span']
    },
    groupBy: ['module', 'name']
  });

  const createdRule = ASTX.Telemetry.createAlertRule(
    cookbookBuildAlertRule_(run, config),
    { upsert: true }
  );
  const listedRules = ASTX.Telemetry.listAlertRules({
    ruleIds: [run.ruleId]
  });
  const evaluated = ASTX.Telemetry.evaluateAlerts({
    ruleIds: [run.ruleId],
    notify: false,
    dryRun: true,
    includeSuppressed: true
  });
  const triggeredAlerts = evaluated.items.filter(function (item) {
    return item && item.status === 'triggered';
  });
  cookbookAssert_(triggeredAlerts.length > 0, 'Expected smoke alert rule to trigger.');
  const notification = ASTX.Telemetry.notifyAlert({
    alerts: triggeredAlerts,
    channels: cookbookBuildNotificationChannels_(config),
    dryRun: true
  });
  const trace = ASTX.Telemetry.getTrace(run.traceId);
  const flush = ASTX.Telemetry.flush();

  return {
    status: 'ok',
    entrypoint: 'runCookbookSmoke',
    cookbook: cookbookName_(),
    appName: config.TELEMETRY_COOKBOOK_APP_NAME,
    astVersion: ASTX.VERSION || 'unknown',
    sink: config.TELEMETRY_COOKBOOK_SINK,
    flushMode: config.TELEMETRY_COOKBOOK_FLUSH_MODE,
    traceId: run.traceId,
    spansRecorded: trace && Array.isArray(trace.spans) ? trace.spans.length : 0,
    eventsRecorded: trace && Array.isArray(trace.events) ? trace.events.length : 0,
    queriedRecords: query && query.page ? query.page.total : 0,
    redactionPreview: cookbookBuildRedactionPreview_(query),
    aggregatePreview: aggregate && Array.isArray(aggregate.items) ? aggregate.items.slice(0, 3) : [],
    alertRule: createdRule && createdRule.rule ? {
      id: createdRule.rule.id,
      metric: createdRule.rule.metric,
      threshold: createdRule.rule.threshold
    } : null,
    listedRuleCount: listedRules && listedRules.page ? listedRules.page.total : 0,
    evaluationSummary: evaluated ? evaluated.summary : null,
    notificationDryRun: notification,
    flush: flush,
    traces: traces
  };
}
