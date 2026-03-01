import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('email send renders template and dispatches GmailApp.sendEmail', () => {
  const sent = [];

  const context = createGasContext({
    GmailApp: {
      sendEmail: (to, subject, textBody, options) => {
        sent.push({ to, subject, textBody, options });
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.configure({
    MESSAGING_TRACKING_ENABLED: 'true',
    MESSAGING_TRACKING_OPEN_ENABLED: 'true',
    MESSAGING_TRACKING_CLICK_ENABLED: 'true',
    MESSAGING_TRACKING_BASE_URL: 'https://example.com',
    MESSAGING_TRACKING_SIGNING_SECRET: 'test-secret',
    MESSAGING_LOG_BACKEND: 'memory'
  });

  const response = context.AST.Messaging.email.send({
    body: {
      to: ['user@example.com'],
      subject: 'Hello {{name}}',
      textBody: 'Hi {{name}}',
      htmlBody: '<a href="https://example.org">open</a>',
      template: {
        params: {
          name: 'Joe'
        }
      },
      options: {
        track: {
          enabled: true,
          open: true,
          click: true
        }
      }
    }
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, 'Hello Joe');
  assert.equal(sent[0].textBody, 'Hi Joe');
  assert.equal(typeof sent[0].options.htmlBody, 'string');
  assert.equal(sent[0].options.htmlBody.includes('/tracking/event?'), true);

  assert.equal(response.status, 'ok');
  assert.equal(response.operation, 'email_send');
  assert.equal(response.transport, 'gmailapp');
  assert.equal(Array.isArray(response.data.recipients), true);
  assert.equal(response.data.recipients[0], 'user@example.com');
});
