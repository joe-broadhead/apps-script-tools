function cookbookConfigureMessaging_(ASTX, config) {
  ASTX.Messaging.clearConfig();
  ASTX.Messaging.configure({
    MESSAGING_DEFAULT_FROM: 'alerts@example.com',
    MESSAGING_DEFAULT_REPLY_TO: 'support@example.com',
    MESSAGING_CHAT_WEBHOOK_URL: config.MESSAGING_HUB_CHAT_WEBHOOK_URL,
    MESSAGING_SLACK_WEBHOOK_URL: config.MESSAGING_HUB_SLACK_WEBHOOK_URL,
    MESSAGING_TEAMS_WEBHOOK_URL: config.MESSAGING_HUB_TEAMS_WEBHOOK_URL,
    MESSAGING_TRACKING_ENABLED: 'true',
    MESSAGING_TRACKING_OPEN_ENABLED: 'true',
    MESSAGING_TRACKING_CLICK_ENABLED: 'true',
    MESSAGING_TRACKING_BASE_URL: config.MESSAGING_HUB_TRACKING_BASE_URL,
    MESSAGING_TRACKING_SIGNING_SECRET: config.MESSAGING_HUB_TRACKING_SIGNING_SECRET,
    MESSAGING_TRACKING_ALLOWED_DOMAINS: config.MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS,
    MESSAGING_LOG_BACKEND: config.MESSAGING_HUB_LOG_BACKEND,
    MESSAGING_LOG_NAMESPACE: config.MESSAGING_HUB_LOG_NAMESPACE,
    MESSAGING_LOG_DRIVE_FOLDER_ID: config.MESSAGING_HUB_LOG_DRIVE_FOLDER_ID,
    MESSAGING_LOG_DRIVE_FILE_NAME: config.MESSAGING_HUB_LOG_DRIVE_FILE_NAME,
    MESSAGING_LOG_STORAGE_URI: config.MESSAGING_HUB_LOG_STORAGE_URI,
    MESSAGING_TEMPLATE_BACKEND: config.MESSAGING_HUB_TEMPLATE_BACKEND,
    MESSAGING_TEMPLATE_NAMESPACE: config.MESSAGING_HUB_TEMPLATE_NAMESPACE,
    MESSAGING_TEMPLATE_DRIVE_FOLDER_ID: config.MESSAGING_HUB_TEMPLATE_DRIVE_FOLDER_ID,
    MESSAGING_TEMPLATE_DRIVE_FILE_NAME: config.MESSAGING_HUB_TEMPLATE_DRIVE_FILE_NAME,
    MESSAGING_TEMPLATE_STORAGE_URI: config.MESSAGING_HUB_TEMPLATE_STORAGE_URI,
    MESSAGING_INBOUND_SLACK_SIGNING_SECRET: config.MESSAGING_HUB_INBOUND_SLACK_SIGNING_SECRET,
    MESSAGING_INBOUND_GOOGLE_CHAT_VERIFICATION_TOKEN: config.MESSAGING_HUB_INBOUND_GOOGLE_CHAT_TOKEN,
    MESSAGING_INBOUND_REPLAY_BACKEND: 'memory',
    MESSAGING_INBOUND_REPLAY_NAMESPACE: `ast_cookbook_${cookbookName_()}_replay`,
    MESSAGING_INBOUND_REPLAY_TTL_SEC: '600'
  });
}

function cookbookTemplateIds_() {
  return {
    email: `${cookbookName_()}_release_email`,
    chat: `${cookbookName_()}_release_chat`
  };
}

function cookbookRegisterTemplates_(ASTX) {
  const ids = cookbookTemplateIds_();

  ASTX.Messaging.registerTemplate({
    body: {
      templateId: ids.email,
      channel: 'email',
      template: {
        subject: 'Release {{release}} for {{name}}',
        textBody: 'Status {{status}}',
        htmlBody: '<p>Status {{status}}</p><a href="https://docs.example.com/release/{{release}}">Open release notes</a>',
        variables: {
          release: { type: 'string', required: true },
          name: { type: 'string', required: true },
          status: { type: 'string', required: true }
        }
      }
    }
  });

  ASTX.Messaging.registerTemplate({
    body: {
      templateId: ids.chat,
      channel: 'chat',
      template: {
        content: {
          transport: 'webhook',
          webhookUrl: 'https://chat.googleapis.com/v1/spaces/SPACE/messages?key=example&token=example',
          message: {
            text: 'Release {{release}} is {{status}}'
          }
        },
        variables: {
          release: { type: 'string', required: true },
          status: { type: 'string', required: true }
        }
      }
    }
  });

  return ids;
}

function cookbookBuildSmokeChatRequest_(config) {
  const transport = config.MESSAGING_HUB_CHAT_TRANSPORT;
  const message = {
    text: `${config.MESSAGING_HUB_APP_NAME} smoke notification`
  };

  if (transport === 'slack_webhook') {
    return {
      transport,
      webhookUrl: config.MESSAGING_HUB_SLACK_WEBHOOK_URL,
      message
    };
  }

  if (transport === 'teams_webhook') {
    return {
      transport,
      webhookUrl: config.MESSAGING_HUB_TEAMS_WEBHOOK_URL,
      message
    };
  }

  return {
    transport,
    webhookUrl: config.MESSAGING_HUB_CHAT_WEBHOOK_URL,
    message
  };
}

