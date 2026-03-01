function astMessagingRun(request = {}) {
  return astRunMessagingRequest(request);
}

function astMessagingRunOperation(operation, request = {}) {
  return astRunMessagingRequest(Object.assign({}, request, { operation }));
}

function astMessagingConfigure(config = {}, options = {}) {
  return astMessagingSetRuntimeConfig(config, options);
}

function astMessagingGetConfig() {
  return astMessagingGetRuntimeConfig();
}

function astMessagingClearConfig() {
  return astMessagingClearRuntimeConfig();
}

const AST_MESSAGING = Object.freeze({
  run: astMessagingRun,

  email: Object.freeze({
    send: request => astMessagingRunOperation('email_send', request),
    sendBatch: request => astMessagingRunOperation('email_send_batch', request),
    createDraft: request => astMessagingRunOperation('email_create_draft', request),
    sendDraft: request => astMessagingRunOperation('email_send_draft', request),
    listThreads: request => astMessagingRunOperation('email_list_threads', request),
    getThread: request => astMessagingRunOperation('email_get_thread', request),
    searchMessages: request => astMessagingRunOperation('email_search_messages', request),
    getMessage: request => astMessagingRunOperation('email_get_message', request),
    listLabels: request => astMessagingRunOperation('email_list_labels', request),
    updateMessageLabels: request => astMessagingRunOperation('email_update_message_labels', request)
  }),

  chat: Object.freeze({
    send: request => astMessagingRunOperation('chat_send', request),
    sendBatch: request => astMessagingRunOperation('chat_send_batch', request),
    getMessage: request => astMessagingRunOperation('chat_get_message', request),
    listMessages: request => astMessagingRunOperation('chat_list_messages', request)
  }),

  tracking: Object.freeze({
    buildPixelUrl: request => astMessagingRunOperation('tracking_build_pixel_url', request),
    wrapLinks: request => astMessagingRunOperation('tracking_wrap_links', request),
    recordEvent: request => astMessagingRunOperation('tracking_record_event', request),
    handleWebEvent: request => astMessagingRunOperation('tracking_handle_web_event', request)
  }),

  logs: Object.freeze({
    list: request => astMessagingRunOperation('logs_list', request),
    get: request => astMessagingRunOperation('logs_get', request),
    delete: request => astMessagingRunOperation('logs_delete', request)
  }),

  operations: () => astMessagingListOperations(),
  capabilities: operationOrGroup => astMessagingGetCapabilities(operationOrGroup),
  configure: astMessagingConfigure,
  getConfig: astMessagingGetConfig,
  clearConfig: astMessagingClearConfig
});
