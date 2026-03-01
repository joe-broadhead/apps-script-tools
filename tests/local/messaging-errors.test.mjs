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
