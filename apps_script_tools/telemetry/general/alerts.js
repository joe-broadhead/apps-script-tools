const AST_TELEMETRY_ALERT_RULES = {};
const AST_TELEMETRY_ALERT_RULE_ORDER = [];
const AST_TELEMETRY_ALERT_SUPPRESSION_STATE = {};

const AST_TELEMETRY_ALERT_DEFAULTS = Object.freeze({
  enabled: true,
  metric: 'error_count',
  operator: 'gte',
  threshold: 1,
  windowSec: 300,
  suppressionSec: 300,
  minSamples: 1,
  dimensions: [],
  channels: {
    logger: true,
    chatWebhookUrl: null,
    emailTo: [],
    emailSubjectPrefix: '[AST Telemetry Alert]'
  }
});

const AST_TELEMETRY_ALERT_ALLOWED_METRICS = Object.freeze([
  'count',
  'error_count',
  'error_rate',
  'p95_duration_ms',
  'avg_duration_ms'
]);

const AST_TELEMETRY_ALERT_ALLOWED_OPERATORS = Object.freeze([
  'gt',
  'gte',
  'lt',
  'lte',
  'eq',
  'neq'
]);

const AST_TELEMETRY_ALERT_ALLOWED_DIMENSIONS = Object.freeze([
  'type',
  'module',
  'name',
  'status',
  'level',
  'traceId'
]);

function astTelemetryResetAlertState() {
  Object.keys(AST_TELEMETRY_ALERT_RULES).forEach(ruleId => {
    delete AST_TELEMETRY_ALERT_RULES[ruleId];
  });
  AST_TELEMETRY_ALERT_RULE_ORDER.length = 0;

  Object.keys(AST_TELEMETRY_ALERT_SUPPRESSION_STATE).forEach(suppressionKey => {
    delete AST_TELEMETRY_ALERT_SUPPRESSION_STATE[suppressionKey];
  });
}

function astTelemetryAlertNormalizeStringList(value) {
  if (typeof value === 'undefined' || value === null) {
    return [];
  }

  const source = Array.isArray(value) ? value : [value];
  const output = [];
  const seen = {};

  for (let idx = 0; idx < source.length; idx += 1) {
    const normalized = astTelemetryNormalizeString(source[idx], null);
    if (!normalized) {
      continue;
    }

    const lowerKey = normalized.toLowerCase();
    if (seen[lowerKey]) {
      continue;
    }
    seen[lowerKey] = true;
    output.push(normalized);
  }

  return output;
}

function astTelemetryAlertNormalizeChannels(channels = {}) {
  if (!astTelemetryIsPlainObject(channels)) {
    throw new AstTelemetryValidationError('Telemetry alert channels must be an object');
  }

  const normalized = {
    logger: astTelemetryNormalizeBoolean(
      channels.logger,
      AST_TELEMETRY_ALERT_DEFAULTS.channels.logger
    ),
    chatWebhookUrl: null,
    emailTo: [],
    emailSubjectPrefix: astTelemetryNormalizeString(
      channels.emailSubjectPrefix,
      AST_TELEMETRY_ALERT_DEFAULTS.channels.emailSubjectPrefix
    )
  };

  const chatWebhookUrl = astTelemetryNormalizeString(channels.chatWebhookUrl, null);
  if (chatWebhookUrl) {
    if (!/^https:\/\//i.test(chatWebhookUrl)) {
      throw new AstTelemetryValidationError(
        'Telemetry alert chatWebhookUrl must use https://',
        { chatWebhookUrl }
      );
    }
    normalized.chatWebhookUrl = chatWebhookUrl;
  }

  const emailValues = astTelemetryAlertNormalizeStringList(channels.emailTo).map(value => value.toLowerCase());
  for (let idx = 0; idx < emailValues.length; idx += 1) {
    const email = emailValues[idx];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AstTelemetryValidationError('Telemetry alert emailTo contains invalid email address', {
        email
      });
    }
  }
  normalized.emailTo = emailValues;

  return normalized;
}

