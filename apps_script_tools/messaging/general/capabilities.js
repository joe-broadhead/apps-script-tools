const AST_MESSAGING_OPERATION_SPECS = Object.freeze({
  email_send: Object.freeze({ group: 'email', channel: 'email', mutation: true, read: false, transport: ['gmailapp'], dryRun: true }),
  email_send_batch: Object.freeze({ group: 'email', channel: 'email', mutation: true, read: false, transport: ['gmailapp'], dryRun: true }),
  email_create_draft: Object.freeze({ group: 'email', channel: 'email', mutation: true, read: false, transport: ['gmailapp'], dryRun: true }),
  email_send_draft: Object.freeze({ group: 'email', channel: 'email', mutation: true, read: false, transport: ['gmailapp'], dryRun: true }),
  email_list_threads: Object.freeze({ group: 'email', channel: 'email', mutation: false, read: true, transport: ['gmailapp'] }),
  email_get_thread: Object.freeze({ group: 'email', channel: 'email', mutation: false, read: true, transport: ['gmailapp'] }),
  email_search_messages: Object.freeze({ group: 'email', channel: 'email', mutation: false, read: true, transport: ['gmailapp'] }),
  email_get_message: Object.freeze({ group: 'email', channel: 'email', mutation: false, read: true, transport: ['gmailapp'] }),
  email_list_labels: Object.freeze({ group: 'email', channel: 'email', mutation: false, read: true, transport: ['gmailapp'] }),
  email_update_message_labels: Object.freeze({ group: 'email', channel: 'email', mutation: true, read: false, transport: ['gmailapp'], dryRun: true }),

  chat_send: Object.freeze({ group: 'chat', channel: 'chat', mutation: true, read: false, transport: ['chat_webhook', 'chat_api'], dryRun: true }),
  chat_send_batch: Object.freeze({ group: 'chat', channel: 'chat', mutation: true, read: false, transport: ['chat_webhook', 'chat_api'], dryRun: true }),
  chat_get_message: Object.freeze({ group: 'chat', channel: 'chat', mutation: false, read: true, transport: ['chat_api'] }),
  chat_list_messages: Object.freeze({ group: 'chat', channel: 'chat', mutation: false, read: true, transport: ['chat_api'] }),

  tracking_build_pixel_url: Object.freeze({ group: 'tracking', channel: 'tracking', mutation: false, read: true, transport: ['internal'] }),
  tracking_wrap_links: Object.freeze({ group: 'tracking', channel: 'tracking', mutation: false, read: true, transport: ['internal'] }),
  tracking_record_event: Object.freeze({ group: 'tracking', channel: 'tracking', mutation: true, read: false, transport: ['internal'], dryRun: true }),
  tracking_handle_web_event: Object.freeze({ group: 'tracking', channel: 'tracking', mutation: true, read: false, transport: ['internal'], dryRun: true }),

  logs_list: Object.freeze({ group: 'logs', channel: 'tracking', mutation: false, read: true, transport: ['cache'] }),
  logs_get: Object.freeze({ group: 'logs', channel: 'tracking', mutation: false, read: true, transport: ['cache'] }),
  logs_delete: Object.freeze({ group: 'logs', channel: 'tracking', mutation: true, read: false, transport: ['cache'], dryRun: true })
});

const AST_MESSAGING_OPERATION_GROUPS = Object.freeze({
  email: Object.freeze([
    'email_send',
    'email_send_batch',
    'email_create_draft',
    'email_send_draft',
    'email_list_threads',
    'email_get_thread',
    'email_search_messages',
    'email_get_message',
    'email_list_labels',
    'email_update_message_labels'
  ]),
  chat: Object.freeze([
    'chat_send',
    'chat_send_batch',
    'chat_get_message',
    'chat_list_messages'
  ]),
  tracking: Object.freeze([
    'tracking_build_pixel_url',
    'tracking_wrap_links',
    'tracking_record_event',
    'tracking_handle_web_event'
  ]),
  logs: Object.freeze([
    'logs_list',
    'logs_get',
    'logs_delete'
  ])
});

function astMessagingNormalizeCapabilityKey(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingListOperations() {
  return Object.keys(AST_MESSAGING_OPERATION_SPECS).sort();
}

function astMessagingGetOperationSpec(operation) {
  const key = astMessagingNormalizeCapabilityKey(operation, null);
  if (!key) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(AST_MESSAGING_OPERATION_SPECS, key)
    ? AST_MESSAGING_OPERATION_SPECS[key]
    : null;
}

function astMessagingIsMutationOperation(operation) {
  const spec = astMessagingGetOperationSpec(operation);
  return Boolean(spec && spec.mutation === true);
}

function astMessagingGetCapabilities(operationOrGroup) {
  if (typeof operationOrGroup === 'undefined' || operationOrGroup === null || operationOrGroup === '') {
    return {
      operations: astMessagingListOperations(),
      groups: Object.keys(AST_MESSAGING_OPERATION_GROUPS).sort(),
      transports: {
        email: ['gmailapp'],
        chat: ['chat_webhook', 'chat_api']
      },
      dryRun: true,
      asyncJobs: true,
      tracking: {
        delivery: true,
        openClickOptIn: true
      }
    };
  }

  const key = astMessagingNormalizeCapabilityKey(operationOrGroup, '');
  if (Object.prototype.hasOwnProperty.call(AST_MESSAGING_OPERATION_GROUPS, key)) {
    return {
      group: key,
      operations: AST_MESSAGING_OPERATION_GROUPS[key].slice(),
      count: AST_MESSAGING_OPERATION_GROUPS[key].length
    };
  }

  const spec = astMessagingGetOperationSpec(key);
  if (!spec) {
    throw new AstMessagingValidationError('Unknown messaging operation or capability group', {
      operationOrGroup: key
    });
  }

  return {
    operation: key,
    group: spec.group,
    channel: spec.channel,
    read: spec.read === true,
    mutation: spec.mutation === true,
    dryRun: spec.dryRun === true,
    transport: spec.transport ? spec.transport.slice() : []
  };
}
