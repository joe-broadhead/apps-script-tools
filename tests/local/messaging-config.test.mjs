import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('messaging configure/get/clear lifecycle and merge semantics', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  context.AST.Messaging.clearConfig();

  const configured = context.AST.Messaging.configure({
    MESSAGING_TIMEOUT_MS: '12000',
    MESSAGING_RETRIES: '4',
    MESSAGING_DEFAULT_FROM: 'sender@example.com'
  });

  assert.equal(configured.MESSAGING_TIMEOUT_MS, '12000');
  assert.equal(configured.MESSAGING_RETRIES, '4');

  const merged = context.AST.Messaging.configure({
    MESSAGING_CHAT_WEBHOOK_URL: 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
    MESSAGING_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T000/B000/XXX',
    MESSAGING_TEAMS_WEBHOOK_URL: 'https://outlook.office.com/webhook/test'
  });

  assert.equal(merged.MESSAGING_TIMEOUT_MS, '12000');
  assert.equal(merged.MESSAGING_CHAT_WEBHOOK_URL.startsWith('https://'), true);
  assert.equal(merged.MESSAGING_SLACK_WEBHOOK_URL.startsWith('https://'), true);
  assert.equal(merged.MESSAGING_TEAMS_WEBHOOK_URL.startsWith('https://'), true);

  const reset = context.AST.Messaging.configure({
    MESSAGING_TIMEOUT_MS: '6000'
  }, { merge: false });

  assert.equal(reset.MESSAGING_TIMEOUT_MS, '6000');
  assert.equal(Object.prototype.hasOwnProperty.call(reset, 'MESSAGING_RETRIES'), false);

  const cleared = context.AST.Messaging.clearConfig();
  assert.equal(typeof cleared, 'object');
  assert.equal(cleared && Object.keys(cleared).length, 0);
});
