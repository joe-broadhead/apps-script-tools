function astMessagingValidateIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingValidateCloneObject(value) {
  return astMessagingValidateIsPlainObject(value)
    ? Object.assign({}, value)
    : {};
}

function astMessagingValidateNormalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingValidateNormalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function astMessagingValidateNormalizeInteger(value, field, fallback = null, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.floor(parsed) !== parsed) {
    throw new AstMessagingValidationError(`Messaging request field '${field}' must be an integer`, {
      field,
      value
    });
  }
  if (parsed < min || parsed > max) {
    throw new AstMessagingValidationError(`Messaging request field '${field}' must be between ${min} and ${max}`, {
      field,
      value
    });
  }
  return parsed;
}

function astMessagingValidateNormalizeArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.slice();
  }
  if (value == null) {
    return fallback.slice();
  }
  return [value];
}

function astMessagingValidateEmailAddressList(value, field) {
  const items = astMessagingValidateNormalizeArray(value, []);
  const normalized = items
    .map(item => astMessagingValidateNormalizeString(item, null))
    .filter(Boolean);

  const invalid = normalized.find(item => !/^.+@.+\..+$/.test(item));
  if (invalid) {
    throw new AstMessagingValidationError(`Messaging request field '${field}' contains invalid email address`, {
      field,
      value: invalid
    });
  }

  return normalized;
}

function astMessagingNormalizeOptions(options = {}) {
  if (!astMessagingValidateIsPlainObject(options)) {
    throw new AstMessagingValidationError('Messaging request options must be an object');
  }

  const asyncInput = astMessagingValidateIsPlainObject(options.async)
    ? options.async
    : {};
  const telemetryInput = astMessagingValidateIsPlainObject(options.telemetry)
    ? options.telemetry
    : {};

  return {
    dryRun: astMessagingValidateNormalizeBoolean(options.dryRun, false),
    includeRaw: astMessagingValidateNormalizeBoolean(options.includeRaw, false),
    timeoutMs: astMessagingValidateNormalizeInteger(options.timeoutMs, 'options.timeoutMs', null, 1, 300000),
    retries: astMessagingValidateNormalizeInteger(options.retries, 'options.retries', null, 0, 10),
    idempotencyKey: astMessagingValidateNormalizeString(options.idempotencyKey, null),
    async: {
      enabled: astMessagingValidateNormalizeBoolean(asyncInput.enabled, false),
      queue: astMessagingValidateNormalizeString(asyncInput.queue, null)
    },
    telemetry: {
      enabled: astMessagingValidateNormalizeBoolean(telemetryInput.enabled, true),
      spanPrefix: astMessagingValidateNormalizeString(telemetryInput.spanPrefix, 'messaging')
    }
  };
}

function astMessagingNormalizeChatTransport(value, fallback = null) {
  const normalized = astMessagingValidateNormalizeString(value, null);
  if (!normalized) {
    return fallback;
  }

  const lowered = normalized.toLowerCase();
  if (['webhook', 'chat_webhook'].includes(lowered)) {
    return 'chat_webhook';
  }
  if (['chat_api', 'api'].includes(lowered)) {
    return 'chat_api';
  }
  if (['slack', 'slack_webhook'].includes(lowered)) {
    return 'slack_webhook';
  }
  if (['slack_api'].includes(lowered)) {
    return 'slack_api';
  }
  if (['teams', 'msteams', 'teams_webhook'].includes(lowered)) {
    return 'teams_webhook';
  }

  throw new AstMessagingValidationError('Unsupported chat transport', {
    field: 'body.transport',
    transport: normalized
  });
}

function astMessagingEnsureField(condition, field, details = {}) {
  if (!condition) {
    throw new AstMessagingValidationError(`Missing required messaging request field '${field}'`, Object.assign({ field }, details));
  }
}

function astMessagingValidateEmailPayload(operation, body) {
  const to = astMessagingValidateEmailAddressList(body.to, 'body.to');
  const subject = astMessagingValidateNormalizeString(body.subject, null);

  if (operation === 'email_send' || operation === 'email_create_draft') {
    astMessagingEnsureField(to.length > 0, 'body.to');
    astMessagingEnsureField(Boolean(subject), 'body.subject');
  }

  if (operation === 'email_send_batch') {
    const messages = Array.isArray(body.messages) ? body.messages : [];
    astMessagingEnsureField(messages.length > 0, 'body.messages');
  }

  if (operation === 'email_send_draft') {
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.draftId, null)), 'body.draftId');
  }

  if (operation === 'email_get_thread') {
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.threadId, null)), 'body.threadId');
  }

  if (operation === 'email_get_message' || operation === 'email_update_message_labels') {
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.messageId, null)), 'body.messageId');
  }

  if (operation === 'email_update_message_labels') {
    const addLabels = astMessagingValidateNormalizeArray(body.addLabels, []);
    const removeLabels = astMessagingValidateNormalizeArray(body.removeLabels, []);
    astMessagingEnsureField(addLabels.length > 0 || removeLabels.length > 0, 'body.addLabels|body.removeLabels');
  }
}