function astTelemetryAlertNormalizeRuleQuery(query = {}) {
  if (!astTelemetryIsPlainObject(query)) {
    throw new AstTelemetryValidationError('Telemetry alert query must be an object');
  }

  const copy = astTelemetryDeepClone(query);
  delete copy.page;
  delete copy.includeRaw;

  const filters = astTelemetryIsPlainObject(copy.filters)
    ? astTelemetryDeepClone(copy.filters)
    : {};
  delete filters.from;
  delete filters.to;
  copy.filters = filters;

  const normalized = astTelemetryNormalizeQueryRequest(copy);
  return astTelemetryBuildQueryPublicShape({
    source: normalized.source,
    filters: normalized.filters,
    page: {
      limit: 100,
      offset: 0
    },
    sort: normalized.sort,
    includeRaw: false
  });
}

function astTelemetryAlertNormalizeRule(request = {}, options = {}) {
  const source = astTelemetryIsPlainObject(request.rule) ? request.rule : request;
  if (!astTelemetryIsPlainObject(source)) {
    throw new AstTelemetryValidationError('Telemetry alert rule must be an object');
  }

  const providedId = astTelemetryNormalizeString(
    source.id || source.ruleId || source.alertRuleId,
    null
  );
  const id = providedId || astTelemetryGenerateId('alert_rule');
  const name = astTelemetryNormalizeString(source.name, id);

  const enabled = astTelemetryNormalizeBoolean(source.enabled, AST_TELEMETRY_ALERT_DEFAULTS.enabled);

  const metric = astTelemetryNormalizeString(source.metric, AST_TELEMETRY_ALERT_DEFAULTS.metric);
  if (AST_TELEMETRY_ALERT_ALLOWED_METRICS.indexOf(metric) === -1) {
    throw new AstTelemetryValidationError(
      'Telemetry alert metric must be one of: count, error_count, error_rate, p95_duration_ms, avg_duration_ms',
      { metric }
    );
  }

  const thresholdObject = astTelemetryIsPlainObject(source.threshold)
    ? source.threshold
    : {};
  const operator = astTelemetryNormalizeString(
    source.operator || thresholdObject.operator || thresholdObject.op,
    AST_TELEMETRY_ALERT_DEFAULTS.operator
  );
  if (AST_TELEMETRY_ALERT_ALLOWED_OPERATORS.indexOf(operator) === -1) {
    throw new AstTelemetryValidationError(
      'Telemetry alert operator must be one of: gt, gte, lt, lte, eq, neq',
      { operator }
    );
  }

  const thresholdCandidate = typeof source.threshold === 'number'
    ? source.threshold
    : thresholdObject.value;
  const threshold = astTelemetryNormalizeNumber(
    thresholdCandidate,
    AST_TELEMETRY_ALERT_DEFAULTS.threshold,
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER
  );

  const windowSecSource = typeof source.windowSec !== 'undefined'
    ? source.windowSec
    : (astTelemetryIsPlainObject(source.window) ? source.window.seconds : undefined);
  const windowSec = astTelemetryNormalizeNumber(
    windowSecSource,
    AST_TELEMETRY_ALERT_DEFAULTS.windowSec,
    10,
    86400
  );

  const suppressionSecSource = typeof source.suppressionSec !== 'undefined'
    ? source.suppressionSec
    : (astTelemetryIsPlainObject(source.suppression) ? source.suppression.seconds : undefined);
  const suppressionSec = astTelemetryNormalizeNumber(
    suppressionSecSource,
    AST_TELEMETRY_ALERT_DEFAULTS.suppressionSec,
    0,
    86400
  );

  const minSamplesSource = typeof source.minSamples !== 'undefined'
    ? source.minSamples
    : source.minSampleSize;
  const minSamples = astTelemetryNormalizeNumber(
    minSamplesSource,
    AST_TELEMETRY_ALERT_DEFAULTS.minSamples,
    1,
    1000000
  );

  const dimensionValues = astTelemetryAlertNormalizeStringList(
    source.dimensions || source.groupBy
  );
  const dimensions = [];
  for (let idx = 0; idx < dimensionValues.length; idx += 1) {
    const field = dimensionValues[idx];
    if (AST_TELEMETRY_ALERT_ALLOWED_DIMENSIONS.indexOf(field) === -1) {
      throw new AstTelemetryValidationError(
        'Telemetry alert dimensions must be one of: type, module, name, status, level, traceId',
        { field }
      );
    }
    if (dimensions.indexOf(field) === -1) {
      dimensions.push(field);
    }
  }

  const query = astTelemetryAlertNormalizeRuleQuery(
    astTelemetryIsPlainObject(source.query) ? source.query : {}
  );

  const channels = astTelemetryAlertNormalizeChannels(
    astTelemetryIsPlainObject(source.channels)
      ? source.channels
      : AST_TELEMETRY_ALERT_DEFAULTS.channels
  );

  const nowIso = astTelemetryNowIsoString();
  const existing = AST_TELEMETRY_ALERT_RULES[id];
  const createdAt = existing && existing.createdAt ? existing.createdAt : nowIso;

  return {
    id,
    name,
    enabled,
    metric,
    operator,
    threshold,
    windowSec,
    suppressionSec,
    minSamples,
    dimensions,
    query,
    channels,
    createdAt,
    updatedAt: nowIso,
    labels: astTelemetryAlertNormalizeStringList(source.labels || source.tags)
  };
}

