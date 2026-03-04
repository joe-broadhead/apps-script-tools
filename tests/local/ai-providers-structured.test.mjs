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

test('astRunOpenAi parses structured output', () => {
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

  const output = context.astRunOpenAi(structuredRequest('openai'), {
    provider: 'openai',
    apiKey: 'key',
    model: 'gpt-4.1-mini'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'openai' }));
});

test('astRunGemini parses structured output', () => {
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

  const output = context.astRunGemini(structuredRequest('gemini'), {
    provider: 'gemini',
    apiKey: 'key',
    model: 'gemini-2.0-flash'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'gemini' }));
});

test('astRunVertexGemini parses structured output', () => {
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

  const output = context.astRunVertexGemini(structuredRequest('vertex_gemini'), {
    provider: 'vertex_gemini',
    projectId: 'proj',
    location: 'us-central1',
    model: 'gemini-2.0-flash',
    oauthToken: 'oauth'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'vertex' }));
});

test('astRunOpenRouter parses structured output', () => {
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

  const output = context.astRunOpenRouter(structuredRequest('openrouter'), {
    provider: 'openrouter',
    apiKey: 'key',
    model: 'openrouter/model'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'openrouter' }));
});

test('astRunOpenAi and astRunOpenRouter produce equivalent structured parsing for same envelope', () => {
  const completionEnvelope = {
    id: 'shared_1',
    created: 1700000000,
    model: 'shared/model',
    choices: [{
      finish_reason: 'stop',
      message: { content: '{"ok":true,"shared":true}' }
    }],
    usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }
  };

  const openAiContext = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse(completionEnvelope)
    }
  });
  loadAiScripts(openAiContext);

  const openRouterContext = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse(completionEnvelope)
    }
  });
  loadAiScripts(openRouterContext);

  const openAiOut = openAiContext.astRunOpenAi(structuredRequest('openai'), {
    provider: 'openai',
    apiKey: 'key',
    model: 'shared/model'
  });

  const openRouterOut = openRouterContext.astRunOpenRouter(
    structuredRequest('openrouter'),
    {
      provider: 'openrouter',
      apiKey: 'key',
      model: 'shared/model'
    }
  );

  assert.equal(
    JSON.stringify(openAiOut.output.json),
    JSON.stringify(openRouterOut.output.json)
  );
  assert.equal(openAiOut.output.text, openRouterOut.output.text);
  assert.equal(openAiOut.finishReason, openRouterOut.finishReason);
  assert.equal(openAiOut.usage.totalTokens, openRouterOut.usage.totalTokens);
});

test('astRunPerplexity parses structured output', () => {
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

  const output = context.astRunPerplexity(structuredRequest('perplexity'), {
    provider: 'perplexity',
    apiKey: 'key',
    model: 'sonar-pro'
  });

  assert.equal(JSON.stringify(output.output.json), JSON.stringify({ ok: true, source: 'perplexity' }));
});
