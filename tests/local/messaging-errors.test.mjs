import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('http request maps auth/not-found/rate-limit/provider errors', () => {
  const responses = [401, 404, 429, 500];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => responses.shift(),
        getContentText: () => JSON.stringify({ error: 'failed' }),
        getAllHeaders: () => ({})
      })
    }
  });

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest('https://example.com', { method: 'get' }, { retries: 0 }),
    error => error.name === 'AstMessagingAuthError'
  );

  assert.throws(
    () => context.astMessagingHttpRequest('https://example.com', { method: 'get' }, { retries: 0 }),
    error => error.name === 'AstMessagingNotFoundError'
  );

  assert.throws(
    () => context.astMessagingHttpRequest('https://example.com', { method: 'get' }, { retries: 0 }),
    error => error.name === 'AstMessagingRateLimitError'
  );

  assert.throws(
    () => context.astMessagingHttpRequest('https://example.com', { method: 'get' }, { retries: 0 }),
    error => error.name === 'AstMessagingProviderError'
  );
});

test('http request does not retry deterministic non-transient status codes', () => {
  let fetchCalls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        return {
          getResponseCode: () => 404,
          getContentText: () => JSON.stringify({ error: 'missing' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest('https://example.com/resource', { method: 'get' }, { retries: 3 }),
    error => error.name === 'AstMessagingNotFoundError'
  );

  assert.equal(fetchCalls, 1);
});

test('http request enforces timeoutMs budget across retries', () => {
  let fetchCalls = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        fetchCalls += 1;
        return {
          getResponseCode: () => 503,
          getContentText: () => JSON.stringify({ error: 'temporary' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  let nowTick = 0;
  const nowValues = [0, 0, 120, 120];
  context.Date.now = () => {
    const value = nowValues[Math.min(nowTick, nowValues.length - 1)];
    nowTick += 1;
    return value;
  };

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest('https://example.com', { method: 'get' }, { retries: 3, timeoutMs: 100 }),
    error => {
      assert.equal(error.name, 'AstMessagingProviderError');
      assert.equal(error.details.classification, 'timeout');
      return true;
    }
  );

  assert.equal(fetchCalls, 1);
});
