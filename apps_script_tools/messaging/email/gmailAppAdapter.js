function astMessagingEmailEnsureGmailApp() {
  if (typeof GmailApp === 'undefined' || !GmailApp) {
    throw new AstMessagingCapabilityError('Email operations require GmailApp runtime', {
      required: 'GmailApp'
    });
  }
}

function astMessagingEmailNormalizeString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function astMessagingEmailNormalizeArray(value) {
  if (Array.isArray(value)) {
    return value.slice();
  }
  if (value == null) {
    return [];
  }
  return [value];
}

function astMessagingEmailNormalizeRecipients(value) {
  const recipients = astMessagingEmailNormalizeArray(value)
    .map(item => astMessagingEmailNormalizeString(item, ''))
    .filter(Boolean);
  return Array.from(new Set(recipients));
}

function astMessagingEmailApplyTrackingToHtml(htmlBody, trackingInfo, resolvedConfig = {}) {
  let output = astMessagingEmailNormalizeString(htmlBody, '');
  let clickWrapped = false;

  if (!trackingInfo || trackingInfo.enabled !== true) {
    return {
      htmlBody: output,
      clickWrapped
    };
  }

  if (trackingInfo.clickEnabled && output) {
    const wrapped = astMessagingWrapLinks({
      html: output,
      deliveryId: trackingInfo.deliveryId,
      trackingHash: trackingInfo.trackingHash
    }, resolvedConfig);
    output = wrapped.html;
    clickWrapped = wrapped.wrappedCount > 0;
  }

  if (trackingInfo.openEnabled && trackingInfo.pixelUrl) {
    const pixel = `<img src="${trackingInfo.pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
    output = `${output}${pixel}`;
  }

  return {
    htmlBody: output,
    clickWrapped
  };
}

function astMessagingEmailBuildSendOptions(body = {}, rendered = {}, resolvedConfig = {}, trackingInfo = null) {
  const options = body.options && typeof body.options === 'object'
    ? Object.assign({}, body.options)
    : {};

  const sendOptions = {};
  const cc = astMessagingEmailNormalizeRecipients(options.cc);
  const bcc = astMessagingEmailNormalizeRecipients(options.bcc);
  if (cc.length > 0) {
    sendOptions.cc = cc.join(',');
  }
  if (bcc.length > 0) {
    sendOptions.bcc = bcc.join(',');
  }

  const from = astMessagingEmailNormalizeString(options.from, resolvedConfig.defaults.from || '');
  if (from) {
    sendOptions.from = from;
  }

  const name = astMessagingEmailNormalizeString(options.name, resolvedConfig.defaults.senderName || '');
  if (name) {
    sendOptions.name = name;
  }

  const replyTo = astMessagingEmailNormalizeString(options.replyTo, resolvedConfig.defaults.replyTo || '');
  if (replyTo) {
    sendOptions.replyTo = replyTo;
  }

  const noReply = typeof options.noReply === 'boolean'
    ? options.noReply
    : Boolean(resolvedConfig.defaults.noReply);
  sendOptions.noReply = noReply;

  if (Array.isArray(options.attachments) && options.attachments.length > 0) {
    sendOptions.attachments = options.attachments.slice();
  }

  if (options.inlineImages && typeof options.inlineImages === 'object' && !Array.isArray(options.inlineImages)) {
    sendOptions.inlineImages = Object.assign({}, options.inlineImages);
  }

  const trackingApplied = astMessagingEmailApplyTrackingToHtml(rendered.htmlBody, trackingInfo, resolvedConfig);
  if (trackingApplied.htmlBody) {
    sendOptions.htmlBody = trackingApplied.htmlBody;
  }

  return {
    sendOptions,
    trackingApplied
  };
}

function astMessagingEmailMapMessage(message, includeBodies = false) {
  if (!message) {
    return null;
  }

  const output = {
    id: typeof message.getId === 'function' ? message.getId() : '',
    subject: typeof message.getSubject === 'function' ? message.getSubject() : '',
    from: typeof message.getFrom === 'function' ? message.getFrom() : '',
    to: typeof message.getTo === 'function' ? message.getTo() : '',
    cc: typeof message.getCc === 'function' ? message.getCc() : '',
    bcc: typeof message.getBcc === 'function' ? message.getBcc() : '',
    date: typeof message.getDate === 'function' && message.getDate() ? message.getDate().toISOString() : null,
    threadId: typeof message.getThread === 'function' && message.getThread() && typeof message.getThread().getId === 'function'
      ? message.getThread().getId()
      : '',
    snippet: typeof message.getPlainBody === 'function'
      ? String(message.getPlainBody() || '').slice(0, 200)
      : ''
  };

  if (includeBodies) {
    output.plainBody = typeof message.getPlainBody === 'function' ? message.getPlainBody() : '';
    output.htmlBody = typeof message.getBody === 'function' ? message.getBody() : '';
  }

  return output;
}

function astMessagingEmailMapThread(thread, includeMessages = true, includeBodies = false) {
  if (!thread) {
    return null;
  }

  const messages = includeMessages && typeof thread.getMessages === 'function'
    ? thread.getMessages().map(message => astMessagingEmailMapMessage(message, includeBodies)).filter(Boolean)
    : [];

  return {
    id: typeof thread.getId === 'function' ? thread.getId() : '',
    firstMessageSubject: typeof thread.getFirstMessageSubject === 'function' ? thread.getFirstMessageSubject() : '',
    messageCount: typeof thread.getMessageCount === 'function' ? thread.getMessageCount() : messages.length,
    lastMessageDate: typeof thread.getLastMessageDate === 'function' && thread.getLastMessageDate()
      ? thread.getLastMessageDate().toISOString()
      : null,
    messages
  };
}

function astMessagingEmailSendSingle(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  astMessagingEmailEnsureGmailApp();

  const recipients = astMessagingEmailNormalizeRecipients(body.to);
  const rendered = astMessagingRenderEmailContent(body);
  const trackingInfo = astMessagingPrepareEmailTracking(body, resolvedConfig);
  const sendOptionsResult = astMessagingEmailBuildSendOptions(body, rendered, resolvedConfig, trackingInfo);

  const subject = astMessagingEmailNormalizeString(rendered.subject, '');
  const plainTextBody = astMessagingEmailNormalizeString(rendered.textBody, 'This email requires HTML support');

  GmailApp.sendEmail(
    recipients.join(','),
    subject,
    plainTextBody,
    sendOptionsResult.sendOptions
  );

  trackingInfo.clickWrapped = sendOptionsResult.trackingApplied.clickWrapped;

  return {
    transport: 'gmailapp',
    recipients,
    subject,
    sentAt: new Date().toISOString(),
    tracking: trackingInfo,
    options: {
      noReply: sendOptionsResult.sendOptions.noReply === true,
      cc: sendOptionsResult.sendOptions.cc || '',
      bcc: sendOptionsResult.sendOptions.bcc || ''
    }
  };
}

function astMessagingEmailSendBatch(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  astMessagingEmailEnsureGmailApp();

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const items = messages.map(message => {
    const payload = message && typeof message === 'object'
      ? message
      : {};
    const output = astMessagingEmailSendSingle(payload, normalizedRequest, resolvedConfig);
    return {
      recipients: output.recipients,
      subject: output.subject,
      sentAt: output.sentAt,
      tracking: output.tracking
    };
  });

  return {
    transport: 'gmailapp',
    sent: items.length,
    items
  };
}

function astMessagingEmailCreateDraft(body = {}, normalizedRequest = {}, resolvedConfig = {}) {
  astMessagingEmailEnsureGmailApp();

  const recipients = astMessagingEmailNormalizeRecipients(body.to);
  const rendered = astMessagingRenderEmailContent(body);
  const trackingInfo = astMessagingPrepareEmailTracking(body, resolvedConfig);
  const sendOptionsResult = astMessagingEmailBuildSendOptions(body, rendered, resolvedConfig, trackingInfo);

  const draft = GmailApp.createDraft(
    recipients.join(','),
    astMessagingEmailNormalizeString(rendered.subject, ''),
    astMessagingEmailNormalizeString(rendered.textBody, 'This email requires HTML support'),
    sendOptionsResult.sendOptions
  );

  const draftId = draft && typeof draft.getId === 'function'
    ? draft.getId()
    : '';

  return {
    transport: 'gmailapp',
    draftId,
    createdAt: new Date().toISOString(),
    tracking: trackingInfo
  };
}

function astMessagingEmailSendDraft(body = {}) {
  astMessagingEmailEnsureGmailApp();

  if (typeof GmailApp.getDraft !== 'function') {
    throw new AstMessagingCapabilityError('GmailApp.getDraft is not available in this runtime');
  }

  const draftId = astMessagingEmailNormalizeString(body.draftId, '');
  const draft = GmailApp.getDraft(draftId);
  if (!draft) {
    throw new AstMessagingNotFoundError('Draft not found', { draftId });
  }

  if (typeof draft.send !== 'function') {
    throw new AstMessagingCapabilityError('Gmail draft object does not support send()');
  }

  draft.send();
  return {
    transport: 'gmailapp',
    draftId,
    sentAt: new Date().toISOString()
  };
}

function astMessagingEmailListThreads(body = {}) {
  astMessagingEmailEnsureGmailApp();

  const query = astMessagingEmailNormalizeString(body.query, '');
  const start = Math.max(0, Number(body.start || 0));
  const max = Math.max(1, Math.min(500, Number(body.max || 25)));

  const threads = GmailApp.search(query, start, max);
  return {
    query,
    items: threads.map(thread => astMessagingEmailMapThread(thread, false, false)).filter(Boolean),
    count: threads.length,
    start,
    max
  };
}

function astMessagingEmailGetThread(body = {}) {
  astMessagingEmailEnsureGmailApp();

  const threadId = astMessagingEmailNormalizeString(body.threadId, '');
  if (typeof GmailApp.getThreadById !== 'function') {
    throw new AstMessagingCapabilityError('GmailApp.getThreadById is not available in this runtime');
  }

  const thread = GmailApp.getThreadById(threadId);
  if (!thread) {
    throw new AstMessagingNotFoundError('Thread not found', { threadId });
  }

  const includeBodies = Boolean(body.includeBodies);
  return {
    item: astMessagingEmailMapThread(thread, true, includeBodies)
  };
}

function astMessagingEmailSearchMessages(body = {}) {
  astMessagingEmailEnsureGmailApp();

  const query = astMessagingEmailNormalizeString(body.query, '');
  const start = Math.max(0, Number(body.start || 0));
  const max = Math.max(1, Math.min(500, Number(body.max || 50)));
  const includeBodies = Boolean(body.includeBodies);

  const threads = GmailApp.search(query, start, max);
  const messages = [];
  threads.forEach(thread => {
    if (typeof thread.getMessages !== 'function') {
      return;
    }
    thread.getMessages().forEach(message => {
      const mapped = astMessagingEmailMapMessage(message, includeBodies);
      if (mapped) {
        messages.push(mapped);
      }
    });
  });

  return {
    query,
    items: messages,
    count: messages.length,
    start,
    max
  };
}

function astMessagingEmailGetMessage(body = {}) {
  astMessagingEmailEnsureGmailApp();

  const messageId = astMessagingEmailNormalizeString(body.messageId, '');
  if (typeof GmailApp.getMessageById !== 'function') {
    throw new AstMessagingCapabilityError('GmailApp.getMessageById is not available in this runtime');
  }

  const message = GmailApp.getMessageById(messageId);
  if (!message) {
    throw new AstMessagingNotFoundError('Message not found', { messageId });
  }

  return {
    item: astMessagingEmailMapMessage(message, Boolean(body.includeBodies))
  };
}

function astMessagingEmailListLabels() {
  astMessagingEmailEnsureGmailApp();

  const labels = typeof GmailApp.getUserLabels === 'function'
    ? GmailApp.getUserLabels()
    : [];

  return {
    items: labels.map(label => ({
      id: typeof label.getId === 'function' ? label.getId() : '',
      name: typeof label.getName === 'function' ? label.getName() : ''
    }))
  };
}

function astMessagingEmailUpdateMessageLabels(body = {}) {
  astMessagingEmailEnsureGmailApp();

  const messageId = astMessagingEmailNormalizeString(body.messageId, '');
  if (typeof GmailApp.getMessageById !== 'function') {
    throw new AstMessagingCapabilityError('GmailApp.getMessageById is not available in this runtime');
  }

  const message = GmailApp.getMessageById(messageId);
  if (!message) {
    throw new AstMessagingNotFoundError('Message not found', { messageId });
  }

  const addLabels = astMessagingEmailNormalizeArray(body.addLabels).map(label => astMessagingEmailNormalizeString(label, '')).filter(Boolean);
  const removeLabels = astMessagingEmailNormalizeArray(body.removeLabels).map(label => astMessagingEmailNormalizeString(label, '')).filter(Boolean);

  const resolveLabel = labelName => {
    if (typeof GmailApp.getUserLabelByName === 'function') {
      const existing = GmailApp.getUserLabelByName(labelName);
      if (existing) {
        return existing;
      }
    }

    if (typeof GmailApp.createLabel === 'function') {
      return GmailApp.createLabel(labelName);
    }

    throw new AstMessagingCapabilityError('GmailApp does not support label creation', { labelName });
  };

  addLabels.forEach(labelName => {
    if (typeof message.addLabel !== 'function') {
      throw new AstMessagingCapabilityError('Gmail message object does not support addLabel()');
    }
    message.addLabel(resolveLabel(labelName));
  });

  removeLabels.forEach(labelName => {
    if (typeof message.removeLabel !== 'function') {
      throw new AstMessagingCapabilityError('Gmail message object does not support removeLabel()');
    }

    let label = null;
    if (typeof GmailApp.getUserLabelByName === 'function') {
      label = GmailApp.getUserLabelByName(labelName);
    }

    if (label) {
      message.removeLabel(label);
    }
  });

  return {
    messageId,
    added: addLabels,
    removed: removeLabels
  };
}
