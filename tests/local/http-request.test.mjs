import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadHttpScripts } from './http-helpers.mjs';

test('AST_HTTP.request returns normalized success envelope', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true }),
        getAllHeaders: () => ({ etag: 'abc' })
      })
    }
  });

  loadHttpScripts(context, { includeAst: true });

  const out = context.AST.Http.request({
    url: 'https://example.com/ok',
    method: 'get'
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.output.statusCode, 200);
  assert.equal(out.output.json.ok, true);
  assert.equal(out.source.method, 'GET');
});

test('AST_HTTP.request maps 404 to AstHttpNotFoundError', () => {
  let calls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        calls += 1;
        return {
          getResponseCode: () => 404,
          getContentText: () => JSON.stringify({ message: 'missing' }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadHttpScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Http.request({
      url: 'https://example.com/missing',
      method: 'get',
      options: { retries: 3 }
    }),
    error => error && error.name === 'AstHttpNotFoundError'
  );

  assert.equal(calls, 1);
});

test('AST_HTTP.request retries transient status and succeeds', () => {
  let calls = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        calls += 1;
        if (calls === 1) {
          return {
            getResponseCode: () => 503,
            getContentText: () => JSON.stringify({ message: 'retry' }),
            getAllHeaders: () => ({})
          };
        }

        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true }),
          getAllHeaders: () => ({})
        };
      }
    }
  });

  loadHttpScripts(context, { includeAst: true });

  const out = context.AST.Http.request({
    url: 'https://example.com/retry',
    method: 'get',
    options: {
      retries: 2,
      timeoutMs: 10000
    }
  });

  assert.equal(calls, 2);
  assert.equal(out.output.statusCode, 200);
  assert.equal(out.output.json.ok, true);
  assert.equal(out.usage.attempts >= 2, true);
});

test('AST_HTTP.requestBatch returns mixed result statuses', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: url => ({
        getResponseCode: () => (String(url).includes('/ok') ? 200 : 404),
        getContentText: () => (String(url).includes('/ok') ? '{"ok":true}' : '{"ok":false}'),
        getAllHeaders: () => ({})
      })
    }
  });

  loadHttpScripts(context, { includeAst: true });

  const out = context.AST.Http.requestBatch({
    requests: [
      { url: 'https://example.com/ok', method: 'get' },
      { url: 'https://example.com/not-found', method: 'get' }
    ],
    options: {
      continueOnError: true
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.usage.total, 2);
  assert.equal(out.usage.success, 1);
  assert.equal(out.usage.failed, 1);
  assert.equal(out.items[0].status, 'ok');
  assert.equal(out.items[1].status, 'error');
  assert.equal(out.items[1].error.name, 'AstHttpNotFoundError');
});
