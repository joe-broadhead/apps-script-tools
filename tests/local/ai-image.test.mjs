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

function imageRequest(provider) {
  return {
    provider,
    operation: 'image',
    messages: [{ role: 'user', content: 'draw a mountain' }],
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

test('astRunOpenAi returns normalized image payload', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        created: 1700000100,
        data: [{
          b64_json: 'aW1hZ2VEYXRh',
          mime_type: 'image/png'
        }]
      })
    }
  });

  loadAiScripts(context);

  const output = context.astRunOpenAi(imageRequest('openai'), {
    provider: 'openai',
    apiKey: 'key',
    model: 'gpt-image-1'
  });

  assert.equal(output.output.images.length, 1);
  assert.equal(output.output.images[0].mimeType, 'image/png');
});

test('astRunGemini returns normalized image payload', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        candidates: [{
          finishReason: 'STOP',
          content: {
            parts: [{
              inlineData: {
                mimeType: 'image/png',
                data: 'Z2VtaW5pSW1hZ2U='
              }
            }]
          }
        }]
      })
    }
  });

  loadAiScripts(context);

  const output = context.astRunGemini(imageRequest('gemini'), {
    provider: 'gemini',
    apiKey: 'key',
    model: 'gemini-2.0-flash-preview-image-generation'
  });

  assert.equal(output.output.images.length, 1);
  assert.equal(output.output.images[0].base64, 'Z2VtaW5pSW1hZ2U=');
});

test('astRunOpenRouter and astRunPerplexity image parsing handles generic payload', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        data: [{
          b64_json: 'b3BlbnJvdXRlckltYWdl',
          mime_type: 'image/png'
        }]
      })
    }
  });

  loadAiScripts(context);

  const openRouter = context.astRunOpenRouter(imageRequest('openrouter'), {
    provider: 'openrouter',
    apiKey: 'key',
    model: 'openrouter/model'
  });

  const perplexity = context.astRunPerplexity(imageRequest('perplexity'), {
    provider: 'perplexity',
    apiKey: 'key',
    model: 'sonar-image'
  });

  assert.equal(openRouter.output.images.length, 1);
  assert.equal(perplexity.output.images.length, 1);
});

test('astRunOpenAi throws parse error when image payload is missing', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => asResponse({
        data: []
      })
    }
  });

  loadAiScripts(context);

  assert.throws(
    () => context.astRunOpenAi(imageRequest('openai'), {
      provider: 'openai',
      apiKey: 'key',
      model: 'gpt-image-1'
    }),
    /image response did not include image payloads/
  );
});
