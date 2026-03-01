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

test('astHttpResolveConfig honors script properties when runtime/request are unset', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          HTTP_TIMEOUT_MS: '1234',
          HTTP_RETRIES: '7',
          HTTP_USER_AGENT: 'script-agent',
          HTTP_INCLUDE_RAW: 'true',
          HTTP_DEFAULT_HEADERS: '{"x-script":"yes"}'
        })
      })
    }
  });

  loadHttpScripts(context, { includeAst: true });
  const resolved = context.astHttpResolveConfig({});

  assert.equal(resolved.HTTP_TIMEOUT_MS, 1234);
  assert.equal(resolved.HTTP_RETRIES, 7);
  assert.equal(resolved.HTTP_USER_AGENT, 'script-agent');
  assert.equal(resolved.HTTP_INCLUDE_RAW, true);
  assert.equal(resolved.HTTP_DEFAULT_HEADERS['x-script'], 'yes');
});

test('astHttpResolveConfig precedence is request > runtime > script properties', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          HTTP_TIMEOUT_MS: '1111',
          HTTP_RETRIES: '1',
          HTTP_USER_AGENT: 'script-agent',
          HTTP_INCLUDE_RAW: 'false',
          HTTP_DEFAULT_HEADERS: '{"x-script":"yes","x-shared":"script"}'
        })
      })
    }
  });

  loadHttpScripts(context, { includeAst: true });

  context.AST.Http.configure({
    HTTP_TIMEOUT_MS: 2222,
    HTTP_RETRIES: 2,
    HTTP_USER_AGENT: 'runtime-agent',
    HTTP_INCLUDE_RAW: true,
    HTTP_DEFAULT_HEADERS: { 'x-runtime': 'yes', 'x-shared': 'runtime' }
  });

  const resolved = context.astHttpResolveConfig({
    options: {
      timeoutMs: 3333,
      retries: 3,
      userAgent: 'request-agent',
      includeRaw: false,
      defaultHeaders: { 'x-request': 'yes', 'x-shared': 'request' }
    }
  });

  assert.equal(resolved.HTTP_TIMEOUT_MS, 3333);
  assert.equal(resolved.HTTP_RETRIES, 3);
  assert.equal(resolved.HTTP_USER_AGENT, 'request-agent');
  assert.equal(resolved.HTTP_INCLUDE_RAW, false);
  assert.equal(resolved.HTTP_DEFAULT_HEADERS['x-script'], 'yes');
  assert.equal(resolved.HTTP_DEFAULT_HEADERS['x-runtime'], 'yes');
  assert.equal(resolved.HTTP_DEFAULT_HEADERS['x-request'], 'yes');
  assert.equal(resolved.HTTP_DEFAULT_HEADERS['x-shared'], 'request');
});

test('AST_HTTP.request includeRaw=false overrides runtime includeRaw=true', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => '{"ok":true}',
        getAllHeaders: () => ({})
      })
    }
  });

  loadHttpScripts(context, { includeAst: true });

  context.AST.Http.configure({
    HTTP_INCLUDE_RAW: true
  });

  const out = context.AST.Http.request({
    url: 'https://example.com/no-raw',
    method: 'get',
    options: {
      includeRaw: false
    }
  });

  assert.equal(Object.prototype.hasOwnProperty.call(out, 'raw'), false);
});

test('AST_HTTP.request rejects invalid headers type', () => {
  const context = createGasContext();
  loadHttpScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Http.request({
      url: 'https://example.com/invalid-headers',
      method: 'get',
      headers: 'x=1'
    }),
    error => error && error.name === 'AstHttpValidationError'
  );
});

test('AST_HTTP.request rejects invalid options.defaultHeaders type', () => {
  const context = createGasContext();
  loadHttpScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Http.request({
      url: 'https://example.com/invalid-default-headers',
      method: 'get',
      options: {
        defaultHeaders: 'x=1'
      }
    }),
    error => error && error.name === 'AstHttpValidationError'
  );
});
