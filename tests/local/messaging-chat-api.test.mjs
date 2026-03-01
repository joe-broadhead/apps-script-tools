import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('chat api send/get/list use bearer token and normalized payloads', () => {
  const calls = [];

  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token-123'
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        const isList = url.includes('/messages?pageSize=');
        const isGet = /\/messages\//.test(url) && !isList && options.method.toLowerCase() === 'get';

        if (isList) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({ messages: [{ name: 'spaces/abc/messages/1' }], nextPageToken: 'tok' }),
            getAllHeaders: () => ({})
          };
        }

        if (isGet) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/1', text: 'hello' }),
            getAllHeaders: () => ({})
          };
        }

        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/new' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });

  const sent = context.AST.Messaging.chat.send({
    body: {
      transport: 'chat_api',
      space: 'spaces/abc',
      message: {
        text: 'hello api'
      },
      thread: {
        threadKey: 'thread-1',
        reply: true
      }
    }
  });

  assert.equal(sent.status, 'ok');
  assert.equal(sent.transport, 'chat_api');

  const got = context.AST.Messaging.chat.getMessage({
    body: {
      messageName: 'spaces/abc/messages/1'
    }
  });
  assert.equal(got.data.item.name, 'spaces/abc/messages/1');

  const listed = context.AST.Messaging.chat.listMessages({
    body: {
      space: 'spaces/abc',
      pageSize: 20
    }
  });
  assert.equal(listed.data.items.length, 1);
  assert.equal(listed.data.nextPageToken, 'tok');

  assert.equal(calls.length, 3);
  calls.forEach(call => {
    assert.equal(call.options.headers.Authorization, 'Bearer oauth-token-123');
  });
});

test('chat read operations stay on chat_api when non-chat transports are configured', () => {
  const calls = [];
  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token-xyz'
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/1', messages: [] }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T000/B000/XXX'
  });

  const got = context.AST.Messaging.chat.getMessage({
    body: {
      messageName: 'spaces/abc/messages/1'
    }
  });

  assert.equal(got.status, 'ok');
  assert.equal(got.transport, 'chat_api');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer oauth-token-xyz');
});

test('chat send without explicit transport keeps chat_api intent when body.space is provided', () => {
  const calls = [];
  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token-abc'
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/new' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T000/B000/XXX',
    MESSAGING_TEAMS_WEBHOOK_URL: 'https://contoso.webhook.office.com/webhookb2/xxx'
  });

  const sent = context.AST.Messaging.chat.send({
    body: {
      space: 'spaces/abc',
      message: { text: 'hello chat api' }
    }
  });

  assert.equal(sent.status, 'ok');
  assert.equal(sent.transport, 'chat_api');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.includes('chat.googleapis.com/v1/spaces/abc/messages'), true);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer oauth-token-abc');
});

test('chat send without explicit transport infers slack_api from channel hint', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        calls.push({ url, options });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, ts: '1710000000.000001' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_SLACK_BOT_TOKEN: 'xoxb-token-123'
  });

  const sent = context.AST.Messaging.chat.send({
    body: {
      channel: 'C123',
      message: { text: 'hello slack api' }
    }
  });

  assert.equal(sent.status, 'ok');
  assert.equal(sent.transport, 'slack_api');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://slack.com/api/chat.postMessage');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer xoxb-token-123');
});

test('chat send without explicit transport rejects ambiguous provider hints', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Messaging.chat.send({
      body: {
        space: 'spaces/abc',
        channel: 'C123',
        message: { text: 'ambiguous payload' }
      }
    }),
    /Ambiguous chat payload/
  );
});

test('chat send without explicit transport rejects unknown webhook hosts', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Messaging.chat.send({
      body: {
        webhookUrl: 'https://evil.example/path/hooks.slack.com/services/T/B/X',
        message: { text: 'hello' }
      }
    }),
    /Unable to infer chat transport/
  );
});

test('chat send without explicit transport infers slack_webhook from trusted webhook host', () => {
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

  const sent = context.AST.Messaging.chat.send({
    body: {
      webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXX',
      message: { text: 'hello' }
    }
  });

  assert.equal(sent.status, 'ok');
  assert.equal(sent.transport, 'slack_webhook');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://hooks.slack.com/services/T000/B000/XXX');
});