function cookbookAssert_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Cookbook assertion failed.');
  }
}

function cookbookToHex_(bytes) {
  let out = '';
  for (let idx = 0; idx < bytes.length; idx += 1) {
    const normalized = bytes[idx] < 0 ? bytes[idx] + 256 : bytes[idx];
    out += normalized.toString(16).padStart(2, '0');
  }
  return out;
}

function cookbookBuildSlackSignature_(timestampSec, rawBody, secret) {
  const base = `v0:${timestampSec}:${rawBody}`;
  const bytes = Utilities.computeHmacSha256Signature(base, secret);
  return `v0=${cookbookToHex_(bytes)}`;
}

function cookbookBuildSlackFixture_(config, options) {
  const settings = options || {};
  const timestampSec = settings.timestampSec || Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({
    type: 'event_callback',
    event_id: settings.eventId || `evt_${Date.now()}`,
    event: {
      type: 'message',
      text: settings.text || 'hello from slack'
    }
  });
  const signature = cookbookBuildSlackSignature_(
    timestampSec,
    rawBody,
    config.MESSAGING_HUB_INBOUND_SLACK_SIGNING_SECRET
  );

  return {
    rawBody,
    headers: {
      'x-slack-request-timestamp': String(timestampSec),
      'x-slack-signature': signature
    }
  };
}

function cookbookBuildGoogleChatFixture_(config, options) {
  const settings = options || {};
  return {
    type: 'MESSAGE',
    token: config.MESSAGING_HUB_INBOUND_GOOGLE_CHAT_TOKEN,
    eventId: settings.eventId || `evt_google_chat_${Date.now()}`,
    message: {
      text: settings.text || 'hello from google chat'
    }
  };
}

function cookbookQueryFromUrl_(url) {
  const out = {};
  if (!url || url.indexOf('?') === -1) {
    return out;
  }

  const query = String(url).replace(/&amp;/g, '&').split('?').slice(1).join('?');
  const pairs = query.split('&');
  for (let idx = 0; idx < pairs.length; idx += 1) {
    const pair = pairs[idx];
    if (!pair) {
      continue;
    }
    const parts = pair.split('=');
    const key = decodeURIComponent(parts[0] || '');
    const value = decodeURIComponent(parts.slice(1).join('=') || '');
    out[key] = value;
  }
  return out;
}

function cookbookFirstTrackedHref_(html) {
  const match = String(html || '').match(/href="([^"]+)"/i);
  return match ? match[1] : '';
}

function cookbookPublicConfig_(config) {
  return {
    MESSAGING_HUB_APP_NAME: config.MESSAGING_HUB_APP_NAME,
    MESSAGING_HUB_DEFAULT_EMAIL_TO: config.MESSAGING_HUB_DEFAULT_EMAIL_TO,
    MESSAGING_HUB_CHAT_TRANSPORT: config.MESSAGING_HUB_CHAT_TRANSPORT,
    MESSAGING_HUB_LOG_BACKEND: config.MESSAGING_HUB_LOG_BACKEND,
    MESSAGING_HUB_LOG_NAMESPACE: config.MESSAGING_HUB_LOG_NAMESPACE,
    MESSAGING_HUB_TEMPLATE_BACKEND: config.MESSAGING_HUB_TEMPLATE_BACKEND,
    MESSAGING_HUB_TEMPLATE_NAMESPACE: config.MESSAGING_HUB_TEMPLATE_NAMESPACE,
    MESSAGING_HUB_TRACKING_BASE_URL: config.MESSAGING_HUB_TRACKING_BASE_URL,
    MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS: config.MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS,
    MESSAGING_HUB_INBOUND_GOOGLE_CHAT_TOKEN: '[configured]',
    MESSAGING_HUB_INBOUND_SLACK_SIGNING_SECRET: '[configured]',
    MESSAGING_HUB_TRACKING_SIGNING_SECRET: '[configured]'
  };
}

