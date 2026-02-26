import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadAiScripts } from './ai-helpers.mjs';
import { loadRagScripts } from './rag-helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

function createScriptPropertiesStore(seed = {}) {
  const values = { ...seed };
  return {
    handle: {
      getProperty: key => (Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null),
      getProperties: () => ({ ...values })
    }
  };
}

test('AI config resolver can resolve secret:// references via AST.Secrets', () => {
  const store = createScriptPropertiesStore({
    OPENAI_API_KEY: 'secret://script_properties/OPENAI_API_KEY_RAW',
    OPENAI_API_KEY_RAW: 'openai-key-from-secret',
    OPENAI_MODEL: 'gpt-4o-mini'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadAiScripts(context, { includeSecrets: true });

  const config = context.astResolveAiConfig({
    provider: 'openai',
    auth: {}
  });

  assert.equal(config.apiKey, 'openai-key-from-secret');
  assert.equal(config.model, 'gpt-4o-mini');
});

test('RAG provider config resolver can resolve secret:// references via AST.Secrets', () => {
  const store = createScriptPropertiesStore({
    OPENAI_API_KEY: 'secret://script_properties/RAG_OPENAI_KEY_RAW',
    RAG_OPENAI_KEY_RAW: 'rag-openai-key',
    OPENAI_MODEL: 'gpt-4o-mini'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadRagScripts(context, {
    includeUtilities: false,
    includeAi: false,
    includeSecrets: true
  });

  const config = context.astRagResolveProviderConfig({
    provider: 'openai',
    mode: 'generation',
    auth: {}
  });

  assert.equal(config.apiKey, 'rag-openai-key');
  assert.equal(config.model, 'gpt-4o-mini');
});

test('Storage config resolver can resolve secret:// references via AST.Secrets', () => {
  const store = createScriptPropertiesStore({
    S3_ACCESS_KEY_ID: 'AKIA_TEST',
    S3_SECRET_ACCESS_KEY: 'secret://script_properties/S3_SECRET_RAW',
    S3_SECRET_RAW: 's3-secret-value',
    S3_REGION: 'eu-west-1'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadStorageScripts(context, { includeSecrets: true });

  const config = context.astResolveStorageConfig({
    provider: 's3',
    auth: {}
  });

  assert.equal(config.accessKeyId, 'AKIA_TEST');
  assert.equal(config.secretAccessKey, 's3-secret-value');
  assert.equal(config.region, 'eu-west-1');
});
