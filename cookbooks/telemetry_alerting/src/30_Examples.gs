function cookbookModule_() {
  return 'cookbooks.telemetry_alerting';
}

function cookbookNowTag_() {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 17);
}

function cookbookAssert_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Cookbook assertion failed.');
  }
}

function cookbookSplitCsv_(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map(function (item) {
      return item.trim();
    })
    .filter(function (item) {
      return item !== '';
    });
}

function cookbookBuildRunContext_(mode) {
  const stamp = cookbookNowTag_();
  return {
    cookbook: cookbookName_(),
    module: cookbookModule_(),
    mode: mode,
    traceId: 'trace_' + cookbookName_() + '_' + mode + '_' + stamp,
    ruleId: 'alert.' + cookbookName_() + '.' + mode + '.' + stamp,
    labels: ['cookbook', cookbookName_(), mode]
  };
}

function cookbookConfigureTelemetry_(ASTX, config) {
  ASTX.Telemetry.clearConfig();
  ASTX.Telemetry.configure({
    sink: config.TELEMETRY_COOKBOOK_SINK,
    flushMode: config.TELEMETRY_COOKBOOK_FLUSH_MODE,
    sampleRate: 1,
    maxTraceCount: config.TELEMETRY_COOKBOOK_MAX_TRACES,
    batchMaxEvents: config.TELEMETRY_COOKBOOK_BATCH_MAX_EVENTS,
    driveFolderId: config.TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID,
    driveFileName: config.TELEMETRY_COOKBOOK_DRIVE_FILE_NAME,
    storageUri: config.TELEMETRY_COOKBOOK_STORAGE_URI,
    redactSecrets: true
  }, {
    merge: false
  });
}

function cookbookBuildNotificationChannels_(config) {
  const channels = {
    logger: true
  };
  if (config.TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK) {
    channels.chatWebhookUrl = config.TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK;
  }
  const emailTo = cookbookSplitCsv_(config.TELEMETRY_COOKBOOK_NOTIFY_EMAIL_TO);
  if (emailTo.length > 0) {
    channels.emailTo = emailTo;
    channels.emailSubjectPrefix = '[' + cookbookName_() + ']';
  }
  return channels;
}

function cookbookBuildAlertRule_(run, config) {
  return {
    id: run.ruleId,
    name: config.TELEMETRY_COOKBOOK_APP_NAME + ' error count',
    metric: 'error_count',
    operator: 'gte',
    threshold: config.TELEMETRY_COOKBOOK_ALERT_THRESHOLD,
    windowSec: 300,
    suppressionSec: 600,
    minSamples: 1,
    query: {
      filters: {
        traceIds: [run.traceId],
        types: ['span']
      }
    },
    labels: run.labels,
    channels: cookbookBuildNotificationChannels_(config)
  };
}

function cookbookRecordSmokeTraces_(ASTX, run) {
  const successSpanId = ASTX.Telemetry.startSpan('telemetry.cookbook.ingest', {
    traceId: run.traceId,
    module: run.module,
    cookbook: run.cookbook,
    mode: run.mode,
    apiKey: 'secret-value'
  });
  ASTX.Telemetry.recordEvent({
    traceId: run.traceId,
    spanId: successSpanId,
    name: 'telemetry.cookbook.rows_loaded',
    level: 'info',
    payload: {
      rows: 3,
      token: 'top-secret-token'
    }
  });
  const success = ASTX.Telemetry.endSpan(successSpanId, {
    status: 'ok',
    result: {
      rows: 3,
      total: 42
    }
  });

  const errorSpanId = ASTX.Telemetry.startSpan('telemetry.cookbook.publish', {
    traceId: run.traceId,
    module: run.module,
    cookbook: run.cookbook,
    mode: run.mode,
    authorization: 'Bearer cookbook-secret'
  });
  ASTX.Telemetry.recordEvent({
    traceId: run.traceId,
    spanId: errorSpanId,
    name: 'telemetry.cookbook.publish_failed',
    level: 'error',
    payload: {
      step: 'publish',
      secret: 'should-redact'
    }
  });
  const failure = ASTX.Telemetry.endSpan(errorSpanId, {
    status: 'error',
    error: new Error('synthetic cookbook failure')
  });

  return {
    success: {
      spanId: successSpanId,
      traceId: run.traceId,
      status: success.status
    },
    failure: {
      spanId: errorSpanId,
      traceId: run.traceId,
      status: failure.status
    }
  };
}

