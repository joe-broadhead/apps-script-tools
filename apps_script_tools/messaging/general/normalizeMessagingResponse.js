function astMessagingNormalizeResponseObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function astMessagingNormalizeResponseArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function astMessagingNormalizeDryRunPlan(plan) {
  if (plan && typeof plan === 'object' && !Array.isArray(plan)) {
    return {
      enabled: true,
      plannedRequest: plan
    };
  }

  return {
    enabled: false,
    plannedRequest: null
  };
}

function astMessagingNormalizeResponse(args = {}) {
  const operation = args.operation || null;
  const channel = args.channel || null;
  const transport = args.transport || null;

  return {
    status: 'ok',
    operation,
    channel,
    transport,
    data: astMessagingNormalizeResponseObject(args.data),
    tracking: astMessagingNormalizeResponseObject(args.tracking),
    log: astMessagingNormalizeResponseObject(args.log),
    dryRun: astMessagingNormalizeDryRunPlan(args.dryRunPlan),
    warnings: astMessagingNormalizeResponseArray(args.warnings),
    raw: args.includeRaw === true
      ? (typeof args.raw === 'undefined' ? null : args.raw)
      : null
  };
}