function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  cookbookConfigureMessaging_(ASTX, config);

  const templateIds = cookbookRegisterTemplates_(ASTX);
  const emailPlan = ASTX.Messaging.email.send({
    body: {
      to: [config.MESSAGING_HUB_DEFAULT_EMAIL_TO],
      subject: 'Direct dry-run send',
      textBody: 'This is a direct email dry-run example.',
      htmlBody: '<p>Direct email</p><a href="https://docs.example.com/demo">Read docs</a>',
      options: {
        track: {
          enabled: true,
          open: true,
          click: true
        }
      }
    },
    options: {
      dryRun: true
    }
  });

  const chatBatchPlan = ASTX.Messaging.chat.sendBatch({
    body: {
      transport: 'slack_webhook',
      webhookUrl: config.MESSAGING_HUB_SLACK_WEBHOOK_URL,
      messages: [
        { message: { text: 'Release started' } },
        { message: { text: 'Release finished' } }
      ]
    },
    options: {
      dryRun: true
    }
  });

  const renderedEmail = ASTX.Messaging.renderTemplate({
    body: {
      templateId: templateIds.email,
      variables: {
        release: '2026.03.14',
        name: 'Ops Team',
        status: 'ok'
      }
    }
  });

  const templatePlan = ASTX.Messaging.sendTemplate({
    body: {
      templateId: templateIds.chat,
      variables: {
        release: '2026.03.14',
        status: 'ok'
      }
    },
    options: {
      dryRun: true
    }
  });

  const pixelUrl = ASTX.Messaging.tracking.buildPixelUrl({
    body: {
      deliveryId: 'delivery_demo_open',
      eventType: 'open',
      trackingHash: 'hash_demo_open'
    }
  });

  const handledPixel = ASTX.Messaging.tracking.handleWebEvent({
    body: {
      query: cookbookQueryFromUrl_(pixelUrl.data.url)
    }
  });

  const wrapped = ASTX.Messaging.tracking.wrapLinks({
    body: {
      html: '<a href="https://docs.example.com/releases/2026-03-14">Release notes</a>',
      deliveryId: 'delivery_demo_click',
      trackingHash: 'hash_demo_click',
      allowedDomains: cookbookNormalizeCsv_(config.MESSAGING_HUB_TRACKING_ALLOWED_DOMAINS)
    }
  });

  const trackedHref = cookbookFirstTrackedHref_(wrapped.data.html);
  const handledClick = ASTX.Messaging.tracking.handleWebEvent({
    body: {
      query: cookbookQueryFromUrl_(trackedHref)
    }
  });

  const recorded = ASTX.Messaging.tracking.recordEvent({
    body: {
      eventType: 'delivered',
      deliveryId: 'delivery_demo_log',
      trackingHash: 'hash_demo_log'
    }
  });

  const eventId = recorded.data.log.eventId;
  const fetchedLog = ASTX.Messaging.logs.get({ body: { eventId } });
  const deletedLog = ASTX.Messaging.logs.delete({ body: { eventId } });

  const slackFormPayload = JSON.stringify({
    type: 'event_callback',
    event_id: 'evt_form_slack_demo',
    event: {
      type: 'message',
      text: 'form encoded payload'
    }
  });
  const parsedSlack = ASTX.Messaging.parseInbound({
    body: {
      provider: 'slack',
      rawBody: `payload=${encodeURIComponent(slackFormPayload)}`
    }
  });

  const routedGoogleChat = ASTX.Messaging.routeInbound({
    body: {
      provider: 'google_chat',
      payload: cookbookBuildGoogleChatFixture_(config, {
        eventId: 'evt_google_chat_demo',
        text: 'route this google chat message'
      }),
      routes: {
        'google_chat:MESSAGE': routeContext => ({
          ok: true,
          provider: routeContext.provider,
          text: routeContext.text
        }),
        default: () => ({ ok: false })
      }
    }
  });

  cookbookAssert_(handledPixel.data.pixel === true, 'Tracking pixel event did not resolve to a pixel response.');
  cookbookAssert_(handledClick.data.redirectUrl === 'https://docs.example.com/releases/2026-03-14', 'Tracking click redirect did not preserve the expected target URL.');
  cookbookAssert_(deletedLog.data.deleted === true, 'Messaging log delete did not confirm deletion.');
  cookbookAssert_(routedGoogleChat.data.output.ok === true, 'Google Chat route handler did not execute successfully.');

  return {
    status: 'ok',
    entrypoint: 'runCookbookDemo',
    cookbook: cookbookName_(),
    config: cookbookPublicConfig_(config),
    emailPlan: {
      dryRun: emailPlan.dryRun.enabled,
      plannedOperation: emailPlan.dryRun.plannedRequest.operation
    },
    chatBatchPlan: {
      plannedMessages: Array.isArray(chatBatchPlan.dryRun.plannedRequest.body.messages)
        ? chatBatchPlan.dryRun.plannedRequest.body.messages.length
        : 0,
      dryRun: chatBatchPlan.dryRun.enabled,
      transport: chatBatchPlan.transport
    },
    renderedEmail: renderedEmail.data.rendered,
    templatePlan: {
      transport: templatePlan.transport,
      dryRun: templatePlan.dryRun.enabled,
      templateId: templatePlan.dryRun.plannedRequest.body.templateId
    },
    tracking: {
      pixelUrl: pixelUrl.data.url,
      handledPixel: handledPixel.data,
      wrappedCount: wrapped.data.wrappedCount,
      redirectUrl: handledClick.data.redirectUrl
    },
    logs: {
      fetchedEventId: fetchedLog.data.item.eventId,
      deleted: deletedLog.data.deleted
    },
    inbound: {
      parsedSlack: parsedSlack.data.parsed,
      routedGoogleChat: routedGoogleChat.data.route,
      output: routedGoogleChat.data.output
    },
    generatedAt: new Date().toISOString()
  };
}
