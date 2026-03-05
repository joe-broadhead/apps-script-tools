function astMessagingTeamsResolveWebhookUrl(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  return astMessagingNormalizeString(body.webhookUrl, '')
    || astMessagingNormalizeString(normalizedRequest.auth && normalizedRequest.auth.teamsWebhookUrl, '')
    || astMessagingNormalizeString(normalizedRequest.auth && normalizedRequest.auth.teams_webhook_url, '')
    || astMessagingNormalizeString(resolvedConfig.chat && resolvedConfig.chat.teamsWebhookUrl, '');
}

function astMessagingTeamsBuildPayload(body = {}) {
  if (typeof body.message === 'string') {
    return { text: body.message };
  }

  if (astMessagingIsPlainObject(body.message)) {
    return astMessagingClonePlainObject(body.message);
  }

  const text = astMessagingNormalizeString(body.text, '');
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
  const batchWebhookUrl = astMessagingNormalizeString(body.webhookUrl, '');
  const items = messages.map(message => {
    const payload = astMessagingIsPlainObject(message)
      ? astMessagingClonePlainObject(message)
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
