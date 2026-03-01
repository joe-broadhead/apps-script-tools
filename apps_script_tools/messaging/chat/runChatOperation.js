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

function astMessagingRunChatParseHttpsHostname(url) {
  const normalized = astMessagingRunChatNormalizeString(url, '');
  if (!normalized) {
    return '';
  }

  try {
    if (typeof URL === 'function') {
      const parsed = new URL(normalized);
      if (String(parsed.protocol || '').toLowerCase() !== 'https:') {
        return '';
      }
      return astMessagingRunChatNormalizeString(parsed.hostname, '').toLowerCase();
    }
  } catch (_error) {
    // Fall through to deterministic regex parsing for runtimes without URL support.
  }

  const match = normalized.match(/^https:\/\/([^\/?#]+)/i);
  if (!match) {
    return '';
  }

  let authority = astMessagingRunChatNormalizeString(match[1], '').toLowerCase();
  if (!authority) {
    return '';
  }

  if (authority.includes('@')) {
    authority = authority.split('@').pop();
  }

  if (authority.startsWith('[') && authority.includes(']')) {
    // Ignore IPv6 authorities in transport inference.
    return '';
  }

  const host = authority.replace(/:\d+$/, '');
  if (!/^[a-z0-9.-]+$/.test(host)) {
    return '';
  }

  return host;
}

function astMessagingRunChatHostnameMatches(hostname, exactHosts = [], suffixHosts = []) {
  if (!hostname) {
    return false;
  }

  for (let i = 0; i < exactHosts.length; i += 1) {
    const exact = astMessagingRunChatNormalizeString(exactHosts[i], '').toLowerCase();
    if (exact && hostname === exact) {
      return true;
    }
  }

  for (let i = 0; i < suffixHosts.length; i += 1) {
    const suffix = astMessagingRunChatNormalizeString(suffixHosts[i], '').toLowerCase();
    if (!suffix) {
      continue;
    }
    if (hostname === suffix || hostname.endsWith(`.${suffix}`)) {
      return true;
    }
  }

  return false;
}

function astMessagingRunChatResolveWebhookProvider(url) {
  const hostname = astMessagingRunChatParseHttpsHostname(url);
  if (!hostname) {
    return null;
  }

  if (astMessagingRunChatHostnameMatches(hostname, ['chat.googleapis.com'])) {
    return 'chat_webhook';
  }
  if (astMessagingRunChatHostnameMatches(hostname, ['hooks.slack.com'])) {
    return 'slack_webhook';
  }
  if (astMessagingRunChatHostnameMatches(hostname, ['logic.azure.com', 'outlook.office.com', 'outlook.office365.com'], ['webhook.office.com', 'webhook.office365.com'])) {
    return 'teams_webhook';
  }

  return null;
}

function astMessagingRunChatCollectSendHints(normalizedRequest = {}) {
  const body = astMessagingRunChatIsPlainObject(normalizedRequest.body)
    ? normalizedRequest.body
    : {};

  const providers = {};
  let hasSpace = false;
  let hasChannel = false;
  let unknownWebhookHost = false;

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

    const webhookUrl = astMessagingRunChatNormalizeString(payload.webhookUrl, '');
    const webhookProvider = astMessagingRunChatResolveWebhookProvider(webhookUrl);
    if (webhookProvider) {
      providers[webhookProvider] = true;
    } else if (webhookUrl) {
      unknownWebhookHost = true;
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
    unknownWebhookHost,
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
  if (hints.unknownWebhookHost) {
    throw new AstMessagingValidationError('Unable to infer chat transport from webhookUrl host; set body.transport explicitly', {
      field: 'body.transport'
    });
  }
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
