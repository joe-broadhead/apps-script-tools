function astMessagingChatWebhookNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingChatWebhookBuildPayload(body = {}) {
  if (typeof body.message === 'string') {
    return { text: body.message };
  }

  if (body.message && typeof body.message === 'object' && !Array.isArray(body.message)) {
    return Object.assign({}, body.message);
  }

  return {
    text: astMessagingChatWebhookNormalizeString(body.text, '')
  };
}

function astMessagingChatResolveWebhookUrl(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const direct = astMessagingChatWebhookNormalizeString(body.webhookUrl, '');
  if (direct) {
    return direct;
  }

  const authWebhook = astMessagingChatWebhookNormalizeString(normalizedRequest.auth && normalizedRequest.auth.chatWebhookUrl, '');
  if (authWebhook) {
    return authWebhook;
  }

  return astMessagingChatWebhookNormalizeString(resolvedConfig.chat && resolvedConfig.chat.webhookUrl, '');
}

function astMessagingChatSendWebhook(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const webhookUrl = astMessagingChatResolveWebhookUrl(body, normalizedRequest, resolvedConfig);
  if (!webhookUrl || webhookUrl.indexOf('https://') !== 0) {
    throw new AstMessagingValidationError('Chat webhook transport requires a valid https webhookUrl', {
      field: 'webhookUrl'
    });
  }

  const payload = astMessagingChatWebhookBuildPayload(body);
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
    transport: 'chat_webhook',
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

function astMessagingChatSendWebhookBatch(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const batchWebhookUrl = astMessagingChatWebhookNormalizeString(body.webhookUrl, '');
  const items = messages.map(message => {
    const payload = message && typeof message === 'object' ? Object.assign({}, message) : { message };
    if (!payload.webhookUrl && batchWebhookUrl) {
      payload.webhookUrl = batchWebhookUrl;
    }
    const sent = astMessagingChatSendWebhook(payload, normalizedRequest, resolvedConfig);
    return {
      statusCode: sent.statusCode,
      response: sent.response
    };
  });

  return {
    transport: 'chat_webhook',
    sent: items.length,
    items
  };
}
