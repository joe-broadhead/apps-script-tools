function astMessagingRunChatNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingRunChatIsPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function astMessagingRunChatResolveWebhookProvider(url) {
  const normalized = astMessagingRunChatNormalizeString(url, '').toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes('chat.googleapis.com')) {
    return 'chat_webhook';
  }
  if (normalized.includes('hooks.slack.com')) {
    return 'slack_webhook';
  }
  if (
    normalized.includes('.office.com/webhook') ||
    normalized.includes('.office365.com/webhook') ||
    normalized.includes('logic.azure.com')
  ) {
    return 'teams_webhook';
  }
  return 'chat_webhook';
}

function astMessagingRunChatCollectSendHints(normalizedRequest = {}) {
  const body = astMessagingRunChatIsPlainObject(normalizedRequest.body)
    ? normalizedRequest.body
    : {};

  const providers = {};
  let hasSpace = false;
  let hasChannel = false;

  const inspectPayload = payload => {
    if (!astMessagingRunChatIsPlainObject(payload)) {
      return;
    }

    if (astMessagingRunChatNormalizeString(payload.space, '')) {
      hasSpace = true;
      providers.chat_api = true;
    }

    if (astMessagingRunChatNormalizeString(payload.channel, '')) {
      hasChannel = true;
      providers.slack_hint = true;
    }

    const webhookProvider = astMessagingRunChatResolveWebhookProvider(payload.webhookUrl);
    if (webhookProvider) {
      providers[webhookProvider] = true;
    }
  };

  inspectPayload(body);

  if (normalizedRequest.operation === 'chat_send_batch') {
    const messages = Array.isArray(body.messages) ? body.messages : [];
    messages.forEach(message => {
      inspectPayload(astMessagingRunChatIsPlainObject(message) ? message : {});
    });
  }

  return {
    hasSpace,
    hasChannel,
    providers: Object.keys(providers).sort()
  };
}

function astMessagingRunChatInferSendTransport(normalizedRequest = {}, resolvedConfig = {}) {
  const hints = astMessagingRunChatCollectSendHints(normalizedRequest);
  const hasSlackApi = Boolean(resolvedConfig.chat && resolvedConfig.chat.slackBotToken);
  const hasSlackWebhook = Boolean(resolvedConfig.chat && resolvedConfig.chat.slackWebhookUrl);

  const uniqueProviders = hints.providers
    .filter(provider => provider !== 'slack_hint')
    .sort();
  if (
    hints.hasSpace && hints.hasChannel ||
    uniqueProviders.length > 1 ||
    (hints.hasChannel && uniqueProviders.includes('chat_api'))
  ) {
    throw new AstMessagingValidationError('Ambiguous chat payload detected; set body.transport explicitly', {
      field: 'body.transport',
      providers: hints.providers
    });
  }

  if (uniqueProviders.length === 1) {
    return uniqueProviders[0];
  }

  if (hints.hasSpace) {
    return 'chat_api';
  }

  if (hints.hasChannel) {
    if (hasSlackApi) {
      return 'slack_api';
    }
    if (hasSlackWebhook) {
      return 'slack_webhook';
    }
    throw new AstMessagingValidationError('Slack channel hint detected but no Slack transport is configured', {
      field: 'body.channel'
    });
  }

  if (resolvedConfig.chat && resolvedConfig.chat.webhookUrl) {
    return 'chat_webhook';
  }

  return 'chat_api';
}

function astMessagingResolveChatTransport(normalizedRequest = {}, resolvedConfig = {}) {
  const requestTransportRaw = astMessagingValidateNormalizeString(
    normalizedRequest.providerOptions && normalizedRequest.providerOptions.transport,
    null
  ) || astMessagingValidateNormalizeString(normalizedRequest.body && normalizedRequest.body.transport, null);
  const requestTransport = astMessagingNormalizeChatTransport(requestTransportRaw, null);

  if (normalizedRequest.operation === 'chat_get_message' || normalizedRequest.operation === 'chat_list_messages') {
    if (requestTransport && requestTransport !== 'chat_api') {
      throw new AstMessagingCapabilityError('Chat read operations support only chat_api transport', {
        operation: normalizedRequest.operation,
        transport: requestTransport
      });
    }
    return 'chat_api';
  }

  if (requestTransport) {
    return requestTransport;
  }

  if (normalizedRequest.operation === 'chat_send' || normalizedRequest.operation === 'chat_send_batch') {
    return astMessagingRunChatInferSendTransport(normalizedRequest, resolvedConfig);
  }

  return 'chat_api';
}

function astMessagingRunChatOperation(normalizedRequest = {}, resolvedConfig = {}) {
  const transport = astMessagingResolveChatTransport(normalizedRequest, resolvedConfig);

  if (normalizedRequest.operation === 'chat_send') {
    if (transport === 'chat_webhook') {
      return astMessagingChatSendWebhook(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'chat_api') {
      return astMessagingChatApiSend(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'slack_webhook') {
      return astMessagingSlackSendWebhook(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'slack_api') {
      return astMessagingSlackSendApi(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'teams_webhook') {
      return astMessagingTeamsSendWebhook(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
  }

  if (normalizedRequest.operation === 'chat_send_batch') {
    if (transport === 'chat_webhook') {
      return astMessagingChatSendWebhookBatch(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'chat_api') {
      return astMessagingChatApiSendBatch(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'slack_webhook') {
      return astMessagingSlackSendWebhookBatch(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'slack_api') {
      return astMessagingSlackSendApiBatch(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
    if (transport === 'teams_webhook') {
      return astMessagingTeamsSendWebhookBatch(normalizedRequest.body, normalizedRequest, resolvedConfig);
    }
  }

  if (normalizedRequest.operation === 'chat_get_message') {
    if (transport !== 'chat_api') {
      throw new AstMessagingCapabilityError('chat_get_message supports only chat_api transport', {
        operation: normalizedRequest.operation,
        transport
      });
    }
    return astMessagingChatApiGetMessage(normalizedRequest.body, normalizedRequest, resolvedConfig);
  }

  if (normalizedRequest.operation === 'chat_list_messages') {
    if (transport !== 'chat_api') {
      throw new AstMessagingCapabilityError('chat_list_messages supports only chat_api transport', {
        operation: normalizedRequest.operation,
        transport
      });
    }
    return astMessagingChatApiListMessages(normalizedRequest.body, normalizedRequest, resolvedConfig);
  }

  throw new AstMessagingCapabilityError('Unsupported chat messaging operation', {
    operation: normalizedRequest.operation,
    transport
  });
}
