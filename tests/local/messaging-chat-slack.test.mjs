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
    MESSAGING_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T000/B000/XXX',
    MESSAGING_LOG_BACKEND: 'memory',
    MESSAGING_LOG_NAMESPACE: 'ast_messaging_slack_redaction'
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
  assert.equal(single.data.request.webhookUrl, '[REDACTED]');

  const log = context.AST.Messaging.logs.get({ body: { eventId: single.log.eventId } });
  assert.equal(log.data.item.payload.result.request.webhookUrl, '[REDACTED]');

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

test('chat slack api redacts sensitive provider echoes from response and raw output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          ok: true,
          ts: '123.456',
          token: 'provider-token',
          text: 'provider Authorization: Bearer provider-bearer client_secret=s3'
        }),
        getAllHeaders: () => ({
          'X-Webhook-Token': 'raw-provider-token',
          Location: 'https://example.com/webhook/secret?token=x'
        })
      })
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_SLACK_BOT_TOKEN: 'xoxb-secret-token',
    MESSAGING_SLACK_CHANNEL: 'C123'
  });

  const sent = context.AST.Messaging.chat.send({
    body: {
      transport: 'slack_api',
      message: {
        text: 'hello slack api'
      }
    },
    options: {
      includeRaw: true
    }
  });

  const serialized = JSON.stringify(sent);
  assert.equal(sent.status, 'ok');
  assert.equal(sent.data.response.token, '[REDACTED]');
  assert.equal(sent.data.raw.headers['X-Webhook-Token'], '[REDACTED]');
  assert.equal(sent.raw.headers['X-Webhook-Token'], '[REDACTED]');
  assert.equal(sent.raw.headers.Location, 'https://example.com/[REDACTED]');
  assert.equal(serialized.includes('provider-token'), false);
  assert.equal(serialized.includes('provider-bearer'), false);
  assert.equal(serialized.includes('client_secret=s3'), false);
  assert.equal(serialized.includes('/webhook/secret'), false);
  assert.equal(serialized.includes('raw-provider-token'), false);
  assert.equal(serialized.includes('xoxb-secret-token'), false);
});
