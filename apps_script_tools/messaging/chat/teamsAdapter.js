function astMessagingTeamsIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingTeamsNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingTeamsCloneObject(value) {
  return astMessagingTeamsIsPlainObject(value)
    ? Object.assign({}, value)
    : {};
}

function astMessagingTeamsResolveWebhookUrl(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  return astMessagingTeamsNormalizeString(body.webhookUrl, '')
    || astMessagingTeamsNormalizeString(normalizedRequest.auth && normalizedRequest.auth.teamsWebhookUrl, '')
    || astMessagingTeamsNormalizeString(normalizedRequest.auth && normalizedRequest.auth.teams_webhook_url, '')
    || astMessagingTeamsNormalizeString(resolvedConfig.chat && resolvedConfig.chat.teamsWebhookUrl, '');
}

function astMessagingTeamsBuildPayload(body = {}) {
  if (typeof body.message === 'string') {
    return { text: body.message };
  }

  if (astMessagingTeamsIsPlainObject(body.message)) {
    return astMessagingTeamsCloneObject(body.message);
  }

  const text = astMessagingTeamsNormalizeString(body.text, '');
  if (text) {
    return { text };
  }

  return {};
}

function astMessagingTeamsSendWebhook(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const webhookUrl = astMessagingTeamsResolveWebhookUrl(body, normalizedRequest, resolvedConfig);
  if (!webhookUrl || webhookUrl.indexOf('https://') !== 0) {
    throw new AstMessagingValidationError('Teams webhook transport requires a valid https webhookUrl', {
      field: 'webhookUrl'
    });
  }

  const payload = astMessagingTeamsBuildPayload(body);
  const response = astMessagingHttpRequest(webhookUrl, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    payload: JSON.stringify(payload)
  }, {
    timeoutMs: resolvedConfig.timeoutMs,
    retries: resolvedConfig.retries
  });

  return {
    transport: 'teams_webhook',
    request: {
      webhookUrl,
      payload
    },
    response: response.json || {
      statusCode: response.statusCode,
      text: response.text
    },
    statusCode: response.statusCode,
    raw: response
  };
}

function astMessagingTeamsSendWebhookBatch(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const batchWebhookUrl = astMessagingTeamsNormalizeString(body.webhookUrl, '');
  const items = messages.map(message => {
    const payload = astMessagingTeamsIsPlainObject(message)
      ? astMessagingTeamsCloneObject(message)
      : { message };

    if (!payload.webhookUrl && batchWebhookUrl) {
      payload.webhookUrl = batchWebhookUrl;
    }

    const sent = astMessagingTeamsSendWebhook(payload, normalizedRequest, resolvedConfig);
    return {
      statusCode: sent.statusCode,
      response: sent.response
    };
  });

  return {
    transport: 'teams_webhook',
    sent: items.length,
    items
  };
}
