import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('chat webhook send and sendBatch call UrlFetchApp with JSON payload', () => {
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

  const single = context.AST.Messaging.chat.send({
    body: {
      transport: 'webhook',
      webhookUrl,
      message: {
        text: 'hello'
      }
    }
  });

  assert.equal(single.status, 'ok');
  assert.equal(single.transport, 'chat_webhook');

  const batch = context.AST.Messaging.chat.sendBatch({
    body: {
      transport: 'webhook',
      webhookUrl,
      messages: [
        { message: { text: 'one' } },
        { message: { text: 'two' } }
      ]
    }
  });

  assert.equal(batch.data.sent, 2);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, webhookUrl);
  assert.equal(typeof calls[0].options.payload, 'string');
});
