import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { createGasContext } from './helpers.mjs';
import { loadRagScripts } from './rag-helpers.mjs';

function createResponse({ status = 200, body = '{}' } = {}) {
  return {
    getResponseCode: () => status,
    getContentText: () => body
  };
}

function createServiceAccountJson() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  return JSON.stringify({
    client_email: 'svc-rag@example.iam.gserviceaccount.com',
    private_key: privateKeyPem,
    token_uri: 'https://oauth2.googleapis.com/token'
  });
}

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

test('RAG vertex_gemini config supports service-account auth mode with token cache', () => {
  const serviceAccountJson = createServiceAccountJson();
  let exchangeCalls = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        exchangeCalls += 1;
        return createResponse({
          status: 200,
          body: JSON.stringify({
            access_token: 'rag-sa-token',
            expires_in: 3600
          })
        });
      }
    },
    ScriptApp: {
      getOAuthToken: () => {
        throw new Error('OAuth path should not run when service-account JSON is configured');
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-rag',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_EMBED_MODEL: 'text-embedding-005',
          VERTEX_SERVICE_ACCOUNT_JSON: serviceAccountJson
        }),
        getProperty: () => null
      })
    }
  });

  loadRagScripts(context);

  const configA = context.astRagResolveProviderConfig({
    provider: 'vertex_gemini',
    mode: 'embedding',
    auth: {}
  });
  const configB = context.astRagResolveProviderConfig({
    provider: 'vertex_gemini',
    mode: 'embedding',
    auth: {}
  });

  assert.equal(configA.oauthToken, 'rag-sa-token');
  assert.equal(configA.authMode, 'auto');
  assert.equal(configB.oauthToken, 'rag-sa-token');
  assert.equal(exchangeCalls, 1);
});

test('RAG vertex_gemini oauth mode ignores service-account json', () => {
  const serviceAccountJson = createServiceAccountJson();
  let exchangeCalls = 0;
  let oauthCalls = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        exchangeCalls += 1;
        return createResponse({
          status: 200,
          body: JSON.stringify({
            access_token: 'rag-sa-token',
            expires_in: 3600
          })
        });
      }
    },
    ScriptApp: {
      getOAuthToken: () => {
        oauthCalls += 1;
        return 'rag-oauth-token';
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-rag',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_EMBED_MODEL: 'text-embedding-005',
          VERTEX_SERVICE_ACCOUNT_JSON: serviceAccountJson
        }),
        getProperty: () => null
      })
    }
  });

  loadRagScripts(context);

  const config = context.astRagResolveProviderConfig({
    provider: 'vertex_gemini',
    mode: 'embedding',
    auth: {
      authMode: 'oauth'
    }
  });

  assert.equal(config.oauthToken, 'rag-oauth-token');
  assert.equal(config.authMode, 'oauth');
  assert.equal(exchangeCalls, 0);
  assert.equal(oauthCalls, 1);
});

test('RAG vertex_gemini service_account mode requires serviceAccountJson', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          VERTEX_PROJECT_ID: 'project-rag',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_EMBED_MODEL: 'text-embedding-005'
        }),
        getProperty: () => null
      })
    }
  });

  loadRagScripts(context);

  assert.throws(
    () => context.astRagResolveProviderConfig({
      provider: 'vertex_gemini',
      mode: 'embedding',
      auth: {
        authMode: 'service_account'
      }
    }),
    error => {
      assert.equal(error.name, 'AstRagAuthError');
      assert.match(error.message, /serviceAccountJson/);
      return true;
    }
  );
});

test('astRagHttpRequest does not retry deterministic 4xx and preserves status details', () => {
  let callCount = 0;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        callCount += 1;
        return createResponse({
          status: 400,
          body: JSON.stringify({
            error: {
              message: 'bad request'
            }
          })
        });
      }
    }
  });

  loadRagScripts(context);

  assert.throws(
    () => context.astRagHttpRequest({
      url: 'https://example.com/rag',
      method: 'post',
      payload: { ok: false },
      retries: 2
    }),
    error => {
      assert.equal(error.name, 'AstRagError');
      assert.equal(error.details.statusCode, 400);
      return true;
    }
  );

  assert.equal(callCount, 1);
});

test('astRagValidateSearchRequest normalizes hybrid retrieval contract', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const normalized = context.astRagValidateSearchRequest({
    indexFileId: 'idx_1',
    query: 'project risks',
    retrieval: {
      mode: 'hybrid',
      topK: 5,
      minScore: 0.15,
      vectorWeight: 2,
      lexicalWeight: 1,
      rerank: {
        enabled: true,
        topN: 3
      },
      filters: {
        fileIds: ['f1'],
        mimeTypes: ['text/plain']
      }
    }
  });

  assert.equal(normalized.retrieval.mode, 'hybrid');
  assert.equal(normalized.retrieval.topK, 5);
  assert.equal(normalized.retrieval.minScore, 0.15);
  assert.equal(normalized.retrieval.vectorWeight, 2);
  assert.equal(normalized.retrieval.lexicalWeight, 1);
  assert.equal(normalized.retrieval.rerank.enabled, true);
  assert.equal(normalized.retrieval.rerank.topN, 3);
  assert.equal(JSON.stringify(normalized.retrieval.filters.fileIds), JSON.stringify(['f1']));
  assert.equal(JSON.stringify(normalized.retrieval.filters.mimeTypes), JSON.stringify(['text/plain']));
});

test('astRagValidateSearchRequest rejects invalid retrieval mode and weights', () => {
  const context = createGasContext();
  loadRagScripts(context);

  assert.throws(
    () => context.astRagValidateSearchRequest({
      indexFileId: 'idx_1',
      query: 'project risks',
      retrieval: {
        mode: 'lexical_only'
      }
    }),
    /must be one of: vector, hybrid/
  );

  assert.throws(
    () => context.astRagValidateSearchRequest({
      indexFileId: 'idx_1',
      query: 'project risks',
      retrieval: {
        mode: 'hybrid',
        vectorWeight: 0,
        lexicalWeight: 0
      }
    }),
    /requires vectorWeight \+ lexicalWeight > 0/
  );
});

test('astRagValidateAnswerRequest normalizes retrieval access and enforceAccessControl', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const normalized = context.astRagValidateAnswerRequest({
    indexFileId: 'idx_1',
    question: 'What are project risks?',
    retrieval: {
      topK: 6,
      access: {
        allowedFileIds: ['allowed_1'],
        deniedFileIds: ['denied_1'],
        allowedMimeTypes: ['text/plain']
      }
    },
    options: {
      enforceAccessControl: true
    },
    generation: {
      provider: 'openai'
    }
  });

  assert.equal(normalized.retrieval.access.allowedFileIds[0], 'allowed_1');
  assert.equal(normalized.retrieval.access.deniedFileIds[0], 'denied_1');
  assert.equal(normalized.retrieval.access.allowedMimeTypes[0], 'text/plain');
  assert.equal(normalized.options.enforceAccessControl, true);
  assert.equal(normalized.retrieval.enforceAccessControl, true);
});

test('astRagValidateSearchRequest rejects overlapping allow/deny access constraints', () => {
  const context = createGasContext();
  loadRagScripts(context);

  assert.throws(
    () => context.astRagValidateSearchRequest({
      indexFileId: 'idx_1',
      query: 'project risks',
      retrieval: {
        access: {
          allowedFileIds: ['file_1'],
          deniedFileIds: ['file_1']
        }
      }
    }),
    error => {
      assert.equal(error.name, 'AstRagAccessError');
      return true;
    }
  );
});
