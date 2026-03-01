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

function createServiceAccountJson({
  clientEmail = 'svc-rag@example.iam.gserviceaccount.com',
  tokenUri = 'https://oauth2.googleapis.com/token'
} = {}) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  return JSON.stringify({
    client_email: clientEmail,
    private_key: privateKeyPem,
    token_uri: tokenUri
  });
}

test('AST exposes RAG namespace and public methods', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.RAG.configure, 'function');
  assert.equal(typeof context.AST.RAG.buildIndex, 'function');
  assert.equal(typeof context.AST.RAG.syncIndex, 'function');
  assert.equal(typeof context.AST.RAG.search, 'function');
  assert.equal(typeof context.AST.RAG.previewSources, 'function');
  assert.equal(typeof context.AST.RAG.answer, 'function');
  assert.equal(typeof context.AST.RAG.rerank, 'function');
  assert.equal(typeof context.AST.RAG.rewriteQuery, 'function');
  assert.equal(typeof context.AST.RAG.decomposeQuestion, 'function');
  assert.equal(typeof context.AST.RAG.inspectIndex, 'function');
  assert.equal(typeof context.AST.RAG.buildRetrievalCacheKey, 'function');
  assert.equal(typeof context.AST.RAG.putRetrievalPayload, 'function');
  assert.equal(typeof context.AST.RAG.getRetrievalPayload, 'function');
  assert.equal(typeof context.AST.RAG.deleteRetrievalPayload, 'function');
  assert.equal(typeof context.AST.RAG.embeddingProviders, 'function');
  assert.equal(typeof context.AST.RAG.embeddingCapabilities, 'function');
  assert.equal(typeof context.AST.RAG.registerEmbeddingProvider, 'function');
  assert.equal(typeof context.AST.RAG.unregisterEmbeddingProvider, 'function');
  assert.equal(typeof context.AST.RAG.registerReranker, 'function');
  assert.equal(typeof context.AST.RAG.unregisterReranker, 'function');
  assert.equal(typeof context.AST.RAG.rerankers, 'function');
  assert.equal(typeof context.AST.RAG.IndexManager, 'object');
  assert.equal(typeof context.AST.RAG.IndexManager.create, 'function');
  assert.equal(typeof context.AST.RAG.Citations, 'object');
  assert.equal(typeof context.AST.RAG.Citations.normalizeInline, 'function');
  assert.equal(typeof context.AST.RAG.Citations.extractInlineIds, 'function');
  assert.equal(typeof context.AST.RAG.Citations.filterForAnswer, 'function');
  assert.equal(typeof context.AST.RAG.Citations.toUrl, 'function');
  assert.equal(typeof context.AST.RAG.Fallback, 'object');
  assert.equal(typeof context.AST.RAG.Fallback.fromCitations, 'function');

  assert.equal(
    JSON.stringify(context.AST.RAG.embeddingProviders()),
    JSON.stringify(['gemini', 'openai', 'openrouter', 'perplexity', 'vertex_gemini'])
  );
  assert.equal(
    JSON.stringify(context.AST.RAG.rerankers()),
    JSON.stringify(['heuristic'])
  );
});

test('RAG citation helpers normalize/filter/link citations deterministically', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  const normalizedText = context.AST.RAG.Citations.normalizeInline(
    'Project summary [ s01 ] and [S2]. Also references S02.'
  );
  assert.equal(normalizedText, 'Project summary [S1] and [S2]. Also references S2.');

  const inlineIds = context.AST.RAG.Citations.extractInlineIds(
    'Signals S1 S3 and S1 should dedupe'
  );
  assert.equal(JSON.stringify(inlineIds), JSON.stringify(['S1', 'S3']));

  const filtered = context.AST.RAG.Citations.filterForAnswer([
    {
      citationId: 'S2',
      chunkId: 'chunk_2',
      fileId: 'file_doc',
      fileName: 'Project Doc',
      mimeType: 'application/vnd.google-apps.document',
      score: 0.81,
      snippet: 'Second score'
    },
    {
      citationId: 'S1',
      chunkId: 'chunk_1',
      fileId: 'file_doc',
      fileName: 'Project Doc',
      mimeType: 'application/vnd.google-apps.document',
      score: 0.91,
      snippet: 'Top score'
    }
  ], { maxItems: 1 });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].citationId, 'S1');

  const url = context.AST.RAG.Citations.toUrl(filtered[0]);
  assert.equal(url, 'https://docs.google.com/document/d/file_doc/edit');
});

