function astMessagingChatApiNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingChatApiResolveToken(normalizedRequest = {}) {
  const token = astMessagingChatApiNormalizeString(normalizedRequest.auth && normalizedRequest.auth.oauthToken, '');
  if (token) {
    return token;
  }

  if (typeof ScriptApp !== 'undefined' && ScriptApp && typeof ScriptApp.getOAuthToken === 'function') {
    const oauthToken = astMessagingChatApiNormalizeString(ScriptApp.getOAuthToken(), '');
    if (oauthToken) {
      return oauthToken;
    }
  }

  throw new AstMessagingAuthError('Missing OAuth token for Google Chat API transport', {
    field: 'auth.oauthToken'
  });
}

function astMessagingChatApiResolveBaseUrl(resolvedConfig = {}) {
  const baseUrl = astMessagingChatApiNormalizeString(resolvedConfig.chat && resolvedConfig.chat.apiBaseUrl, 'https://chat.googleapis.com/v1');
  return baseUrl.replace(/\/$/, '');
}

function astMessagingChatApiBuildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=UTF-8'
  };
}

function astMessagingChatApiBuildSendUrl(baseUrl, body = {}, resolvedConfig = {}) {
  const space = astMessagingChatApiNormalizeString(body.space, astMessagingChatApiNormalizeString(resolvedConfig.chat && resolvedConfig.chat.space, ''));
  if (!space) {
    throw new AstMessagingValidationError('Chat API transport requires body.space', {
      field: 'body.space'
    });
  }

  const params = [];
  const thread = body.thread && typeof body.thread === 'object' ? body.thread : {};
  const threadKey = astMessagingChatApiNormalizeString(thread.threadKey, '');
  const reply = thread.reply === true;
  if (threadKey) {
    params.push(`threadKey=${encodeURIComponent(threadKey)}`);
  }
  if (reply) {
    params.push('messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD');
  }

  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `${baseUrl}/${space}/messages${query}`;
}

function astMessagingChatApiBuildPayload(body = {}) {
  if (typeof body.message === 'string') {
    return { text: body.message };
  }

  if (body.message && typeof body.message === 'object' && !Array.isArray(body.message)) {
    return Object.assign({}, body.message);
  }

  return {
    text: astMessagingChatApiNormalizeString(body.text, '')
  };
}

function astMessagingChatApiSend(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const token = astMessagingChatApiResolveToken(normalizedRequest);
  const baseUrl = astMessagingChatApiResolveBaseUrl(resolvedConfig);
  const url = astMessagingChatApiBuildSendUrl(baseUrl, body, resolvedConfig);
  const payload = astMessagingChatApiBuildPayload(body);

  const response = astMessagingHttpRequest(url, {
    method: 'post',
    headers: astMessagingChatApiBuildHeaders(token),
    payload: JSON.stringify(payload)
  }, {
    timeoutMs: resolvedConfig.timeoutMs,
    retries: resolvedConfig.retries
  });

  return {
    transport: 'chat_api',
    request: {
      url,
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

function astMessagingChatApiSendBatch(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const items = messages.map(message => {
    const payload = message && typeof message === 'object' ? message : { message };
    const sent = astMessagingChatApiSend(payload, normalizedRequest, resolvedConfig);
    return {
      statusCode: sent.statusCode,
      response: sent.response
    };
  });

  return {
    transport: 'chat_api',
    sent: items.length,
    items
  };
}

function astMessagingChatApiGetMessage(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const token = astMessagingChatApiResolveToken(normalizedRequest);
  const baseUrl = astMessagingChatApiResolveBaseUrl(resolvedConfig);
  const messageName = astMessagingChatApiNormalizeString(body.messageName, '');
  if (!messageName) {
    throw new AstMessagingValidationError('chat_get_message requires body.messageName', {
      field: 'body.messageName'
    });
  }

  const url = `${baseUrl}/${messageName}`;
  const response = astMessagingHttpRequest(url, {
    method: 'get',
    headers: astMessagingChatApiBuildHeaders(token)
  }, {
    timeoutMs: resolvedConfig.timeoutMs,
    retries: resolvedConfig.retries
  });

  return {
    transport: 'chat_api',
    item: response.json || null,
    statusCode: response.statusCode,
    raw: response
  };
}

function astMessagingChatApiListMessages(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  const token = astMessagingChatApiResolveToken(normalizedRequest);
  const baseUrl = astMessagingChatApiResolveBaseUrl(resolvedConfig);
  const space = astMessagingChatApiNormalizeString(body.space, astMessagingChatApiNormalizeString(resolvedConfig.chat && resolvedConfig.chat.space, ''));
  if (!space) {
    throw new AstMessagingValidationError('chat_list_messages requires body.space', {
      field: 'body.space'
    });
  }

  const pageSize = Math.max(1, Math.min(1000, Number(body.pageSize || 50)));
  const pageToken = astMessagingChatApiNormalizeString(body.pageToken, '');

  const params = [`pageSize=${pageSize}`];
  if (pageToken) {
    params.push(`pageToken=${encodeURIComponent(pageToken)}`);
  }

  const url = `${baseUrl}/${space}/messages?${params.join('&')}`;
  const response = astMessagingHttpRequest(url, {
    method: 'get',
    headers: astMessagingChatApiBuildHeaders(token)
  }, {
    timeoutMs: resolvedConfig.timeoutMs,
    retries: resolvedConfig.retries
  });

  const json = response.json || {};
  return {
    transport: 'chat_api',
    items: Array.isArray(json.messages) ? json.messages : [],
    nextPageToken: typeof json.nextPageToken === 'string' ? json.nextPageToken : null,
    statusCode: response.statusCode,
    raw: response
  };
}
