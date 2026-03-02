import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

function asResponse(json, status = 200) {
  return {
    getResponseCode: () => status,
    getContentText: () => JSON.stringify(json)
  };
}

function baseRequest(operation = 'text') {
  return {
    provider: 'databricks',
    operation,
    messages: [{ role: 'user', content: 'hello from databricks' }],
    options: {
      temperature: null,
      maxOutputTokens: null,
      timeoutMs: 45000,
      retries: 0,
      includeRaw: false,
      maxToolRounds: 3
    },
    providerOptions: {}
  };
}

test('astRunDatabricks uses explicit endpointUrl and normalizes text output', () => {
  let capturedUrl = null;
  let capturedOptions = null;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return asResponse({
          id: 'dbx_1',
          model: 'databricks-claude-opus-4-6',
          choices: [{
            finish_reason: 'stop',
            message: { content: 'hello from databricks' }
          }],
          usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 }
        });
      }
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    providerOptions: {
      endpointUrl: 'https://workspace.cloud.databricks.com/serving-endpoints/databricks-claude-opus-4-6/invocations',
      top_p: 0.9,
      ignoredOption: true
    }
  });

  const output = context.astRunDatabricks(request, {
    provider: 'databricks',
    token: 'db-token',
    endpointUrl: 'https://workspace.cloud.databricks.com/serving-endpoints/unused/invocations',
    model: 'databricks-claude-opus-4-6'
  });

  const payload = JSON.parse(capturedOptions.payload);

  assert.equal(
    capturedUrl,
    'https://workspace.cloud.databricks.com/serving-endpoints/databricks-claude-opus-4-6/invocations'
  );
  assert.equal(capturedOptions.headers.Authorization, 'Bearer db-token');
  assert.equal(payload.model, 'databricks-claude-opus-4-6');
  assert.equal(payload.top_p, 0.9);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'ignoredOption'), false);
  assert.equal(output.output.text, 'hello from databricks');
  assert.equal(output.usage.totalTokens, 12);
  assert.equal(output.provider, 'databricks');
});

test('astRunDatabricks composes endpoint URL from host + servingEndpoint', () => {
  let capturedUrl = null;
  let capturedPayload = null;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        capturedUrl = url;
        capturedPayload = JSON.parse(options.payload);
        return asResponse({
          id: 'dbx_compose',
          choices: [{
            finish_reason: 'stop',
            message: { content: 'ok' }
          }]
        });
      }
    }
  });

  loadAiScripts(context);

  context.astRunDatabricks(baseRequest('text'), {
    provider: 'databricks',
    token: 'db-token',
    host: 'https://workspace.cloud.databricks.com/',
    servingEndpoint: 'databricks-claude-opus-4-6',
    model: null
  });

  assert.equal(
    capturedUrl,
    'https://workspace.cloud.databricks.com/serving-endpoints/databricks-claude-opus-4-6/invocations'
  );
  assert.equal(capturedPayload.model, 'databricks-claude-opus-4-6');
});

test('astRunDatabricks structured operation sends response_format and parses JSON output', () => {
  let capturedPayload = null;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        capturedPayload = JSON.parse(options.payload);
        return asResponse({
          id: 'dbx_structured',
          choices: [{
            finish_reason: 'stop',
            message: { content: '{"ok":true,"source":"databricks"}' }
          }]
        });
      }
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('structured'), {
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        source: { type: 'string' }
      },
      required: ['ok', 'source'],
      additionalProperties: false
    }
  });

  const output = context.astRunDatabricks(request, {
    provider: 'databricks',
    token: 'db-token',
    endpointUrl: 'https://workspace.cloud.databricks.com/serving-endpoints/databricks-claude-opus-4-6/invocations',
    model: 'databricks-claude-opus-4-6'
  });

  assert.equal(capturedPayload.response_format.type, 'json_schema');
  assert.equal(capturedPayload.response_format.json_schema.strict, true);
  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'databricks' }));
});

test('astRunDatabricks tools operation returns normalized tool calls', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'dbx_tools',
        choices: [{
          finish_reason: 'tool_calls',
          message: {
            content: '',
            tool_calls: [{
              id: 'tool_call_1',
              function: {
                name: 'lookup_order',
                arguments: '{"order_id":"123"}'
              }
            }]
          }
        }]
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('tools'), {
    tools: [{
      name: 'lookup_order',
      description: 'lookup order',
      inputSchema: {
        type: 'object',
        properties: {
          order_id: { type: 'string' }
        },
        required: ['order_id']
      }
    }]
  });

  const output = context.astRunDatabricks(request, {
    provider: 'databricks',
    token: 'db-token',
    endpointUrl: 'https://workspace.cloud.databricks.com/serving-endpoints/databricks-claude-opus-4-6/invocations',
    model: 'databricks-claude-opus-4-6'
  });

  assert.equal(output.output.toolCalls.length, 1);
  assert.equal(output.output.toolCalls[0].name, 'lookup_order');
  assert.equal(JSON.stringify(output.output.toolCalls[0].arguments), JSON.stringify({ order_id: '123' }));
});

test('astRunDatabricks maps 401/403 provider responses to AstAiAuthError', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({ error: { message: 'unauthorized' } }, 401)
    }
  });

  loadAiScripts(context);

  assert.throws(
    () => context.astRunDatabricks(baseRequest('text'), {
      provider: 'databricks',
      token: 'db-token',
      endpointUrl: 'https://workspace.cloud.databricks.com/serving-endpoints/databricks-claude-opus-4-6/invocations',
      model: 'databricks-claude-opus-4-6'
    }),
    error => {
      assert.equal(error.name, 'AstAiAuthError');
      assert.equal(error.details.statusCode, 401);
      assert.match(error.details.endpointUrl, /serving-endpoints/);
      return true;
    }
  );
});

test('astRunDatabricks validates endpointUrl scheme and shape', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.astRunDatabricks(baseRequest('text'), {
      provider: 'databricks',
      token: 'db-token',
      endpointUrl: 'http://workspace.cloud.databricks.com/serving-endpoints/demo/invocations',
      model: 'databricks-claude-opus-4-6'
    }),
    /endpointUrl must use 'https:\/\//
  );
});
