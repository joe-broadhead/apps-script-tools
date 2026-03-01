import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('chat teams webhook send/sendBatch use configured webhook and payload', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return {
          getResponseCode: () => 200,
          getContentText: () => '1',
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_TEAMS_WEBHOOK_URL: 'https://outlook.office.com/webhook/test'
  });

  const sent = context.AST.Messaging.chat.send({
    body: {
      transport: 'teams_webhook',
      message: {
        text: 'hello teams'
      }
    }
  });

  assert.equal(sent.status, 'ok');
  assert.equal(sent.transport, 'teams_webhook');

  const batch = context.AST.Messaging.chat.sendBatch({
    body: {
      transport: 'teams_webhook',
      messages: [{ message: { text: 'x' } }, { message: { text: 'y' } }]
    }
  });

  assert.equal(batch.data.sent, 2);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, 'https://outlook.office.com/webhook/test');
});

test('chat teams aliases normalize and route to teams_webhook', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => '1',
        getAllHeaders: () => ({})
      })
    }
  });

  loadMessagingScripts(context, { includeAst: true });

  const out = context.AST.Messaging.chat.send({
    body: {
      transport: 'msteams',
      webhookUrl: 'https://outlook.office.com/webhook/alias',
      message: 'hello'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.transport, 'teams_webhook');
});