test('RAG fallback helper returns citation-grounded summary/facts only', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  const citations = [
    {
      citationId: 'S1',
      chunkId: 'chunk_1',
      fileId: 'f_1',
      fileName: 'overview.txt',
      mimeType: 'text/plain',
      score: 0.9,
      snippet: 'The project modernizes the store experience for customers and team members.'
    },
    {
      citationId: 'S2',
      chunkId: 'chunk_2',
      fileId: 'f_2',
      fileName: 'timeline.txt',
      mimeType: 'text/plain',
      score: 0.8,
      snippet: 'Execution occurs in preparation, build, and reopening phases.'
    }
  ];

  const summary = context.AST.RAG.Fallback.fromCitations({
    citations,
    intent: 'summary'
  });
  assert.equal(summary.status, 'ok');
  assert.equal(summary.citations.length >= 1, true);

  const facts = context.AST.RAG.Fallback.fromCitations({
    citations,
    intent: 'facts',
    factCount: 2
  });
  assert.equal(facts.status, 'ok');
  assert.equal(facts.answer.includes('[S1]') || facts.answer.includes('[S2]'), true);

  const factsWithSkippedSnippet = context.AST.RAG.Fallback.fromCitations({
    citations: [
      {
        citationId: 'S1',
        chunkId: 'chunk_1',
        fileId: 'f_1',
        fileName: 'overview.txt',
        mimeType: 'text/plain',
        score: 0.95,
        snippet: '   '
      },
      {
        citationId: 'S2',
        chunkId: 'chunk_2',
        fileId: 'f_2',
        fileName: 'timeline.txt',
        mimeType: 'text/plain',
        score: 0.9,
        snippet: 'Execution occurs in preparation, build, and reopening phases.'
      }
    ],
    intent: 'facts',
    factCount: 1
  });
  assert.equal(factsWithSkippedSnippet.status, 'ok');
  assert.equal(factsWithSkippedSnippet.answer.includes('[S2]'), true);
  assert.equal(
    factsWithSkippedSnippet.citations.map(item => item.citationId).join(','),
    'S2'
  );

  const insufficient = context.AST.RAG.Fallback.fromCitations({
    citations: [],
    insufficientEvidenceMessage: 'No context'
  });
  assert.equal(insufficient.status, 'insufficient_context');
  assert.equal(insufficient.answer, 'No context');
});

test('validateAnswerRequest normalizes recovery and fallback contracts', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const normalized = context.astRagValidateAnswerRequest({
    indexFileId: 'idx_1',
    question: 'What changed?',
    recovery: {
      enabled: true,
      topKBoost: 3,
      minScoreFloor: -0.2,
      maxAttempts: 2
    },
    fallback: {
      onRetrievalError: true,
      onRetrievalEmpty: true,
      intent: 'facts',
      factCount: 4
    },
    generation: {
      style: 'bullets',
      instructions: 'Keep answers action-oriented.',
      forbiddenPhrases: ['As an AI language model']
    },
    options: {
      maxRetrievalMs: 2500,
      onRetrievalTimeout: 'fallback'
    }
  });

  assert.equal(normalized.retrieval.recovery.enabled, true);
  assert.equal(normalized.retrieval.recovery.topKBoost, 3);
  assert.equal(normalized.retrieval.recovery.maxAttempts, 2);
  assert.equal(normalized.fallback.onRetrievalError, true);
  assert.equal(normalized.fallback.onRetrievalEmpty, true);
  assert.equal(normalized.fallback.intent, 'facts');
  assert.equal(normalized.fallback.factCount, 4);
  assert.equal(normalized.generation.style, 'bullets');
  assert.equal(normalized.generation.instructions, 'Keep answers action-oriented.');
  assert.equal(normalized.generation.forbiddenPhrases[0], 'As an AI language model');
  assert.equal(normalized.options.maxRetrievalMs, 2500);
  assert.equal(normalized.options.onRetrievalTimeout, 'fallback');
});

