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
