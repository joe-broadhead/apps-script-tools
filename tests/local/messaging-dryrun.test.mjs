import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('dryRun on mutating operations returns planned request and skips provider calls', () => {
  let sendCalls = 0;

  const context = createGasContext({
    GmailApp: {
      sendEmail: () => {
        sendCalls += 1;
      }
    }
  });
  loadMessagingScripts(context, { includeAst: true });

  const response = context.AST.Messaging.email.send({
    body: {
      to: ['user@example.com'],
      subject: 'Hello',
      textBody: 'Body'
    },
    options: {
      dryRun: true
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(response.dryRun.enabled, true);
  assert.equal(response.dryRun.plannedRequest.operation, 'email_send');
  assert.equal(sendCalls, 0);
});
