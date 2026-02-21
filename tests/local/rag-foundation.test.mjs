import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadRagScripts } from './rag-helpers.mjs';

test('AST exposes RAG namespace and public methods', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.RAG.configure, 'function');
  assert.equal(typeof context.AST.RAG.buildIndex, 'function');
  assert.equal(typeof context.AST.RAG.syncIndex, 'function');
  assert.equal(typeof context.AST.RAG.search, 'function');
  assert.equal(typeof context.AST.RAG.answer, 'function');
  assert.equal(typeof context.AST.RAG.inspectIndex, 'function');
  assert.equal(typeof context.AST.RAG.embeddingProviders, 'function');
  assert.equal(typeof context.AST.RAG.embeddingCapabilities, 'function');
  assert.equal(typeof context.AST.RAG.registerEmbeddingProvider, 'function');
  assert.equal(typeof context.AST.RAG.unregisterEmbeddingProvider, 'function');

  assert.equal(
    JSON.stringify(context.AST.RAG.embeddingProviders()),
    JSON.stringify(['gemini', 'openai', 'openrouter', 'perplexity', 'vertex_gemini'])
  );
});

test('RAG embedding config precedence is request > runtime configure > script properties', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          OPENAI_API_KEY: 'script-key',
          OPENAI_EMBED_MODEL: 'script-embed-model'
        }),
        getProperty: () => null
      })
    }
  });
  loadRagScripts(context, { includeAst: true });

  context.AST.RAG.clearConfig();
  context.AST.RAG.configure({
    OPENAI_API_KEY: 'runtime-key',
    OPENAI_EMBED_MODEL: 'runtime-embed-model'
  });

  const requestOverride = context.astRagResolveProviderConfig({
    provider: 'openai',
    mode: 'embedding',
    model: 'request-embed-model',
    auth: { apiKey: 'request-key' }
  });

  assert.equal(requestOverride.apiKey, 'request-key');
  assert.equal(requestOverride.model, 'request-embed-model');

  const runtimeFallback = context.astRagResolveProviderConfig({
    provider: 'openai',
    mode: 'embedding',
    model: null,
    auth: {}
  });

  assert.equal(runtimeFallback.apiKey, 'runtime-key');
  assert.equal(runtimeFallback.model, 'runtime-embed-model');
});

test('RAG custom embedding providers can be registered and used', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.AST.RAG.registerEmbeddingProvider('mock_custom', {
    capabilities: () => ({
      batch: true,
      maxBatchSize: 4,
      dimensions: 3
    }),
    validateConfig: config => {
      if (!config.model) {
        throw new Error('model required');
      }
    },
    embed: request => {
      return {
        vectors: request.texts.map((_, idx) => [idx + 1, 1, 1]),
        usage: {
          inputTokens: request.texts.length,
          totalTokens: request.texts.length
        },
        raw: { ok: true }
      };
    }
  });

  const providers = context.AST.RAG.embeddingProviders();
  assert.equal(providers.includes('mock_custom'), true);

  const capabilities = context.AST.RAG.embeddingCapabilities('mock_custom');
  assert.equal(capabilities.maxBatchSize, 4);

  const embedded = context.astRagEmbedTexts({
    provider: 'mock_custom',
    model: 'mock-model',
    texts: ['one', 'two'],
    auth: {}
  });

  assert.equal(embedded.vectors.length, 2);
  assert.equal(embedded.model, 'mock-model');

  assert.equal(context.AST.RAG.unregisterEmbeddingProvider('mock_custom'), true);
  assert.equal(context.AST.RAG.embeddingProviders().includes('mock_custom'), false);
});

test('RAG embedding rejects unregistered providers with typed capability error', () => {
  const context = createGasContext();
  loadRagScripts(context);

  assert.throws(
    () => context.astRagEmbedTexts({
      provider: 'missing_provider',
      texts: ['hello'],
      auth: {}
    }),
    /Embedding provider is not registered/
  );
});

test('RAG embedding maps unsupported provider/model responses to capability error', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 400,
        getContentText: () => JSON.stringify({
          error: { message: 'model not found' }
        })
      })
    }
  });
  loadRagScripts(context);
  context.astRagRegisterBuiltInEmbeddingProviders();

  assert.throws(
    () => context.astRagEmbedTexts({
      provider: 'openai',
      model: 'does-not-exist',
      texts: ['hello'],
      auth: {
        apiKey: 'test-openai-key'
      }
    }),
    /Embedding provider\/model combination is not supported/
  );
});

test('Gemini embedding uses models/<id> route without encoding path slash', () => {
  let capturedUrl = '';
  let capturedModel = '';

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        capturedUrl = url;
        const payload = JSON.parse(options.payload);
        capturedModel = payload.requests[0].model;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            embeddings: [{ values: [0.1, 0.2, 0.3] }],
            usageMetadata: { promptTokenCount: 3, totalTokenCount: 3 }
          })
        };
      }
    }
  });

  loadRagScripts(context);
  context.astRagRegisterBuiltInEmbeddingProviders();

  const out = context.astRagEmbedTexts({
    provider: 'gemini',
    model: 'models/text-embedding-004',
    texts: ['hello'],
    auth: { apiKey: 'test-gemini-key' }
  });

  assert.match(capturedUrl, /\/v1beta\/models\/text-embedding-004:batchEmbedContents\?/);
  assert.equal(capturedUrl.includes('models%2Ftext-embedding-004'), false);
  assert.equal(capturedModel, 'models/text-embedding-004');
  assert.equal(out.vectors.length, 1);
});
