import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('template register/get/render supports typed variables and defaults', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_TEMPLATE_BACKEND: 'memory',
    MESSAGING_TEMPLATE_NAMESPACE: 'test_templates'
  });

  const registered = context.AST.Messaging.registerTemplate({
    body: {
      templateId: 'welcome_email',
      channel: 'email',
      template: {
        subject: 'Hello {{name}}',
        textBody: 'Orders: {{order_count}}',
        variables: {
          name: { type: 'string', required: true },
          order_count: { type: 'number', default: 0 }
        }
      }
    }
  });

  assert.equal(registered.status, 'ok');
  assert.equal(registered.operation, 'template_register');
  assert.equal(registered.data.templateId, 'welcome_email');
  assert.equal(registered.data.channel, 'email');

  const got = context.AST.Messaging.getTemplate({
    body: {
      templateId: 'welcome_email'
    }
  });
  assert.equal(got.status, 'ok');
  assert.equal(got.data.item.templateId, 'welcome_email');

  const rendered = context.AST.Messaging.renderTemplate({
    body: {
      templateId: 'welcome_email',
      variables: {
        name: 'Joe'
      }
    }
  });
  assert.equal(rendered.status, 'ok');
  assert.equal(rendered.data.rendered.subject, 'Hello Joe');
  assert.equal(rendered.data.rendered.textBody, 'Orders: 0');
});

test('template render throws deterministic errors for missing required vars and type mismatch', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.registerTemplate({
    body: {
      templateId: 'typed_email',
      channel: 'email',
      template: {
        subject: 'Hello {{name}}',
        textBody: 'Region {{region}}',
        variables: {
          name: { type: 'string', required: true }
        }
      }
    }
  });

  assert.throws(
    () => context.AST.Messaging.renderTemplate({
      body: {
        templateId: 'typed_email',
        variables: {}
      }
    }),
    /Missing required template variables/
  );

  assert.throws(
    () => context.AST.Messaging.renderTemplate({
      body: {
        templateId: 'typed_email',
        variables: {
          name: 42,
          region: 'eu'
        }
      }
    }),
    /Template variable type mismatch/
  );
});

test('sendTemplate forwards to email send flow with rendered payload', () => {
  const sent = [];
  const context = createGasContext({
    GmailApp: {
      sendEmail: (to, subject, textBody, options) => {
        sent.push({ to, subject, textBody, options });
      }
    }
  });
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.registerTemplate({
    body: {
      templateId: 'send_email',
      channel: 'email',
      template: {
        subject: 'Deployment {{release}}',
        textBody: 'Status: {{status}}',
        variables: {
          release: { type: 'string', required: true },
          status: { type: 'string', required: true }
        }
      }
    }
  });

  const response = context.AST.Messaging.sendTemplate({
    body: {
      templateId: 'send_email',
      to: ['user@example.com'],
      variables: {
        release: '2026.03.03',
        status: 'ok'
      }
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.operation, 'template_send');
  assert.equal(response.transport, 'gmailapp');
  assert.equal(response.data.template.templateId, 'send_email');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'user@example.com');
  assert.equal(sent[0].subject, 'Deployment 2026.03.03');
  assert.equal(sent[0].textBody, 'Status: ok');
});

test('sendTemplate forwards to chat send flow with rendered message', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/1' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });
  loadMessagingScripts(context, { includeAst: true });

  const webhookUrl = 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y';
  context.AST.Messaging.registerTemplate({
    body: {
      templateId: 'chat_build_done',
      channel: 'chat',
      template: {
        content: {
          transport: 'chat_webhook',
          webhookUrl,
          message: {
            text: 'Build {{build_id}} completed'
          }
        },
        variables: {
          build_id: { type: 'string', required: true }
        }
      }
    }
  });

  const response = context.AST.Messaging.sendTemplate({
    body: {
      templateId: 'chat_build_done',
      variables: {
        build_id: 'b-100'
      }
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.transport, 'chat_webhook');
  assert.equal(response.data.template.templateId, 'chat_build_done');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, webhookUrl);
  assert.equal(String(calls[0].options.payload).includes('Build b-100 completed'), true);
});
