import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('chat send retries transient errors and replays idempotent response', () => {
  let fetchCalls = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        if (fetchCalls === 1) {
          return {
            getResponseCode: () => 503,
            getContentText: () => JSON.stringify({ error: 'temporary' }),
            getAllHeaders: () => ({})
          };
        }
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/1' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });

  const request = {
    body: {
      transport: 'webhook',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
      message: { text: 'hello' }
    },
    options: {
      retries: 1
    }
  };

  const first = context.AST.Messaging.chat.send(request);
  const second = context.AST.Messaging.chat.send(request);

  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  assert.equal(fetchCalls, 2);
  assert.equal(Array.isArray(second.warnings), true);
  assert.equal(second.warnings.includes('idempotentReplay=true'), true);
});
