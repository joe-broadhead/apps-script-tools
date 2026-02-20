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

test('resolveAiConfig falls back to getProperty when getProperties does not include key', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({}),
        getProperty: key => {
          if (key === 'OPENROUTER_API_KEY') return 'script-openrouter-key';
          if (key === 'OPENROUTER_MODEL') return 'openai/gpt-4o-mini';
          return null;
        }
      })
    }
  });

  loadAiScripts(context);

  const normalized = context.validateAiRequest({
    provider: 'openrouter',
    input: 'hello'
  });

  const resolved = context.resolveAiConfig(normalized);

  assert.equal(resolved.apiKey, 'script-openrouter-key');
  assert.equal(resolved.model, 'openai/gpt-4o-mini');
});

test('AST.AI.configure enables runtime config fallback for provider auth/model', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({})
      })
    }
  });

  loadAiScripts(context, { includeAst: true });

  context.AST.AI.clearConfig();
  context.AST.AI.configure({
    OPENROUTER_API_KEY: 'runtime-openrouter-key',
    OPENROUTER_MODEL: 'openai/gpt-4o-mini'
  });

  const normalized = context.validateAiRequest({
    provider: 'openrouter',
    input: 'hello'
  });

  const resolved = context.resolveAiConfig(normalized);

  assert.equal(resolved.apiKey, 'runtime-openrouter-key');
  assert.equal(resolved.model, 'openai/gpt-4o-mini');

  const cfg = context.AST.AI.getConfig();
  assert.equal(cfg.OPENROUTER_API_KEY, 'runtime-openrouter-key');
  context.AST.AI.clearConfig();
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
  assert.equal(typeof context.AST.AI.configure, 'function');
  assert.equal(typeof context.AST.AI.getConfig, 'function');
  assert.equal(typeof context.AST.AI.clearConfig, 'function');

  const providers = context.AST.AI.providers();
  assert.equal(
    JSON.stringify(providers),
    JSON.stringify(['openai', 'gemini', 'vertex_gemini', 'openrouter', 'perplexity'])
  );
});
