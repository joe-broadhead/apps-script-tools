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
    () => context.astMessagingHttpRequest(
      'https://example.com',
      {
        method: 'get',
        headers: {
          'X-Amz-Security-Token': 'aws-session-token'
        }
      },
      { retries: 3, timeoutMs: 100 }
    ),
    error => {
      const serialized = JSON.stringify(error);
      assert.equal(error.name, 'AstMessagingProviderError');
      assert.equal(error.details.classification, 'timeout');
      assert.equal(error.details.headers['X-Amz-Security-Token'], '<redacted>');
      assert.equal(serialized.includes('aws-session-token'), false);
      return true;
    }
  );

  assert.equal(fetchCalls, 1);
});

test('http request redacts provider URLs in error details', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 500,
        getContentText: () => JSON.stringify({
          error: 'failed',
          webhookUrl: 'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
          callback: 'https://example.com/callback?client_secret=s3&mode=ok',
          message: 'provider echoed https:\\/\\/hooks.slack.com\\/services\\/T000\\/B000\\/XXX?client_secret=s3',
          token: 'provider-token'
        }),
        getAllHeaders: () => ({})
      })
    }
  });

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest(
      'https://chat.googleapis.com/v1/spaces/abc/messages?key=x&token=y',
      {
        method: 'post',
        headers: {
          Authorization: 'Bearer secret-token',
          'X-Webhook-Token': 'raw-provider-token',
          'Client-Secret': 'client-secret'
        }
      },
      { retries: 0 }
    ),
    error => {
      assert.equal(error.name, 'AstMessagingProviderError');
      assert.equal(error.details.url, 'https://chat.googleapis.com');
      assert.equal(error.details.headers.Authorization, '<redacted>');
      assert.equal(error.details.headers['X-Webhook-Token'], '<redacted>');
      assert.equal(error.details.headers['Client-Secret'], '<redacted>');
      assert.equal(JSON.stringify(error.details).includes('spaces/abc'), false);
      assert.equal(error.details.responseText.includes('webhookUrl'), true);
      assert.equal(error.details.responseText.includes('/services/T000'), false);
      assert.equal(error.details.responseText.includes('client_secret=s3'), false);
      assert.equal(error.details.responseText.includes('provider-token'), false);
      assert.equal(JSON.stringify(error.details).includes('secret-token'), false);
      assert.equal(JSON.stringify(error.details).includes('raw-provider-token'), false);
      assert.equal(JSON.stringify(error.details).includes('client-secret'), false);
      assert.equal(JSON.stringify(error.details).includes('token=y'), false);
      return true;
    }
  );
});

test('http request wraps native fetch exceptions without leaking webhook URLs', () => {
  const webhookUrl = 'https://hooks.slack.com/services/T000/B000/XXX?token=secret';
  const context = createGasContext({
    UrlFetchApp: {
      fetch: url => {
        throw new Error(`Request failed for ${url}: DNS failure token=provider-token Authorization: Basic basic-token json {"token":"json-token","client_secret":"json-secret"}`);
      }
    }
  });

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest(
      webhookUrl,
      {
        method: 'post',
        headers: {
          Authorization: 'Bearer secret-token',
          'X-Webhook-Token': 'raw-provider-token',
          'Client-Secret': 'client-secret'
        }
      },
      { retries: 0 }
    ),
    error => {
      const serialized = JSON.stringify(error);
      assert.equal(error.name, 'AstMessagingProviderError');
      assert.equal(error.message, 'Messaging provider request failed');
      assert.equal(error.details.classification, 'transport');
      assert.equal(error.details.url, 'https://hooks.slack.com');
      assert.equal(error.details.headers.Authorization, '<redacted>');
      assert.equal(error.details.headers['X-Webhook-Token'], '<redacted>');
      assert.equal(error.details.headers['Client-Secret'], '<redacted>');
      assert.equal(error.details.message.includes('/services/T000'), false);
      assert.equal(error.details.message.includes('token=secret'), false);
      assert.equal(error.details.message.includes('provider-token'), false);
      assert.equal(error.details.message.includes('basic-token'), false);
      assert.equal(error.details.message.includes('json-token'), false);
      assert.equal(error.details.message.includes('json-secret'), false);
      assert.equal(error.cause.message.includes('/services/T000'), false);
      assert.equal(serialized.includes('/services/T000'), false);
      assert.equal(serialized.includes('secret-token'), false);
      assert.equal(serialized.includes('raw-provider-token'), false);
      assert.equal(serialized.includes('client-secret'), false);
      return true;
    }
  );
});

test('http request redacts plain-text token and client secret echoes', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 500,
        getContentText: () => 'provider token=provider-token client_secret=s3 Authorization: Bearer bearer-token Proxy-Authorization: Basic basic-token Authorization: "Bearer quoted-token" json {"token":"json-token","client_secret":"json-secret","authorization":"Basic json-basic"}',
        getAllHeaders: () => ({})
      })
    }
  });

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest(
      'https://example.com/resource',
      { method: 'post' },
      { retries: 0 }
    ),
    error => {
      assert.equal(error.name, 'AstMessagingProviderError');
      assert.equal(error.details.responseText.includes('provider-token'), false);
      assert.equal(error.details.responseText.includes('client_secret=s3'), false);
      assert.equal(error.details.responseText.includes('bearer-token'), false);
      assert.equal(error.details.responseText.includes('basic-token'), false);
      assert.equal(error.details.responseText.includes('quoted-token'), false);
      assert.equal(error.details.responseText.includes('json-token'), false);
      assert.equal(error.details.responseText.includes('json-secret'), false);
      assert.equal(error.details.responseText.includes('json-basic'), false);
      assert.equal(
        error.details.responseText,
        'provider token=[REDACTED] client_secret=[REDACTED] Authorization: Bearer [REDACTED] Proxy-Authorization: Basic [REDACTED] Authorization: "Bearer [REDACTED]" json {"token":"[REDACTED]","client_secret":"[REDACTED]","authorization":"[REDACTED]"}'
      );
      return true;
    }
  );
});

test('http request redacts escaped webhook URLs in plain-text response bodies', () => {
  const requestUrl = 'https://example.com/webhook/secret?token=x';
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 500,
        getContentText: () => 'proxy echoed Cannot POST /webhook/secret?token=x',
        getAllHeaders: () => ({})
      })
    }
  });

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest(
      requestUrl,
      { method: 'post' },
      { retries: 0 }
    ),
    error => {
      assert.equal(error.name, 'AstMessagingProviderError');
      assert.equal(error.details.responseText.includes('/webhook/secret'), false);
      assert.equal(error.details.responseText.includes('token=x'), false);
      assert.equal(error.details.responseText, 'proxy echoed Cannot POST https://example.com');
      return true;
    }
  );
});

test('http request redacts labeled relative webhook path echoes', () => {
  const requestUrl = 'https://example.com/webhook/secret?token=x';
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 500,
        getContentText: () => 'proxy echoed path:/webhook/secret?token=x',
        getAllHeaders: () => ({})
      })
    }
  });

  loadMessagingScripts(context);

  assert.throws(
    () => context.astMessagingHttpRequest(
      requestUrl,
      { method: 'post' },
      { retries: 0 }
    ),
    error => {
      assert.equal(error.name, 'AstMessagingProviderError');
      assert.equal(error.details.responseText.includes('/webhook/secret'), false);
      assert.equal(error.details.responseText.includes('token=x'), false);
      assert.equal(error.details.responseText, 'proxy echoed path:https://example.com');
      return true;
    }
  );
});
