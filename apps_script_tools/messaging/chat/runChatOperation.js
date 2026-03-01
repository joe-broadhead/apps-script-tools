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

  if (resolvedConfig.chat && resolvedConfig.chat.webhookUrl) {
    return 'chat_webhook';
  }
  if (resolvedConfig.chat && resolvedConfig.chat.slackWebhookUrl) {
    return 'slack_webhook';
  }
  if (resolvedConfig.chat && resolvedConfig.chat.teamsWebhookUrl) {
    return 'teams_webhook';
  }
  if (resolvedConfig.chat && resolvedConfig.chat.slackBotToken) {
    return 'slack_api';
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
