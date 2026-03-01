RAG_NAMESPACE_TESTS = [
  {
    description: 'AST.RAG should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.RAG, 'AST.RAG is not available');

      const requiredMethods = [
        'configure',
        'getConfig',
        'clearConfig',
        'buildIndex',
        'syncIndex',
        'search',
        'previewSources',
        'answer',
        'rerank',
        'rewriteQuery',
        'decomposeQuestion',
        'inspectIndex',
        'buildRetrievalCacheKey',
        'putRetrievalPayload',
        'getRetrievalPayload',
        'deleteRetrievalPayload',
        'embeddingProviders',
        'embeddingCapabilities',
        'registerEmbeddingProvider',
        'unregisterEmbeddingProvider',
        'registerReranker',
        'unregisterReranker',
        'rerankers'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.RAG[method], 'function', `AST.RAG.${method} is not available`);
      });

      t.ok(
        AST.RAG.IndexManager && typeof AST.RAG.IndexManager.create === 'function',
        'AST.RAG.IndexManager.create is not available'
      );
      t.ok(
        AST.RAG.Citations && typeof AST.RAG.Citations.normalizeInline === 'function',
        'AST.RAG.Citations.normalizeInline is not available'
      );
      t.ok(
        AST.RAG.Fallback && typeof AST.RAG.Fallback.fromCitations === 'function',
        'AST.RAG.Fallback.fromCitations is not available'
      );
    })
  },
  {
    description: 'AST.RAG.embeddingProviders() should include built-in providers',
    test: () => astTestRunWithAssertions(t => {
      const providers = AST.RAG.embeddingProviders();
      const expected = ['gemini', 'openai', 'openrouter', 'perplexity', 'vertex_gemini'];
      t.deepEqual(providers, expected, `Expected providers ${JSON.stringify(expected)}, got ${JSON.stringify(providers)}`);

      const rerankers = AST.RAG.rerankers();
      t.deepEqual(rerankers, ['heuristic'], `Expected rerankers [\"heuristic\"], got ${JSON.stringify(rerankers)}`);
    })
  },
  {
    description: 'AST.RAG should allow custom embedding provider registration',
    test: () => astTestRunWithAssertions(t => {
      AST.RAG.registerEmbeddingProvider('test_embed_provider', {
        capabilities: () => ({
          batch: true,
          maxBatchSize: 2,
          dimensions: 2
        }),
        validateConfig: () => {},
        embed: request => ({
          vectors: request.texts.map(() => [1, 0]),
          usage: {
            inputTokens: request.texts.length,
            totalTokens: request.texts.length
          },
          raw: {}
        })
      });

      const providers = AST.RAG.embeddingProviders();
      t.ok(providers.indexOf('test_embed_provider') !== -1, 'Custom provider was not registered');

      const out = astRagEmbedTexts({
        provider: 'test_embed_provider',
        model: 'mock-model',
        texts: ['a', 'b'],
        auth: {}
      });

      t.ok(out && Array.isArray(out.vectors) && out.vectors.length === 2, 'Custom embedding provider did not return expected vectors');

      AST.RAG.unregisterEmbeddingProvider('test_embed_provider');
    })
  }
];