function astTelemetryAlertNormalizeListRequest(request = {}) {
  if (!astTelemetryIsPlainObject(request)) {
    throw new AstTelemetryValidationError('Telemetry listAlertRules request must be an object');
  }

  const pageInput = astTelemetryIsPlainObject(request.page) ? request.page : {};
  const limit = astTelemetryNormalizeNumber(pageInput.limit, 100, 1, 10000);
  const offset = astTelemetryNormalizeNumber(pageInput.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  return {
    includeDisabled: astTelemetryNormalizeBoolean(request.includeDisabled, true),
    ids: astTelemetryAlertNormalizeStringList(request.ruleIds || request.ids).map(value => value.toLowerCase()),
    query: astTelemetryNormalizeString(request.query, null),
    page: {
      limit,
      offset
    }
  };
}

function astTelemetryAlertUpsertRule(normalizedRule, options = {}) {
  const upsert = astTelemetryNormalizeBoolean(
    options.upsert,
    astTelemetryNormalizeBoolean(
      astTelemetryIsPlainObject(options) ? options.merge : false,
      false
    )
  );

  const existing = AST_TELEMETRY_ALERT_RULES[normalizedRule.id];
  if (existing && !upsert) {
    throw new AstTelemetryValidationError('Telemetry alert rule id already exists', {
      ruleId: normalizedRule.id
    });
  }

  AST_TELEMETRY_ALERT_RULES[normalizedRule.id] = astTelemetryDeepClone(normalizedRule);
  if (AST_TELEMETRY_ALERT_RULE_ORDER.indexOf(normalizedRule.id) === -1) {
    AST_TELEMETRY_ALERT_RULE_ORDER.push(normalizedRule.id);
  }

  return {
    created: !existing,
    rule: astTelemetryDeepClone(AST_TELEMETRY_ALERT_RULES[normalizedRule.id])
  };
}

function astTelemetryCreateAlertRule(request = {}, options = {}) {
  const normalizedRule = astTelemetryAlertNormalizeRule(request, options);
  const callOptions = astTelemetryIsPlainObject(options) ? options : {};
  const requestOptions = astTelemetryIsPlainObject(request.options) ? request.options : {};
  const resolvedOptions = Object.keys(callOptions).length > 0
    ? callOptions
    : requestOptions;
  const upsertResult = astTelemetryAlertUpsertRule(
    normalizedRule,
    resolvedOptions
  );

  return {
    status: 'ok',
    created: upsertResult.created,
    rule: upsertResult.rule
  };
}

function astTelemetryListAlertRules(request = {}) {
  const normalizedRequest = astTelemetryAlertNormalizeListRequest(request);
  const items = [];

  for (let idx = 0; idx < AST_TELEMETRY_ALERT_RULE_ORDER.length; idx += 1) {
    const ruleId = AST_TELEMETRY_ALERT_RULE_ORDER[idx];
    const rule = AST_TELEMETRY_ALERT_RULES[ruleId];
    if (!rule) {
      continue;
    }

    if (!normalizedRequest.includeDisabled && rule.enabled !== true) {
      continue;
    }

    if (normalizedRequest.ids.length > 0) {
      const lowerRuleId = String(rule.id || '').toLowerCase();
      if (normalizedRequest.ids.indexOf(lowerRuleId) === -1) {
        continue;
      }
    }

    if (normalizedRequest.query) {
      const query = normalizedRequest.query.toLowerCase();
      const haystack = [
        rule.id,
        rule.name,
        rule.metric,
        (rule.dimensions || []).join(' '),
        (rule.labels || []).join(' ')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (haystack.indexOf(query) === -1) {
        continue;
      }
    }

    items.push(astTelemetryDeepClone(rule));
  }

  const total = items.length;
  const offset = normalizedRequest.page.offset;
  const limit = normalizedRequest.page.limit;
  const paged = items.slice(offset, offset + limit);

  return {
    status: 'ok',
    page: {
      limit,
      offset,
      returned: paged.length,
      total,
      hasMore: offset + paged.length < total
    },
    items: paged
  };
}

function astTelemetryAlertResolveRulesForEvaluation(request = {}) {
  if (!astTelemetryIsPlainObject(request)) {
    throw new AstTelemetryValidationError('Telemetry evaluateAlerts request must be an object');
  }

  const includeDisabled = astTelemetryNormalizeBoolean(request.includeDisabled, false);
  const requestedRuleIds = astTelemetryAlertNormalizeStringList(request.ruleIds).map(value => value.toLowerCase());
  const adHocRules = Array.isArray(request.rules)
    ? request.rules
    : (astTelemetryIsPlainObject(request.rule) ? [request.rule] : []);

  const output = [];
  for (let idx = 0; idx < AST_TELEMETRY_ALERT_RULE_ORDER.length; idx += 1) {
    const ruleId = AST_TELEMETRY_ALERT_RULE_ORDER[idx];
    const storedRule = AST_TELEMETRY_ALERT_RULES[ruleId];
    if (!storedRule) {
      continue;
    }

    if (!includeDisabled && storedRule.enabled !== true) {
      continue;
    }

    if (requestedRuleIds.length > 0 && requestedRuleIds.indexOf(String(ruleId).toLowerCase()) === -1) {
      continue;
    }

    output.push(astTelemetryDeepClone(storedRule));
  }

  for (let idx = 0; idx < adHocRules.length; idx += 1) {
    const normalized = astTelemetryAlertNormalizeRule(adHocRules[idx], {});
    output.push(normalized);
  }

  output.sort((left, right) => String(left.id || '').localeCompare(String(right.id || '')));
  return output;
}

function astTelemetryAlertBuildDimensionKey(record = {}, dimensions = []) {
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    return '__all__';
  }

  const segments = [];
  for (let idx = 0; idx < dimensions.length; idx += 1) {
    const field = dimensions[idx];
    const value = typeof record[field] === 'undefined' || record[field] === null
      ? ''
      : String(record[field]);
    segments.push(`${field}=${value}`);
  }
  return segments.join('|');
}

function astTelemetryAlertBuildDimensionValues(groupKey = '__all__') {
  if (groupKey === '__all__') {
    return {};
  }

  const output = {};
  const parts = String(groupKey).split('|');
  for (let idx = 0; idx < parts.length; idx += 1) {
    const part = parts[idx];
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = part.slice(0, separatorIndex);
    const value = part.slice(separatorIndex + 1);
    output[key] = value;
  }
  return output;
}

function astTelemetryAlertIsErrorRecord(record = {}) {
  const status = String(record.status || '').toLowerCase();
  if (status === 'error') {
    return true;
  }

  if (String(record.type || '').toLowerCase() === 'event') {
    const level = String(record.level || '').toLowerCase();
    return level === 'error' || level === 'critical' || level === 'fatal';
  }

  return false;
}

function astTelemetryAlertComputeMetric(metric, records = []) {
  const sampleSize = Array.isArray(records) ? records.length : 0;
  const errorCount = records.reduce((count, record) => {
    return count + (astTelemetryAlertIsErrorRecord(record) ? 1 : 0);
  }, 0);

  if (metric === 'count') {
    return sampleSize;
  }
  if (metric === 'error_count') {
    return errorCount;
  }
  if (metric === 'error_rate') {
    if (sampleSize === 0) {
      return 0;
    }
    return (errorCount / sampleSize) * 100;
  }

  const durations = [];
  for (let idx = 0; idx < records.length; idx += 1) {
    const duration = records[idx] ? records[idx].durationMs : null;
    if (Number.isFinite(duration)) {
      durations.push(duration);
    }
  }

  if (metric === 'p95_duration_ms') {
    return astTelemetryPercentile(durations, 95);
  }
  if (metric === 'avg_duration_ms') {
    if (durations.length === 0) {
      return null;
    }
    const total = durations.reduce((sum, value) => sum + value, 0);
    return total / durations.length;
  }

  return null;
}

function astTelemetryAlertCompareThreshold(value, operator, threshold) {
  if (!Number.isFinite(value)) {
    return false;
  }

  if (operator === 'gt') {
    return value > threshold;
  }
  if (operator === 'gte') {
    return value >= threshold;
  }
  if (operator === 'lt') {
    return value < threshold;
  }
  if (operator === 'lte') {
    return value <= threshold;
  }
  if (operator === 'eq') {
    return value === threshold;
  }
  if (operator === 'neq') {
    return value !== threshold;
  }

  return false;
}

function astTelemetryAlertBuildQueryForRule(rule, fromIso, toIso) {
  const query = astTelemetryIsPlainObject(rule.query)
    ? astTelemetryDeepClone(rule.query)
    : {};

  const filters = astTelemetryIsPlainObject(query.filters)
    ? astTelemetryDeepClone(query.filters)
    : {};
  filters.from = fromIso;
  filters.to = toIso;
  query.filters = filters;
  query.page = {
    limit: 10000,
    offset: 0
  };
  query.includeRaw = false;

  return astTelemetryNormalizeQueryRequest(query);
}

function astTelemetryAlertGetSuppressionState(ruleId, groupKey) {
  const suppressionKey = `${ruleId}::${groupKey}`;
  return {
    suppressionKey,
    state: AST_TELEMETRY_ALERT_SUPPRESSION_STATE[suppressionKey] || null
  };
}

function astTelemetryAlertStoreSuppressionState(suppressionKey, nowMs, value) {
  AST_TELEMETRY_ALERT_SUPPRESSION_STATE[suppressionKey] = {
    lastTriggeredAtMs: nowMs,
    lastValue: value
  };
}

function astTelemetryAlertIsSuppressed(rule, suppressionState, nowMs) {
  if (!suppressionState) {
    return {
      suppressed: false,
      remainingMs: 0,
      until: null
    };
  }

  const suppressionMs = astTelemetryNormalizeNumber(rule.suppressionSec, 0, 0, 86400) * 1000;
  if (suppressionMs <= 0) {
    return {
      suppressed: false,
      remainingMs: 0,
      until: null
    };
  }

  const elapsedMs = nowMs - suppressionState.lastTriggeredAtMs;
  if (elapsedMs >= suppressionMs) {
    return {
      suppressed: false,
      remainingMs: 0,
      until: null
    };
  }

  const remainingMs = suppressionMs - elapsedMs;
  return {
    suppressed: true,
    remainingMs,
    until: astTelemetryTryOrFallback(
      () => new Date(nowMs + remainingMs).toISOString(),
      null
    )
  };
}

function astTelemetryNotifyAlert(request = {}) {
  if (!astTelemetryIsPlainObject(request)) {
    throw new AstTelemetryValidationError('Telemetry notifyAlert request must be an object');
  }

  const sourceAlerts = Array.isArray(request.alerts)
    ? request.alerts
    : (request.alert ? [request.alert] : []);
  if (sourceAlerts.length === 0) {
    throw new AstTelemetryValidationError('Telemetry notifyAlert requires alert or alerts');
  }

  const dryRun = astTelemetryNormalizeBoolean(request.dryRun, false);
  const explicitChannels = astTelemetryIsPlainObject(request.channels)
    ? astTelemetryAlertNormalizeChannels(request.channels)
    : null;

  const results = [];
  const notifications = [];
  let delivered = 0;

  for (let idx = 0; idx < sourceAlerts.length; idx += 1) {
    const alert = sourceAlerts[idx];
    if (!astTelemetryIsPlainObject(alert)) {
      throw new AstTelemetryValidationError('Telemetry notifyAlert alert entries must be objects');
    }

    const channels = explicitChannels || astTelemetryAlertNormalizeChannels(
      astTelemetryIsPlainObject(alert.channels) ? alert.channels : {}
    );

    const message = [
      `Telemetry alert triggered: ${alert.ruleName || alert.ruleId || 'rule'}`,
      `metric=${alert.metric}`,
      `value=${alert.value}`,
      `threshold=${alert.operator} ${alert.threshold}`,
      `sampleSize=${alert.sampleSize}`,
      `dimension=${alert.groupKey || '__all__'}`,
      `window=${alert.window && alert.window.from ? alert.window.from : '?'} -> ${alert.window && alert.window.to ? alert.window.to : '?'}`
    ].join('\n');

    const subjectPrefix = astTelemetryNormalizeString(
      channels.emailSubjectPrefix,
      AST_TELEMETRY_ALERT_DEFAULTS.channels.emailSubjectPrefix
    );
    const subject = `${subjectPrefix} ${alert.ruleName || alert.ruleId || 'Telemetry alert'}`;

    const channelResults = [];

    if (channels.logger) {
      if (!dryRun && typeof Logger !== 'undefined' && Logger && typeof Logger.log === 'function') {
        Logger.log(message);
      }
      channelResults.push({
        channel: 'logger',
        status: 'ok'
      });
      delivered += 1;
    }

    if (channels.chatWebhookUrl) {
      if (!dryRun) {
        if (typeof UrlFetchApp === 'undefined' || !UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
          throw new AstTelemetryCapabilityError('UrlFetchApp.fetch is required for telemetry chat notifications');
        }
        const response = UrlFetchApp.fetch(channels.chatWebhookUrl, {
          method: 'post',
          contentType: 'application/json; charset=UTF-8',
          muteHttpExceptions: true,
          payload: JSON.stringify({ text: message })
        });
        const statusCode = astTelemetryTryOrFallback(
          () => Number(response.getResponseCode()),
          0
        );
        if (!Number.isFinite(statusCode) || statusCode < 200 || statusCode >= 300) {
          throw new AstTelemetryError('Telemetry chat notification failed', {
            statusCode
          });
        }
      }
      channelResults.push({
        channel: 'chat_webhook',
        status: 'ok'
      });
      delivered += 1;
    }

    if (channels.emailTo.length > 0) {
      if (!dryRun) {
        const recipient = channels.emailTo.join(',');
        if (typeof MailApp !== 'undefined' && MailApp && typeof MailApp.sendEmail === 'function') {
          MailApp.sendEmail(recipient, subject, message);
        } else if (
          typeof GmailApp !== 'undefined'
          && GmailApp
          && typeof GmailApp.sendEmail === 'function'
        ) {
          GmailApp.sendEmail(recipient, subject, message);
        } else {
          throw new AstTelemetryCapabilityError(
            'MailApp.sendEmail or GmailApp.sendEmail is required for telemetry email notifications'
          );
        }
      }
      channelResults.push({
        channel: 'email',
        status: 'ok',
        recipients: channels.emailTo.slice()
      });
      delivered += 1;
    }

    notifications.push({
      alertId: alert.alertId || null,
      ruleId: alert.ruleId || null,
      channels: channels
    });

    results.push({
      alertId: alert.alertId || null,
      ruleId: alert.ruleId || null,
      channels: channelResults
    });
  }

  return {
    status: 'ok',
    dryRun,
    attempted: sourceAlerts.length,
    delivered,
    results,
    notifications
  };
}

function astTelemetryEvaluateAlerts(request = {}) {
  if (!astTelemetryIsPlainObject(request)) {
    throw new AstTelemetryValidationError('Telemetry evaluateAlerts request must be an object');
  }

  const rules = astTelemetryAlertResolveRulesForEvaluation(request);
  const dryRun = astTelemetryNormalizeBoolean(request.dryRun, false);
  const notify = astTelemetryNormalizeBoolean(request.notify, false);
  const nowCandidate = astTelemetryNormalizeTimeValue(request.now, 'now');
  const nowMs = nowCandidate == null ? new Date().getTime() : nowCandidate;
  const nowIso = astTelemetryTryOrFallback(() => new Date(nowMs).toISOString(), astTelemetryNowIsoString());

  const includeSuppressed = astTelemetryNormalizeBoolean(request.includeSuppressed, true);

  const items = [];
  const notifications = [];
  const summary = {
    evaluatedRules: rules.length,
    triggered: 0,
    suppressed: 0,
    ok: 0,
    insufficientSamples: 0,
    notified: 0
  };

  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
    const rule = rules[ruleIndex];
    if (rule.enabled !== true) {
      continue;
    }

    const windowFromMs = nowMs - (rule.windowSec * 1000);
    const windowFromIso = astTelemetryTryOrFallback(
      () => new Date(windowFromMs).toISOString(),
      nowIso
    );
    const normalizedQuery = astTelemetryAlertBuildQueryForRule(rule, windowFromIso, nowIso);
    const queryResult = astTelemetryQueryInternal(normalizedQuery);
    const matchedRecords = queryResult.matchedRecords || [];

    const grouped = {};
    for (let idx = 0; idx < matchedRecords.length; idx += 1) {
      const record = matchedRecords[idx];
      const groupKey = astTelemetryAlertBuildDimensionKey(record, rule.dimensions);
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(record);
    }

    const groupKeys = Object.keys(grouped);
    if (groupKeys.length === 0) {
      groupKeys.push('__all__');
      grouped.__all__ = [];
    }
    groupKeys.sort();

    for (let keyIndex = 0; keyIndex < groupKeys.length; keyIndex += 1) {
      const groupKey = groupKeys[keyIndex];
      const records = grouped[groupKey];
      const sampleSize = records.length;

      if (sampleSize < rule.minSamples) {
        const insufficientItem = {
          alertId: null,
          status: 'insufficient_samples',
          ruleId: rule.id,
          ruleName: rule.name,
          metric: rule.metric,
          operator: rule.operator,
          threshold: rule.threshold,
          value: null,
          sampleSize,
          minSamples: rule.minSamples,
          dimensions: astTelemetryAlertBuildDimensionValues(groupKey),
          groupKey,
          window: {
            from: windowFromIso,
            to: nowIso
          },
          channels: astTelemetryDeepClone(rule.channels)
        };
        items.push(insufficientItem);
        summary.insufficientSamples += 1;
        continue;
      }

      const value = astTelemetryAlertComputeMetric(rule.metric, records);
      const triggered = astTelemetryAlertCompareThreshold(value, rule.operator, rule.threshold);

      if (!triggered) {
        items.push({
          alertId: null,
          status: 'ok',
          ruleId: rule.id,
          ruleName: rule.name,
          metric: rule.metric,
          operator: rule.operator,
          threshold: rule.threshold,
          value,
          sampleSize,
          dimensions: astTelemetryAlertBuildDimensionValues(groupKey),
          groupKey,
          window: {
            from: windowFromIso,
            to: nowIso
          },
          channels: astTelemetryDeepClone(rule.channels)
        });
        summary.ok += 1;
        continue;
      }

      const suppressionInfo = astTelemetryAlertGetSuppressionState(rule.id, groupKey);
      const suppression = astTelemetryAlertIsSuppressed(
        rule,
        suppressionInfo.state,
        nowMs
      );

      const alertId = astTelemetryGenerateId('alert');
      const alertItem = {
        alertId,
        status: suppression.suppressed ? 'suppressed' : 'triggered',
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        operator: rule.operator,
        threshold: rule.threshold,
        value,
        sampleSize,
        dimensions: astTelemetryAlertBuildDimensionValues(groupKey),
        groupKey,
        window: {
          from: windowFromIso,
          to: nowIso
        },
        suppression: {
          enabled: rule.suppressionSec > 0,
          seconds: rule.suppressionSec,
          remainingMs: suppression.remainingMs,
          until: suppression.until
        },
        channels: astTelemetryDeepClone(rule.channels)
      };

      if (suppression.suppressed) {
        if (includeSuppressed) {
          items.push(alertItem);
        }
        summary.suppressed += 1;
        continue;
      }

      if (!dryRun) {
        astTelemetryAlertStoreSuppressionState(
          suppressionInfo.suppressionKey,
          nowMs,
          value
        );
      }

      items.push(alertItem);
      summary.triggered += 1;

      if (notify) {
        try {
          const notifyResult = astTelemetryNotifyAlert({
            alert: alertItem,
            channels: astTelemetryIsPlainObject(request.channels) ? request.channels : rule.channels,
            dryRun
          });
          notifications.push(notifyResult);
          summary.notified += notifyResult.delivered;
        } catch (error) {
          notifications.push({
            status: 'error',
            alertId: alertId,
            ruleId: rule.id,
            error: {
              name: error && error.name ? String(error.name) : 'Error',
              message: error && error.message ? String(error.message) : String(error)
            }
          });
        }

        astTelemetryTryOrFallback(() => astTelemetryRecordEvent({
          traceId: null,
          spanId: null,
          name: 'telemetry.alert.triggered',
          level: 'warning',
          payload: {
            ruleId: rule.id,
            ruleName: rule.name,
            alertId,
            metric: rule.metric,
            value,
            threshold: rule.threshold,
            operator: rule.operator,
            groupKey
          }
        }), null);
      }
    }
  }

  return {
    status: 'ok',
    evaluatedAt: nowIso,
    dryRun,
    notify,
    summary,
    items,
    notifications
  };
}

const __astTelemetryAlertsRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astTelemetryAlertsRoot.astTelemetryCreateAlertRule = astTelemetryCreateAlertRule;
__astTelemetryAlertsRoot.astTelemetryListAlertRules = astTelemetryListAlertRules;
__astTelemetryAlertsRoot.astTelemetryEvaluateAlerts = astTelemetryEvaluateAlerts;
__astTelemetryAlertsRoot.astTelemetryNotifyAlert = astTelemetryNotifyAlert;
__astTelemetryAlertsRoot.astTelemetryResetAlertState = astTelemetryResetAlertState;
this.astTelemetryCreateAlertRule = astTelemetryCreateAlertRule;
this.astTelemetryListAlertRules = astTelemetryListAlertRules;
this.astTelemetryEvaluateAlerts = astTelemetryEvaluateAlerts;
this.astTelemetryNotifyAlert = astTelemetryNotifyAlert;
this.astTelemetryResetAlertState = astTelemetryResetAlertState;
