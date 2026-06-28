import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, createPropertiesServiceMock } from './helpers.mjs';
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

test('chat send auto-idempotency handles circular request metadata safely', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/1' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });

  const metadata = {};
  metadata.self = metadata;

  const request = {
    body: {
      transport: 'webhook',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
      message: { text: 'hello' },
      metadata
    }
  };

  const first = context.AST.Messaging.chat.send(request);
  const second = context.AST.Messaging.chat.send(request);

  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  assert.equal(fetchCalls, 1);
  assert.equal(second.warnings.includes('idempotentReplay=true'), true);
});

test('chat send idempotency replays across simulated executions with script properties', () => {
  const properties = createPropertiesServiceMock();
  const namespace = `msg_idempotency_durable_${Date.now()}`;
  let firstFetchCalls = 0;
  let secondFetchCalls = 0;

  const firstContext = createGasContext({
    PropertiesService: properties.service,
    UrlFetchApp: {
      fetch: () => {
        firstFetchCalls += 1;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/1' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });
  loadMessagingScripts(firstContext, { includeAst: true });
  firstContext.AST.Messaging.configure({
    MESSAGING_IDEMPOTENCY_BACKEND: 'script_properties',
    MESSAGING_IDEMPOTENCY_NAMESPACE: namespace,
    MESSAGING_IDEMPOTENCY_TTL_SEC: '900'
  });

  const request = {
    body: {
      transport: 'webhook',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
      message: { text: 'hello durable replay' }
    }
  };

  const first = firstContext.AST.Messaging.chat.send(request);
  assert.equal(first.status, 'ok');
  assert.equal(firstFetchCalls, 1);

  const secondContext = createGasContext({
    PropertiesService: properties.service,
    UrlFetchApp: {
      fetch: () => {
        secondFetchCalls += 1;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/2' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });
  loadMessagingScripts(secondContext, { includeAst: true });
  secondContext.AST.Messaging.configure({
    MESSAGING_IDEMPOTENCY_BACKEND: 'script_properties',
    MESSAGING_IDEMPOTENCY_NAMESPACE: namespace,
    MESSAGING_IDEMPOTENCY_TTL_SEC: '900'
  });

  const second = secondContext.AST.Messaging.chat.send(request);
  assert.equal(second.status, 'ok');
  assert.equal(secondFetchCalls, 0);
  assert.equal(second.data.response.name, 'spaces/abc/messages/1');
  assert.equal(second.warnings.includes('idempotentReplay=true'), true);
});

test('chat send reports idempotency write failure without failing completed send', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
        getProperties: () => ({})
      })
    },
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ name: 'spaces/abc/messages/write-failed' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context, { includeAst: true });
  context.AST.Messaging.configure({
    MESSAGING_IDEMPOTENCY_BACKEND: 'script_properties',
    MESSAGING_IDEMPOTENCY_NAMESPACE: 'msg_idempotency_readonly'
  });

  const response = context.AST.Messaging.chat.send({
    body: {
      transport: 'webhook',
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
      message: { text: 'delivered despite idempotency write failure' }
    }
  });

  assert.equal(response.status, 'ok');
  assert.equal(fetchCalls, 1);
  assert.equal(response.data.response.name, 'spaces/abc/messages/write-failed');
  assert.equal(response.warnings.includes('idempotencyWriteFailed=true'), true);
});
