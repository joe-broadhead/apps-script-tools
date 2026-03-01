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
