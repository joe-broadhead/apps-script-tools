function astMessagingSlackIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingSlackNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingSlackCloneObject(value) {
  return astMessagingSlackIsPlainObject(value)
    ? Object.assign({}, value)
    : {};
}

function astMessagingSlackResolveWebhookUrl(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  return astMessagingSlackNormalizeString(body.webhookUrl, '')
    || astMessagingSlackNormalizeString(normalizedRequest.auth && normalizedRequest.auth.slackWebhookUrl, '')
    || astMessagingSlackNormalizeString(normalizedRequest.auth && normalizedRequest.auth.slack_webhook_url, '')
    || astMessagingSlackNormalizeString(resolvedConfig.chat && resolvedConfig.chat.slackWebhookUrl, '');
}

function astMessagingSlackResolveBotToken(normalizedRequest = {}, resolvedConfig = {}) {
  const token = astMessagingSlackNormalizeString(normalizedRequest.auth && normalizedRequest.auth.slackBotToken, '')
    || astMessagingSlackNormalizeString(normalizedRequest.auth && normalizedRequest.auth.slack_bot_token, '')
    || astMessagingSlackNormalizeString(normalizedRequest.auth && normalizedRequest.auth.token, '')
    || astMessagingSlackNormalizeString(resolvedConfig.chat && resolvedConfig.chat.slackBotToken, '');

  if (!token) {
    throw new AstMessagingAuthError('Missing Slack bot token for slack_api transport', {
      field: 'auth.slackBotToken',
      scriptKey: 'MESSAGING_SLACK_BOT_TOKEN'
    });
  }

  return token;
}

function astMessagingSlackResolveApiBaseUrl(resolvedConfig = {}) {
  const baseUrl = astMessagingSlackNormalizeString(
    resolvedConfig.chat && resolvedConfig.chat.slackApiBaseUrl,
    'https://slack.com/api'
  );

  return baseUrl.replace(/\/$/, '');
}

function astMessagingSlackResolveChannel(body = {}, resolvedConfig = {}) {
  return astMessagingSlackNormalizeString(body.channel, '')
    || astMessagingSlackNormalizeString(resolvedConfig.chat && resolvedConfig.chat.slackChannel, '');
}

function astMessagingSlackBuildPayload(body = {}, resolvedConfig = {}) {
  let payload = {};
  if (typeof body.message === 'string') {
    payload = { text: body.message };
  } else if (astMessagingSlackIsPlainObject(body.message)) {
    payload = astMessagingSlackCloneObject(body.message);
  } else {
    payload = { text: astMessagingSlackNormalizeString(body.text, '') };
  }

  const channel = astMessagingSlackResolveChannel(body, resolvedConfig);
  if (channel && !astMessagingSlackNormalizeString(payload.channel, '')) {
    payload.channel = channel;
  }

  const threadTs = astMessagingSlackNormalizeString(body.threadTs || body.thread_ts, '');
  if (threadTs && !astMessagingSlackNormalizeString(payload.thread_ts, '')) {
    payload.thread_ts = threadTs;
  }

  if (typeof body.unfurlLinks === 'boolean' && typeof payload.unfurl_links === 'undefined') {
    payload.unfurl_links = body.unfurlLinks;
  }
  if (typeof body.unfurlMedia === 'boolean' && typeof payload.unfurl_media === 'undefined') {
    payload.unfurl_media = body.unfurlMedia;
  }

  return payload;
}

function astMessagingSlackSendWebhook(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const webhookUrl = astMessagingSlackResolveWebhookUrl(body, normalizedRequest, resolvedConfig);
  if (!webhookUrl || webhookUrl.indexOf('https://') !== 0) {
    throw new AstMessagingValidationError('Slack webhook transport requires a valid https webhookUrl', {
      field: 'webhookUrl'
    });
  }

  const payload = astMessagingSlackBuildPayload(body, resolvedConfig);
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
    transport: 'slack_webhook',
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

function astMessagingSlackSendApi(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const token = astMessagingSlackResolveBotToken(normalizedRequest, resolvedConfig);
  const baseUrl = astMessagingSlackResolveApiBaseUrl(resolvedConfig);
  const payload = astMessagingSlackBuildPayload(body, resolvedConfig);

  if (!astMessagingSlackNormalizeString(payload.channel, '')) {
    throw new AstMessagingValidationError('Slack API transport requires channel (body.channel or MESSAGING_SLACK_CHANNEL)', {
      field: 'body.channel'
    });
  }

  const url = `${baseUrl}/chat.postMessage`;
  const response = astMessagingHttpRequest(url, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    payload: JSON.stringify(payload)
  }, {
    timeoutMs: resolvedConfig.timeoutMs,
    retries: resolvedConfig.retries
  });

  const json = astMessagingSlackIsPlainObject(response.json)
    ? response.json
    : null;
  if (json && json.ok === false) {
    throw new AstMessagingProviderError('Slack API rejected chat.send request', {
      operation: normalizedRequest.operation,
      transport: 'slack_api',
      statusCode: response.statusCode,
      error: json.error || null
    });
  }

  return {
    transport: 'slack_api',
    request: {
      url,
      payload
    },
    response: json || {
      statusCode: response.statusCode,
      text: response.text
    },
    statusCode: response.statusCode,
    raw: response
  };
}

function astMessagingSlackSendWebhookBatch(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const batchWebhookUrl = astMessagingSlackNormalizeString(body.webhookUrl, '');
  const items = messages.map(message => {
    const payload = astMessagingSlackIsPlainObject(message)
      ? astMessagingSlackCloneObject(message)
      : { message };

    if (!payload.webhookUrl && batchWebhookUrl) {
      payload.webhookUrl = batchWebhookUrl;
    }

    const sent = astMessagingSlackSendWebhook(payload, normalizedRequest, resolvedConfig);
    return {
      statusCode: sent.statusCode,
      response: sent.response
    };
  });

  return {
    transport: 'slack_webhook',
    sent: items.length,
    items
  };
}

function astMessagingSlackSendApiBatch(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const batchChannel = astMessagingSlackNormalizeString(body.channel, '');
  const items = messages.map(message => {
    const payload = astMessagingSlackIsPlainObject(message)
      ? astMessagingSlackCloneObject(message)
      : { message };

    if (!payload.channel && batchChannel) {
      payload.channel = batchChannel;
    }

    const sent = astMessagingSlackSendApi(payload, normalizedRequest, resolvedConfig);
    return {
      statusCode: sent.statusCode,
      response: sent.response
    };
  });

  return {
    transport: 'slack_api',
    sent: items.length,
    items
  };
}
