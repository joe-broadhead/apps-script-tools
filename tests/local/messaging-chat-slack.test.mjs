import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('chat slack webhook send/sendBatch use configured webhook and JSON payload', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return {
          getResponseCode: () => 200,
          getContentText: () => 'ok',
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T000/B000/XXX'
  });

  const single = context.AST.Messaging.chat.send({
    body: {
      transport: 'slack_webhook',
      message: {
        text: 'hello slack'
      }
    }
  });

  assert.equal(single.status, 'ok');
  assert.equal(single.transport, 'slack_webhook');

  const batch = context.AST.Messaging.chat.sendBatch({
    body: {
      transport: 'slack_webhook',
      messages: [{ message: { text: 'one' } }, { message: { text: 'two' } }]
    }
  });

  assert.equal(batch.data.sent, 2);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, 'https://hooks.slack.com/services/T000/B000/XXX');
  assert.equal(typeof calls[0].options.payload, 'string');
});

test('chat slack api send/sendBatch set bearer auth and handles Slack ok=false errors', () => {
  const calls = [];
  let respondWithError = false;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        if (respondWithError) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({ ok: false, error: 'channel_not_found' }),
            getAllHeaders: () => ({})
          };
        }
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, ts: '123.456' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_SLACK_BOT_TOKEN: 'xoxb-config-token',
    MESSAGING_SLACK_CHANNEL: 'C123'
  });

  const sent = context.AST.Messaging.chat.send({
    body: {
      transport: 'slack_api',
      message: {
        text: 'hello slack api'
      }
    }
  });

  assert.equal(sent.status, 'ok');
  assert.equal(sent.transport, 'slack_api');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer xoxb-config-token');

  const batch = context.AST.Messaging.chat.sendBatch({
    body: {
      transport: 'slack_api',
      channel: 'C777',
      messages: [{ message: { text: 'a' } }, { message: { text: 'b' } }]
    },
    auth: {
      slackBotToken: 'xoxb-request-token'
    }
  });

  assert.equal(batch.data.sent, 2);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer xoxb-request-token');

  respondWithError = true;
  assert.throws(
    () => context.AST.Messaging.chat.send({
      body: {
        transport: 'slack_api',
        channel: 'C999',
        message: { text: 'boom' }
      },
      auth: {
        slackBotToken: 'xoxb-request-token'
      }
    }),
    error => error.name === 'AstMessagingProviderError' && /Slack API rejected/.test(error.message)
  );
});
