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

function structuredRequest(provider) {
  return {
    provider,
    operation: 'structured',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        source: { type: 'string' }
      },
      required: ['ok', 'source']
    },
    messages: [{ role: 'user', content: 'return JSON' }],
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

test('runOpenAi parses structured output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'resp_s_1',
        model: 'gpt-4.1-mini',
        choices: [{
          finish_reason: 'stop',
          message: { content: '{"ok":true,"source":"openai"}' }
        }]
      })
    }
  });

  loadAiScripts(context);

  const output = context.runOpenAi(structuredRequest('openai'), {
    provider: 'openai',
    apiKey: 'key',
    model: 'gpt-4.1-mini'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'openai' }));
});

test('runGemini parses structured output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        candidates: [{
          content: {
            parts: [{ text: '{"ok":true,"source":"gemini"}' }]
          }
        }]
      })
    }
  });

  loadAiScripts(context);

  const output = context.runGemini(structuredRequest('gemini'), {
    provider: 'gemini',
    apiKey: 'key',
    model: 'gemini-2.0-flash'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'gemini' }));
});

test('runVertexGemini parses structured output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        candidates: [{
          content: {
            parts: [{ text: '{"ok":true,"source":"vertex"}' }]
          }
        }]
      })
    }
  });

  loadAiScripts(context);

  const output = context.runVertexGemini(structuredRequest('vertex_gemini'), {
    provider: 'vertex_gemini',
    projectId: 'proj',
    location: 'us-central1',
    model: 'gemini-2.0-flash',
    oauthToken: 'oauth'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'vertex' }));
});

test('runOpenRouter parses structured output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'or_s_1',
        choices: [{
          finish_reason: 'stop',
          message: { content: '{"ok":true,"source":"openrouter"}' }
        }]
      })
    }
  });

  loadAiScripts(context);

  const output = context.runOpenRouter(structuredRequest('openrouter'), {
    provider: 'openrouter',
    apiKey: 'key',
    model: 'openrouter/model'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'openrouter' }));
});

test('runPerplexity parses structured output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'px_s_1',
        choices: [{
          finish_reason: 'stop',
          message: { content: '{"ok":true,"source":"perplexity"}' }
        }]
      })
    }
  });

  loadAiScripts(context);

  const output = context.runPerplexity(structuredRequest('perplexity'), {
    provider: 'perplexity',
    apiKey: 'key',
    model: 'sonar-pro'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'perplexity' }));
});
