import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';

test('validateAiRequest rejects unsupported providers', () => {
  const context = createGasContext();
  loadAiScripts(context);

  assert.throws(
    () => context.validateAiRequest({ provider: 'unknown', input: 'hello' }),
    /Provider must be one of/
  );
});

test('resolveAiConfig uses request auth first, then script properties', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          OPENAI_API_KEY: 'script-key',
          OPENAI_MODEL: 'script-model'
        })
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.validateAiRequest({
    provider: 'openai',
    input: 'hello',
    model: 'request-model',
    auth: {
      apiKey: 'request-key'
    }
  });

  const resolved = context.resolveAiConfig(normalized);

  assert.equal(resolved.apiKey, 'request-key');
  assert.equal(resolved.model, 'request-model');
});

test('AST exposes AI surface and helper methods', () => {
  const context = createGasContext();
  loadAiScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.AI.run, 'function');
  assert.equal(typeof context.AST.AI.text, 'function');
  assert.equal(typeof context.AST.AI.structured, 'function');
  assert.equal(typeof context.AST.AI.tools, 'function');
  assert.equal(typeof context.AST.AI.image, 'function');
  assert.equal(typeof context.AST.AI.providers, 'function');
  assert.equal(typeof context.AST.AI.capabilities, 'function');

  const providers = context.AST.AI.providers();
  assert.equal(
    JSON.stringify(providers),
    JSON.stringify(['openai', 'gemini', 'vertex_gemini', 'openrouter', 'perplexity'])
  );
});
