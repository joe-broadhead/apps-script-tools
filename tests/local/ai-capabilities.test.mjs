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

test('astGetAiCapabilities reports capability matrix values', () => {
  const context = createGasContext();
  loadAiScripts(context);

  const capabilities = context.astGetAiCapabilities('vertex_gemini');
  assert.equal(capabilities.text, true);
  assert.equal(capabilities.imageGeneration, false);
});

test('runAiRequest throws AstAiCapabilityError for unsupported image generation', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.runAiRequest({
      provider: 'vertex_gemini',
      operation: 'image',
      model: 'gemini-2.0-flash',
      input: 'draw chart',
      auth: {
        projectId: 'p',
        location: 'us-central1',
        oauthToken: 'oauth'
      }
    }),
    /does not support 'image'/
  );
});

test('runAiRequest includeRaw=true includes provider raw payload', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        id: 'resp_raw',
        choices: [{
          finish_reason: 'stop',
          message: {
            content: 'ok'
          }
        }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      })
    }
  });

  loadAiScripts(context);

  const output = context.runAiRequest({
    provider: 'openai',
    operation: 'text',
    model: 'gpt-4.1-mini',
    input: 'hello',
    auth: {
      apiKey: 'key'
    },
    options: {
      includeRaw: true,
      retries: 0
    }
  });

  assert.equal(output.output.text, 'ok');
  assert.ok(output.raw);
  assert.equal(output.raw.id, 'resp_raw');
});
