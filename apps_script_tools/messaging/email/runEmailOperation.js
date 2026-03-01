function astMessagingRunEmailOperation(normalizedRequest = {}, resolvedConfig = {}) {
  switch (normalizedRequest.operation) {
    case 'email_send':
      return astMessagingEmailSendSingle(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_send_batch':
      return astMessagingEmailSendBatch(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_create_draft':
      return astMessagingEmailCreateDraft(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_send_draft':
      return astMessagingEmailSendDraft(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_list_threads':
      return astMessagingEmailListThreads(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_get_thread':
      return astMessagingEmailGetThread(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_search_messages':
      return astMessagingEmailSearchMessages(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_get_message':
      return astMessagingEmailGetMessage(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_list_labels':
      return astMessagingEmailListLabels(normalizedRequest.body, normalizedRequest, resolvedConfig);
    case 'email_update_message_labels':
      return astMessagingEmailUpdateMessageLabels(normalizedRequest.body, normalizedRequest, resolvedConfig);
    default:
      throw new AstMessagingCapabilityError('Unsupported email messaging operation', {
        operation: normalizedRequest.operation
      });
  }
}
