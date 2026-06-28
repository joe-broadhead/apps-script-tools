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
          getContentText: () => JSON.stringify({
            name: 'spaces/abc/messages/1',
            echo: {
              webhookUrl: url,
              callback: 'https://example.com/callback?client_secret=s3',
              token: 'provider-token'
            }
          }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_LOG_BACKEND: 'memory',
    MESSAGING_LOG_NAMESPACE: 'ast_messaging_webhook_redaction'
  });
  context.AST.Telemetry._reset();
  context.AST.Telemetry.clearConfig();
  context.AST.Telemetry.configure({
    sink: 'logger',
    redactSecrets: true
  });

  const webhookUrl = 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y';

  const single = context.AST.Messaging.chat.send({
    body: {
      transport: 'webhook',
      webhookUrl,
      message: {
        text: 'hello'
      }
    },
    options: {
      telemetry: {
        enabled: true
      }
    }
  });

  assert.equal(single.status, 'ok');
  assert.equal(single.transport, 'chat_webhook');
  assert.equal(single.data.request.webhookUrl, '[REDACTED]');
  assert.equal(single.data.response.echo.webhookUrl, '[REDACTED]');
  assert.equal(single.data.response.echo.callback, 'https://example.com/callback?client_secret=[REDACTED]');
  assert.equal(single.data.response.echo.token, '[REDACTED]');
  assert.deepEqual(JSON.parse(single.data.raw.text), {
    name: 'spaces/abc/messages/1',
    echo: {
      webhookUrl: '[REDACTED]',
      callback: 'https://example.com/callback?client_secret=[REDACTED]',
      token: '[REDACTED]'
    }
  });
  assert.equal(single.data.raw.text.includes('provider-token'), false);

  const log = context.AST.Messaging.logs.get({ body: { eventId: single.log.eventId } });
  assert.equal(log.data.item.payload.request.body.webhookUrl, '[REDACTED]');
  assert.equal(log.data.item.payload.result.request.webhookUrl, '[REDACTED]');
  assert.deepEqual(JSON.parse(log.data.item.payload.result.raw.text), {
    name: 'spaces/abc/messages/1',
    echo: {
      webhookUrl: '[REDACTED]',
      callback: 'https://example.com/callback?client_secret=[REDACTED]',
      token: '[REDACTED]'
    }
  });
  assert.equal(log.data.item.payload.result.raw.text.includes('client_secret=s3'), false);
  assert.equal(log.data.item.payload.result.raw.text.includes('provider-token'), false);

  const telemetry = context.AST.Telemetry.query({
    name: 'messaging.chat_send',
    page: { limit: 1, offset: 0 }
  });
  assert.equal(telemetry.page.returned, 1);
  const trace = context.AST.Telemetry.getTrace(telemetry.items[0].traceId);
  assert.equal(trace.spans[0].result.result.data.request.webhookUrl, '[REDACTED]');
  assert.deepEqual(JSON.parse(trace.spans[0].result.result.data.raw.text), {
    name: 'spaces/abc/messages/1',
    echo: {
      webhookUrl: '[REDACTED]',
      callback: 'https://example.com/callback?client_secret=[REDACTED]',
      token: '[REDACTED]'
    }
  });
  assert.equal(trace.spans[0].result.result.data.raw.text.includes('provider-token'), false);

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

test('chat webhook redacts generic webhook path echoes in successful responses', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: url => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          ok: true,
          url: 'https://example.com/webhook/secret',
          nested: {
            requestUrl: url
          }
        }),
        getAllHeaders: () => ({
          Location: 'https://example.com/webhook/secret?token=x',
          Relative: '/webhook/secret?token=x',
          'X-Webhook-Token': 'raw-provider-token',
          'X-Trace': 'safe'
        })
      })
    }
  });

  loadMessagingScripts(context, { includeAst: true });

  const sent = context.AST.Messaging.chat.send({
    body: {
      transport: 'webhook',
      webhookUrl: 'https://example.com/webhook/secret?token=x',
      message: 'hello'
    }
  });

  assert.equal(sent.status, 'ok');
  assert.equal(sent.data.response.url, 'https://example.com');
  assert.equal(sent.data.response.nested.requestUrl, 'https://example.com');
  assert.equal(sent.data.raw.json.url, 'https://example.com');
  assert.equal(sent.data.raw.headers.Location, 'https://example.com');
  assert.equal(sent.data.raw.headers.Relative, 'https://example.com');
  assert.equal(sent.data.raw.headers['X-Webhook-Token'], '[REDACTED]');
  assert.equal(sent.data.raw.headers['X-Trace'], 'safe');
  assert.equal(sent.data.raw.text.includes('/webhook/secret'), false);
  assert.equal(JSON.stringify(sent.data.raw.headers).includes('/webhook/secret'), false);
  assert.equal(sent.data.raw.text.includes('token=x'), false);
});