test('validateAnswerRequest rejects invalid timeout policy and generation style', () => {
  const context = createGasContext();
  loadRagScripts(context);

  assert.throws(
    () => context.astRagValidateAnswerRequest({
      indexFileId: 'idx_1',
      question: 'What changed?',
      options: {
        onRetrievalTimeout: 'skip'
      }
    }),
    /onRetrievalTimeout must be one of/
  );

  assert.throws(
    () => context.astRagValidateAnswerRequest({
      indexFileId: 'idx_1',
      question: 'What changed?',
      generation: {
        style: 'poem'
      }
    }),
    /generation.style must be one of/
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

test('RAG config snapshot memoizes script properties and invalidates on clearConfig', () => {
  let getPropertiesCalls = 0;
  const scriptState = {
    OPENAI_API_KEY: 'script-key-v1',
    OPENAI_EMBED_MODEL: 'script-embed-v1'
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => {
          getPropertiesCalls += 1;
          return { ...scriptState };
        },
        getProperty: key => (Object.prototype.hasOwnProperty.call(scriptState, key) ? scriptState[key] : null)
      })
    }
  });

  loadRagScripts(context, { includeAst: true });
  context.AST.RAG.clearConfig();

  const first = context.astRagResolveProviderConfig({
    provider: 'openai',
    mode: 'embedding',
    model: null,
    auth: {}
  });

  const second = context.astRagResolveProviderConfig({
    provider: 'openai',
    mode: 'embedding',
    model: null,
    auth: {}
  });

  assert.equal(first.apiKey, 'script-key-v1');
  assert.equal(second.apiKey, 'script-key-v1');
  assert.equal(getPropertiesCalls, 1);

  scriptState.OPENAI_API_KEY = 'script-key-v2';
  const stillCached = context.astRagResolveProviderConfig({
    provider: 'openai',
    mode: 'embedding',
    model: null,
    auth: {}
  });
  assert.equal(stillCached.apiKey, 'script-key-v1');
  assert.equal(getPropertiesCalls, 1);

  context.AST.RAG.clearConfig();
  const refreshed = context.astRagResolveProviderConfig({
    provider: 'openai',
    mode: 'embedding',
    model: null,
    auth: {}
  });
  assert.equal(refreshed.apiKey, 'script-key-v2');
  assert.equal(getPropertiesCalls, 2);
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

test('RAG custom rerankers can be registered and used via AST.RAG.rerank', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  context.AST.RAG.registerReranker('mock_reverse', {
    rerank: request => request.candidates.map((candidate, idx, list) => ({
      chunkId: candidate.chunkId,
      score: list.length - idx
    }))
  });

  const rerankers = context.AST.RAG.rerankers();
  assert.equal(rerankers.includes('mock_reverse'), true);

  const out = context.AST.RAG.rerank({
    query: 'launch checklist',
    provider: 'mock_reverse',
    results: [
      { chunkId: 'c1', text: 'A', score: 0.9 },
      { chunkId: 'c2', text: 'B', score: 0.8 }
    ]
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.rerank.provider, 'mock_reverse');
  assert.equal(out.results[0].chunkId, 'c1');
  assert.equal(typeof out.results[0].rerankScoreNormalized, 'number');
  assert.equal(context.AST.RAG.unregisterReranker('mock_reverse'), true);
});

test('RAG rewriteQuery returns deterministic provenance for rewrite policy', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  const out = context.AST.RAG.rewriteQuery({
    query: '  Please tell me about customer onboarding and retention   ',
    rewrite: {
      policy: 'keywords'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.query, 'Please tell me about customer onboarding and retention');
  assert.equal(out.rewriteApplied, true);
  assert.match(out.rewrittenQuery, /customer/);
  assert.match(out.rewrittenQuery, /retention/);
  assert.equal(Array.isArray(out.provenance.retrievalQueries), true);
});

test('RAG decomposeQuestion returns deterministic subqueries and provenance', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  const out = context.AST.RAG.decomposeQuestion({
    question: 'What changed in revenue and margin after the pricing update?',
    decompose: {
      policy: 'clauses',
      maxSubqueries: 3
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(Array.isArray(out.subqueries), true);
  assert.equal(out.subqueries.length >= 1, true);
  assert.equal(out.provenance.decomposePolicy, 'clauses');
});

test('RAG rewrite/decompose helpers validate policy inputs', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.RAG.rewriteQuery({
      query: 'revenue details',
      rewrite: { policy: 'unsupported_policy' }
    }),
    /rewriteQuery.queryTransform.rewrite.policy/
  );

  assert.throws(
    () => context.AST.RAG.decomposeQuestion({
      question: 'revenue and margin',
      decompose: { policy: 'unsupported_policy' }
    }),
    /decomposeQuestion.queryTransform.decompose.policy/
  );
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

test('RAG vertex_gemini invalidates service-account token cache when private key rotates', () => {
  const clientEmail = 'svc-rag-rotate@example.iam.gserviceaccount.com';
  const serviceAccountJsonA = createServiceAccountJson({ clientEmail });
  const serviceAccountJsonB = createServiceAccountJson({ clientEmail });
  let exchangeCalls = 0;
  let activeServiceAccount = serviceAccountJsonA;

  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        exchangeCalls += 1;
        return createResponse({
          status: 200,
          body: JSON.stringify({
            access_token: `rag-sa-token-${exchangeCalls}`,
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
          VERTEX_SERVICE_ACCOUNT_JSON: activeServiceAccount
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
  activeServiceAccount = serviceAccountJsonB;
  const configC = context.astRagResolveProviderConfig({
    provider: 'vertex_gemini',
    mode: 'embedding',
    auth: {}
  });

  assert.equal(configA.oauthToken, 'rag-sa-token-1');
  assert.equal(configB.oauthToken, 'rag-sa-token-1');
  assert.equal(configC.oauthToken, 'rag-sa-token-2');
  assert.equal(exchangeCalls, 2);
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

test('RAG vertex_gemini rejects service-account token_uri outside allowlist', () => {
  const serviceAccountJson = createServiceAccountJson({
    tokenUri: 'https://example.com/token'
  });

  const context = createGasContext({
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
      assert.match(error.message, /token_uri is not allowed/i);
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
      url: 'https://example.com/rag?token=secret-token&mode=vector',
      method: 'post',
      payload: { ok: false },
      retries: 2
    }),
    error => {
      assert.equal(error.name, 'AstRagError');
      assert.equal(error.details.statusCode, 400);
      assert.equal(
        error.details.url,
        'https://example.com/rag?token=[redacted]&mode=vector'
      );
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
        topN: 3,
        provider: 'heuristic'
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
  assert.equal(normalized.retrieval.rerank.provider, 'heuristic');
  assert.equal(JSON.stringify(normalized.retrieval.filters.fileIds), JSON.stringify(['f1']));
  assert.equal(JSON.stringify(normalized.retrieval.filters.mimeTypes), JSON.stringify(['text/plain']));
});

test('astRagValidateSearchRequest accepts lexical retrieval mode', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const normalized = context.astRagValidateSearchRequest({
    indexFileId: 'idx_lexical',
    query: 'project risks',
    retrieval: {
      mode: 'lexical',
      topK: 4,
      minScore: 0.05
    }
  });

  assert.equal(normalized.retrieval.mode, 'lexical');
  assert.equal(normalized.retrieval.topK, 4);
  assert.equal(normalized.retrieval.minScore, 0.05);
});

test('astRagValidateSearchRequest normalizes lexical prefilter topN', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const normalized = context.astRagValidateSearchRequest({
    indexFileId: 'idx_prefilter',
    query: 'project risks',
    retrieval: {
      mode: 'vector',
      lexicalPrefilterTopN: 12
    }
  });

  assert.equal(normalized.retrieval.lexicalPrefilterTopN, 12);
});

test('astRagValidateSearchRequest defaults lexical prefilter topN to zero when omitted', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const omitted = context.astRagValidateSearchRequest({
    indexFileId: 'idx_prefilter_omitted',
    query: 'project risks',
    retrieval: {
      mode: 'vector'
    }
  });

  const explicit = context.astRagValidateSearchRequest({
    indexFileId: 'idx_prefilter_explicit',
    query: 'project risks',
    retrieval: {
      mode: 'vector',
      lexicalPrefilterTopN: 0
    }
  });

  assert.equal(omitted.retrieval.lexicalPrefilterTopN, 0);
  assert.equal(explicit.retrieval.lexicalPrefilterTopN, 0);
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
    /must be one of: vector, hybrid, lexical/
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

test('astRagValidateAnswerRequest normalizes generation context budget controls', () => {
  const context = createGasContext();
  loadRagScripts(context);

  const normalized = context.astRagValidateAnswerRequest({
    indexFileId: 'idx_budget',
    question: 'What are project risks?',
    generation: {
      provider: 'openai',
      maxContextChars: 2400,
      maxContextTokensApprox: 600
    }
  });

  assert.equal(normalized.generation.maxContextChars, 2400);
  assert.equal(normalized.generation.maxContextTokensApprox, 600);
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

test('buildRetrievalCacheKey is deterministic for equivalent retrieval requests', () => {
  const context = createGasContext();
  loadRagScripts(context, { includeAst: true });

  const keyA = context.AST.RAG.buildRetrievalCacheKey({
    indexFileId: 'idx_det',
    query: 'project risks',
    retrieval: {
      mode: 'hybrid',
      topK: 5,
      minScore: 0.2,
      vectorWeight: 0.7,
      lexicalWeight: 0.3
    }
  });

  const keyB = context.AST.RAG.buildRetrievalCacheKey({
    indexFileId: 'idx_det',
    query: 'project risks',
    retrieval: {
      lexicalWeight: 0.3,
      vectorWeight: 0.7,
      minScore: 0.2,
      topK: 5,
      mode: 'hybrid'
    }
  });

  const keyC = context.AST.RAG.buildRetrievalCacheKey({
    indexFileId: 'idx_det',
    query: 'project timeline',
    retrieval: {
      mode: 'hybrid',
      topK: 5,
      minScore: 0.2,
      vectorWeight: 0.7,
      lexicalWeight: 0.3
    }
  });

  const keyD = context.AST.RAG.buildRetrievalCacheKey({
    indexFileId: 'idx_det',
    query: 'project risks',
    retrieval: {
      mode: 'hybrid',
      topK: 5,
      minScore: 0.2,
      vectorWeight: 0.7,
      lexicalWeight: 0.3,
      filters: {
        fileIds: ['file_only']
      }
    }
  });

  assert.equal(keyA, keyB);
  assert.notEqual(keyA, keyC);
  assert.notEqual(keyA, keyD);
});