function cookbookBuildRedactionPreview_(query) {
  const items = query && Array.isArray(query.items) ? query.items : [];
  let spanPreview = null;
  let eventPreview = null;

  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx];
    if (!spanPreview && item && item.type === 'span') {
      spanPreview = {
        name: item.name,
        apiKey: item.raw && item.raw.context ? item.raw.context.apiKey : null,
        authorization: item.raw && item.raw.context ? item.raw.context.authorization : null
      };
    }
    if (!eventPreview && item && item.type === 'event') {
      eventPreview = {
        name: item.name,
        token: item.raw && item.raw.payload ? item.raw.payload.token : null,
        secret: item.raw && item.raw.payload ? item.raw.payload.secret : null
      };
    }
  }

  return {
    span: spanPreview,
    event: eventPreview
  };
}

function cookbookBuildExportPreview_(data) {
  if (data == null) {
    return null;
  }
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return text.length > 240 ? text.slice(0, 240) + '...' : text;
}

function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  cookbookConfigureTelemetry_(ASTX, config);

  const run = cookbookBuildRunContext_('demo');
  const baseTotal = ASTX.TelemetryHelpers.withSpan(
    'telemetry.cookbook.load_config',
    {
      traceId: run.traceId,
      module: run.module,
      cookbook: run.cookbook,
      mode: run.mode
    },
    function () {
      ASTX.Telemetry.recordEvent({
        traceId: run.traceId,
        name: 'telemetry.cookbook.config_loaded',
        level: 'info',
        payload: {
          sink: config.TELEMETRY_COOKBOOK_SINK,
          appName: config.TELEMETRY_COOKBOOK_APP_NAME
        }
      });
      return ASTX.Utils.arraySum([2, 4, 6, 8]);
    },
    {
      includeResult: true
    }
  );

  const wrappedTransform = ASTX.TelemetryHelpers.wrap(
    'telemetry.cookbook.transform',
    function (values) {
      const output = [];
      for (let idx = 0; idx < values.length; idx += 1) {
        output.push(values[idx] * 2);
      }
      ASTX.Telemetry.recordEvent({
        traceId: run.traceId,
        name: 'telemetry.cookbook.transform_complete',
        level: 'info',
        payload: {
          count: output.length,
          maxValue: output.length > 0 ? Math.max.apply(null, output) : 0
        }
      });
      return output;
    },
    {
      contextFactory: function (args) {
        return {
          traceId: run.traceId,
          module: run.module,
          cookbook: run.cookbook,
          mode: run.mode,
          inputCount: Array.isArray(args[0]) ? args[0].length : 0
        };
      },
      includeResult: true
    }
  );

  const transformed = wrappedTransform([baseTotal, baseTotal + 1, baseTotal + 2]);
  const transformedSum = ASTX.Utils.arraySum(transformed);
  cookbookAssert_(transformedSum > baseTotal, 'Expected wrapped transform output to increase the total.');

  const aggregate = ASTX.Telemetry.aggregate({
    filters: {
      traceIds: [run.traceId],
      types: ['span']
    },
    groupBy: ['name']
  });
  const exported = ASTX.Telemetry.export({
    format: config.TELEMETRY_COOKBOOK_EXPORT_FORMAT,
    query: {
      filters: {
        traceIds: [run.traceId]
      },
      page: {
        limit: 1000,
        offset: 0
      }
    },
    includeData: true
  });
  const trace = ASTX.Telemetry.getTrace(run.traceId);
  const flush = ASTX.Telemetry.flush();

  return {
    status: 'ok',
    entrypoint: 'runCookbookDemo',
    cookbook: cookbookName_(),
    appName: config.TELEMETRY_COOKBOOK_APP_NAME,
    traceId: run.traceId,
    helperUsage: {
      withSpan: 'telemetry.cookbook.load_config',
      wrap: 'telemetry.cookbook.transform'
    },
    totals: {
      baseTotal: baseTotal,
      transformed: transformed,
      transformedSum: transformedSum
    },
    aggregatePreview: aggregate && Array.isArray(aggregate.items) ? aggregate.items.slice(0, 3) : [],
    export: exported ? {
      format: exported.format,
      count: exported.count,
      bytes: exported.bytes,
      destination: exported.destination,
      preview: cookbookBuildExportPreview_(exported.data)
    } : null,
    traceSummary: trace ? {
      status: trace.status,
      spans: Array.isArray(trace.spans) ? trace.spans.length : 0,
      events: Array.isArray(trace.events) ? trace.events.length : 0
    } : null,
    flush: flush
  };
}