function astMessagingValidateChatPayload(normalized) {
  const operation = normalized.operation;
  const body = normalized.body || {};
  const transport = astMessagingNormalizeChatTransport(body.transport, null);

  if (operation === 'chat_send') {
    const hasMessage = astMessagingValidateIsPlainObject(body.message) || typeof body.message === 'string';
    astMessagingEnsureField(hasMessage, 'body.message');

    if (transport === 'chat_api') {
      astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.space, null)), 'body.space');
    }
  }

  if (operation === 'chat_send_batch') {
    astMessagingNormalizeChatTransport(body.transport, null);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    astMessagingEnsureField(messages.length > 0, 'body.messages');
  }

  if (operation === 'chat_get_message') {
    if (transport && transport !== 'chat_api') {
      throw new AstMessagingValidationError('chat_get_message supports only chat_api transport', {
        field: 'body.transport',
        transport
      });
    }
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.messageName, null)), 'body.messageName');
  }

  if (operation === 'chat_list_messages') {
    if (transport && transport !== 'chat_api') {
      throw new AstMessagingValidationError('chat_list_messages supports only chat_api transport', {
        field: 'body.transport',
        transport
      });
    }
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.space, null)), 'body.space');
  }
}

function astMessagingValidateTrackingPayload(operation, body) {
  if (operation === 'tracking_build_pixel_url') {
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.deliveryId, null)), 'body.deliveryId');
  }

  if (operation === 'tracking_wrap_links') {
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.html, null)), 'body.html');
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.deliveryId, null)), 'body.deliveryId');
  }

  if (operation === 'tracking_record_event') {
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.deliveryId, null)), 'body.deliveryId');
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.eventType, null)), 'body.eventType');
  }

  if (operation === 'logs_get' || operation === 'logs_delete') {
    astMessagingEnsureField(Boolean(astMessagingValidateNormalizeString(body.eventId, null)), 'body.eventId');
  }
}

function astMessagingValidateByOperation(normalized) {
  if (normalized.channel === 'email') {
    astMessagingValidateEmailPayload(normalized.operation, normalized.body);
    return;
  }

  if (normalized.channel === 'chat') {
    astMessagingValidateChatPayload(normalized);
    return;
  }

  if (normalized.channel === 'tracking') {
    astMessagingValidateTrackingPayload(normalized.operation, normalized.body);
  }
}

function astMessagingNormalizeOperation(operation, forcedOperation = null) {
  const raw = astMessagingValidateNormalizeString(forcedOperation || operation, null);
  if (!raw) {
    throw new AstMessagingValidationError("Missing required messaging request field 'operation'", {
      field: 'operation'
    });
  }

  const normalized = raw.toLowerCase();
  const spec = astMessagingGetOperationSpec(normalized);
  if (!spec) {
    throw new AstMessagingValidationError('Unsupported messaging operation', {
      operation: normalized
    });
  }

  return normalized;
}

function astMessagingValidateRequest(request = {}, forcedOperation = null) {
  if (!astMessagingValidateIsPlainObject(request)) {
    throw new AstMessagingValidationError('Messaging request must be an object');
  }

  const operation = astMessagingNormalizeOperation(request.operation, forcedOperation);
  const spec = astMessagingGetOperationSpec(operation);

  const body = astMessagingValidateIsPlainObject(request.body)
    ? astMessagingValidateCloneObject(request.body)
    : {};

  const auth = astMessagingValidateIsPlainObject(request.auth)
    ? astMessagingValidateCloneObject(request.auth)
    : {};

  const providerOptions = astMessagingValidateIsPlainObject(request.providerOptions)
    ? astMessagingValidateCloneObject(request.providerOptions)
    : {};

  const options = astMessagingNormalizeOptions(request.options || {});

  const normalized = {
    operation,
    channel: spec.channel,
    group: spec.group,
    body,
    auth,
    providerOptions,
    options
  };

  astMessagingValidateByOperation(normalized);
  return normalized;
}
