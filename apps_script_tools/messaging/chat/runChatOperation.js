function astMessagingResolveChatTransport(normalizedRequest = {}, resolvedConfig = {}) {
  const requestTransport = astMessagingValidateNormalizeString(
    normalizedRequest.providerOptions && normalizedRequest.providerOptions.transport,
    null
  ) || astMessagingValidateNormalizeString(normalizedRequest.body && normalizedRequest.body.transport, null);

  if (requestTransport) {
    const lowered = requestTransport.toLowerCase();
    if (['webhook', 'chat_webhook'].includes(lowered)) {
      return 'chat_webhook';
    }
    if (['chat_api', 'api'].includes(lowered)) {
      return 'chat_api';
    }
    throw new AstMessagingValidationError('Unsupported chat transport', { transport: requestTransport });
  }

  const configuredWebhook = resolvedConfig.chat && resolvedConfig.chat.webhookUrl;
  if (configuredWebhook) {
    return 'chat_webhook';
  }

  return 'chat_api';
}

function astMessagingRunChatOperation(normalizedRequest = {}, resolvedConfig = {}) {
  const transport = astMessagingResolveChatTransport(normalizedRequest, resolvedConfig);

  if (normalizedRequest.operation === 'chat_send') {
    return transport === 'chat_webhook'
      ? astMessagingChatSendWebhook(normalizedRequest.body, normalizedRequest, resolvedConfig)
      : astMessagingChatApiSend(normalizedRequest.body, normalizedRequest, resolvedConfig);
  }

  if (normalizedRequest.operation === 'chat_send_batch') {
    return transport === 'chat_webhook'
      ? astMessagingChatSendWebhookBatch(normalizedRequest.body, normalizedRequest, resolvedConfig)
      : astMessagingChatApiSendBatch(normalizedRequest.body, normalizedRequest, resolvedConfig);
  }

  if (normalizedRequest.operation === 'chat_get_message') {
    return astMessagingChatApiGetMessage(normalizedRequest.body, normalizedRequest, resolvedConfig);
  }

  if (normalizedRequest.operation === 'chat_list_messages') {
    return astMessagingChatApiListMessages(normalizedRequest.body, normalizedRequest, resolvedConfig);
  }

  throw new AstMessagingCapabilityError('Unsupported chat messaging operation', {
    operation: normalizedRequest.operation,
    transport
  });
}
