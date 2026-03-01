import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('validation rejects unsupported messaging operation', () => {
  const context = createGasContext();
  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingValidateRequest({ operation: 'not_real' }),
    /Unsupported messaging operation/
  );
});

test('validation enforces required email_send fields', () => {
  const context = createGasContext();
  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingValidateRequest({
      operation: 'email_send',
      body: {
        to: ['user@example.com']
      }
    }),
    /body.subject/
  );
});

test('validation enforces required chat transport payload', () => {
  const context = createGasContext();
  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingValidateRequest({
      operation: 'chat_send',
      body: {
        transport: 'chat_api',
        message: { text: 'hello' }
      }
    }),
    /body.space/
  );
});

test('validation accepts webhook transports without explicit request webhook URL', () => {
  const context = createGasContext();
  loadMessagingScripts(context);

  const slack = context.astMessagingValidateRequest({
    operation: 'chat_send',
    body: {
      transport: 'slack_webhook',
      message: { text: 'hello' }
    }
  });
  assert.equal(slack.operation, 'chat_send');

  const teams = context.astMessagingValidateRequest({
    operation: 'chat_send',
    body: {
      transport: 'teams_webhook',
      message: { text: 'hello' }
    }
  });
  assert.equal(teams.operation, 'chat_send');
});

test('validation rejects unsupported chat transport aliases', () => {
  const context = createGasContext();
  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingValidateRequest({
      operation: 'chat_send',
      body: {
        transport: 'discord_webhook',
        message: { text: 'hello' }
      }
    }),
    /Unsupported chat transport/
  );
});

test('validation rejects non-chat_api transport for chat read operations', () => {
  const context = createGasContext();
  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingValidateRequest({
      operation: 'chat_get_message',
      body: {
        transport: 'slack_webhook',
        messageName: 'spaces/abc/messages/1'
      }
    }),
    /only chat_api transport/
  );
});
