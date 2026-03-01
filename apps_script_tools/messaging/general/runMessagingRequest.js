function astMessagingRuntimeNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingRuntimeClone(value) {
  if (value == null) {
    return value;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
}

function astMessagingBuildDryRunPlan(normalizedRequest = {}, resolvedConfig = {}) {
  return {
    operation: normalizedRequest.operation,
    channel: normalizedRequest.channel,
    source: {
      transport: resolvedConfig.transport || null,
      timeoutMs: resolvedConfig.timeoutMs,
      retries: resolvedConfig.retries
    },
    body: astMessagingRuntimeClone(normalizedRequest.body),
    auth: astMessagingRuntimeClone(normalizedRequest.auth),
    options: astMessagingRuntimeClone(normalizedRequest.options)
  };
}

function astMessagingTelemetryStart(normalizedRequest = {}) {
  if (!normalizedRequest.options || !normalizedRequest.options.telemetry || normalizedRequest.options.telemetry.enabled !== true) {
    return null;
  }

  if (typeof AST_TELEMETRY !== 'undefined' && AST_TELEMETRY && typeof AST_TELEMETRY.startSpan === 'function') {
    return AST_TELEMETRY.startSpan(
      `${astMessagingRuntimeNormalizeString(normalizedRequest.options.telemetry.spanPrefix, 'messaging')}.${normalizedRequest.operation}`,
      {
        operation: normalizedRequest.operation,
        channel: normalizedRequest.channel
      }
    );
  }

  return null;
}

function astMessagingTelemetryEnd(span, result = {}, error = null) {
  if (!span) {
    return;
  }

  if (typeof AST_TELEMETRY !== 'undefined' && AST_TELEMETRY && typeof AST_TELEMETRY.endSpan === 'function') {
    AST_TELEMETRY.endSpan(span.spanId || span, {
      status: error ? 'error' : 'ok',
      result: result || {},
      error: error
        ? {
            name: error.name || 'Error',
            message: error.message || String(error)
          }
        : null
    });
  }
}

function astMessagingDispatchTrackingOperation(normalizedRequest = {}, resolvedConfig = {}) {
  switch (normalizedRequest.operation) {
    case 'tracking_build_pixel_url':
      return astMessagingBuildPixelUrl(normalizedRequest, resolvedConfig);
    case 'tracking_wrap_links':
      return astMessagingWrapLinks(normalizedRequest, resolvedConfig);
    case 'tracking_record_event':
      return astMessagingRecordTrackingEvent(normalizedRequest, resolvedConfig);
    case 'tracking_handle_web_event':
      return astMessagingHandleWebEvent(normalizedRequest.body || normalizedRequest, resolvedConfig);
    case 'logs_list':
      return astMessagingLogList(normalizedRequest, resolvedConfig);
    case 'logs_get':
      return astMessagingLogGet(normalizedRequest, resolvedConfig);
    case 'logs_delete':
      return astMessagingLogDelete(normalizedRequest, resolvedConfig);
    default:
      throw new AstMessagingCapabilityError('Unsupported tracking/log messaging operation', {
        operation: normalizedRequest.operation
      });
  }
}

function astMessagingDispatchOperation(normalizedRequest = {}, resolvedConfig = {}) {
  if (normalizedRequest.channel === 'email') {
    return astMessagingRunEmailOperation(normalizedRequest, resolvedConfig);
  }

  if (normalizedRequest.channel === 'chat') {
    return astMessagingRunChatOperation(normalizedRequest, resolvedConfig);
  }

  if (normalizedRequest.channel === 'tracking') {
    return astMessagingDispatchTrackingOperation(normalizedRequest, resolvedConfig);
  }

  throw new AstMessagingCapabilityError('Unsupported messaging channel', {
    channel: normalizedRequest.channel,
    operation: normalizedRequest.operation
  });
}

function astMessagingBuildTransport(result = {}, normalizedRequest = {}, resolvedConfig = {}) {
  if (result && typeof result.transport === 'string' && result.transport.trim()) {
    return result.transport;
  }

  if (normalizedRequest.channel === 'email') {
    return 'gmailapp';
  }

  if (normalizedRequest.channel === 'chat') {
    const resolved = astMessagingResolveChatTransport(normalizedRequest, resolvedConfig);
    return resolved;
  }

  if (normalizedRequest.channel === 'tracking') {
    return 'internal';
  }

  return null;
}

function astMessagingBuildTrackingFromResult(result = {}) {
  if (!result || typeof result !== 'object') {
    return {};
  }

  if (result.tracking && typeof result.tracking === 'object') {
    return result.tracking;
  }

  if (result.deliveryId || result.trackingHash) {
    return {
      deliveryId: result.deliveryId || null,
      trackingHash: result.trackingHash || null,
      pixelUrl: result.pixelUrl || null,
      clickWrapped: result.clickWrapped === true
    };
  }

  return {};
}

function astMessagingShouldWriteDeliveryLog(normalizedRequest = {}) {
  return astMessagingIsMutationOperation(normalizedRequest.operation);
}

function astMessagingWriteDeliveryLog(normalizedRequest = {}, result = {}, resolvedConfig = {}) {
  if (!astMessagingShouldWriteDeliveryLog(normalizedRequest)) {
    return {};
  }

  return astMessagingLogWrite({
    operation: normalizedRequest.operation,
    channel: normalizedRequest.channel,
    status: 'ok',
    payload: {
      request: {
        body: astMessagingRuntimeClone(normalizedRequest.body)
      },
      result: astMessagingRuntimeClone(result)
    },
    metadata: {
      transport: astMessagingBuildTransport(result, normalizedRequest, resolvedConfig)
    }
  }, resolvedConfig);
}

function astRunMessagingRequest(request = {}) {
  const normalizedRequest = astMessagingValidateRequest(request);
  const resolvedConfig = astMessagingResolveConfig(normalizedRequest);
  const operationSpec = astMessagingGetOperationSpec(normalizedRequest.operation);
  const span = astMessagingTelemetryStart(normalizedRequest);

  try {
    if (normalizedRequest.options.dryRun === true && operationSpec && operationSpec.mutation === true) {
      const plan = astMessagingBuildDryRunPlan(normalizedRequest, resolvedConfig);
      const response = astMessagingNormalizeResponse({
        operation: normalizedRequest.operation,
        channel: normalizedRequest.channel,
        transport: astMessagingBuildTransport({}, normalizedRequest, resolvedConfig),
        data: {},
        dryRunPlan: plan,
        warnings: [],
        includeRaw: normalizedRequest.options.includeRaw,
        raw: null
      });
      astMessagingTelemetryEnd(span, response, null);
      return response;
    }

    if (astMessagingShouldEnqueueAsync(normalizedRequest, resolvedConfig)) {
      const queued = astMessagingEnqueueAsync(normalizedRequest, resolvedConfig);
      const response = astMessagingNormalizeResponse({
        operation: normalizedRequest.operation,
        channel: normalizedRequest.channel,
        transport: astMessagingBuildTransport({}, normalizedRequest, resolvedConfig),
        data: queued,
        warnings: [],
        includeRaw: normalizedRequest.options.includeRaw,
        raw: null
      });
      astMessagingTelemetryEnd(span, response, null);
      return response;
    }

    const idempotencyKey = astMessagingBuildIdempotencyKey(normalizedRequest, resolvedConfig);
    if (idempotencyKey) {
      const replay = astMessagingIdempotencyGet(idempotencyKey, resolvedConfig);
      if (replay) {
        const replayResponse = astMessagingRuntimeClone(replay);
        replayResponse.warnings = Array.isArray(replayResponse.warnings)
          ? replayResponse.warnings.concat(['idempotentReplay=true'])
          : ['idempotentReplay=true'];
        astMessagingTelemetryEnd(span, replayResponse, null);
        return replayResponse;
      }
    }

    const warnings = [];
    const result = astMessagingDispatchOperation(normalizedRequest, resolvedConfig);
    const tracking = astMessagingBuildTrackingFromResult(result);
    let log = {};
    try {
      log = astMessagingWriteDeliveryLog(normalizedRequest, result, resolvedConfig);
    } catch (_logError) {
      warnings.push('deliveryLogWriteFailed=true');
    }

    const response = astMessagingNormalizeResponse({
      operation: normalizedRequest.operation,
      channel: normalizedRequest.channel,
      transport: astMessagingBuildTransport(result, normalizedRequest, resolvedConfig),
      data: result,
      tracking,
      log,
      warnings,
      includeRaw: normalizedRequest.options.includeRaw,
      raw: result && Object.prototype.hasOwnProperty.call(result, 'raw')
        ? result.raw
        : null
    });

    if (idempotencyKey) {
      astMessagingIdempotencySet(idempotencyKey, response, resolvedConfig);
    }

    astMessagingTelemetryEnd(span, response, null);
    return response;
  } catch (error) {
    astMessagingTelemetryEnd(span, null, error);
    throw error;
  }
}
