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
    provider: 'openai',
    operation,
    messages: [{ role: 'user', content: 'hello' }],
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

test('runOpenAi normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'resp_1',
        created: 1700000000,
        model: 'gpt-4.1-mini',
        choices: [{
          finish_reason: 'stop',
          message: { content: 'hello from openai' }
        }],
        usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
      })
    }
  });

  loadAiScripts(context);

  const output = context.runOpenAi(baseRequest('text'), {
    provider: 'openai',
    apiKey: 'key',
    model: 'gpt-4.1-mini'
  });

  assert.equal(output.output.text, 'hello from openai');
  assert.equal(output.usage.totalTokens, 7);
  assert.equal(output.provider, 'openai');
});

test('runGemini normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        candidates: [{
          finishReason: 'STOP',
          content: {
            parts: [{ text: 'hello from gemini' }]
          }
        }],
        usageMetadata: {
          promptTokenCount: 2,
          candidatesTokenCount: 5,
          totalTokenCount: 7
        }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'gemini'
  });

  const output = context.runGemini(request, {
    provider: 'gemini',
    apiKey: 'key',
    model: 'gemini-2.0-flash'
  });

  assert.equal(output.output.text, 'hello from gemini');
  assert.equal(output.usage.totalTokens, 7);
  assert.equal(output.provider, 'gemini');
});

test('runGemini forwards system messages as systemInstruction when request.system is omitted', () => {
  let capturedPayload = null;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        capturedPayload = JSON.parse(options.payload);
        return asResponse({
          candidates: [{
            finishReason: 'STOP',
            content: {
              parts: [{ text: 'ok' }]
            }
          }],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2
          }
        });
      }
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'gemini',
    messages: [
      { role: 'system', content: 'Follow strict JSON policy.' },
      { role: 'user', content: 'hello' }
    ]
  });

  context.runGemini(request, {
    provider: 'gemini',
    apiKey: 'key',
    model: 'gemini-2.0-flash'
  });

  assert.equal(capturedPayload.systemInstruction.parts[0].text, 'Follow strict JSON policy.');
  assert.equal(capturedPayload.contents.length, 1);
});

test('runVertexGemini normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        candidates: [{
          finishReason: 'STOP',
          content: {
            parts: [{ text: 'hello from vertex' }]
          }
        }],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 6,
          totalTokenCount: 10
        }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'vertex_gemini'
  });

  const output = context.runVertexGemini(request, {
    provider: 'vertex_gemini',
    projectId: 'p',
    location: 'us-central1',
    model: 'gemini-2.0-flash',
    oauthToken: 'oauth'
  });

  assert.equal(output.output.text, 'hello from vertex');
  assert.equal(output.usage.totalTokens, 10);
  assert.equal(output.provider, 'vertex_gemini');
});

test('runVertexGemini forwards system messages as systemInstruction when request.system is omitted', () => {
  let capturedPayload = null;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        capturedPayload = JSON.parse(options.payload);
        return asResponse({
          candidates: [{
            finishReason: 'STOP',
            content: {
              parts: [{ text: 'ok' }]
            }
          }],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2
          }
        });
      }
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'vertex_gemini',
    messages: [
      { role: 'system', content: 'Use terse responses.' },
      { role: 'user', content: 'hello' }
    ]
  });

  context.runVertexGemini(request, {
    provider: 'vertex_gemini',
    projectId: 'p',
    location: 'us-central1',
    model: 'gemini-2.0-flash',
    oauthToken: 'oauth'
  });

  assert.equal(capturedPayload.systemInstruction.parts[0].text, 'Use terse responses.');
  assert.equal(capturedPayload.contents.length, 1);
});

test('runOpenRouter normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'or_1',
        model: 'openrouter/model',
        choices: [{
          finish_reason: 'stop',
          message: { content: 'hello from openrouter' }
        }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'openrouter'
  });

  const output = context.runOpenRouter(request, {
    provider: 'openrouter',
    apiKey: 'key',
    model: 'openrouter/model'
  });

  assert.equal(output.output.text, 'hello from openrouter');
  assert.equal(output.usage.totalTokens, 3);
  assert.equal(output.provider, 'openrouter');
});

test('runPerplexity normalizes text output', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'px_1',
        model: 'sonar-pro',
        choices: [{
          finish_reason: 'stop',
          message: { content: 'hello from perplexity' }
        }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }
      })
    }
  });

  loadAiScripts(context);

  const request = Object.assign(baseRequest('text'), {
    provider: 'perplexity'
  });

  const output = context.runPerplexity(request, {
    provider: 'perplexity',
    apiKey: 'key',
    model: 'sonar-pro'
  });

  assert.equal(output.output.text, 'hello from perplexity');
  assert.equal(output.usage.totalTokens, 5);
  assert.equal(output.provider, 'perplexity');
});
