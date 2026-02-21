RAG_NAMESPACE_TESTS = [
  {
    description: 'AST.RAG should expose public helper methods',
    test: () => {
      if (!AST || !AST.RAG) {
        throw new Error('AST.RAG is not available');
      }

      const requiredMethods = [
        'configure',
        'getConfig',
        'clearConfig',
        'buildIndex',
        'syncIndex',
        'search',
        'answer',
        'inspectIndex',
        'embeddingProviders',
        'embeddingCapabilities',
        'registerEmbeddingProvider',
        'unregisterEmbeddingProvider'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.RAG[method] !== 'function') {
          throw new Error(`AST.RAG.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.RAG.embeddingProviders() should include built-in providers',
    test: () => {
      const providers = AST.RAG.embeddingProviders();
      const expected = ['gemini', 'openai', 'openrouter', 'perplexity', 'vertex_gemini'];

      if (JSON.stringify(providers) !== JSON.stringify(expected)) {
        throw new Error(`Expected providers ${JSON.stringify(expected)}, got ${JSON.stringify(providers)}`);
      }
    }
  },
  {
    description: 'AST.RAG should allow custom embedding provider registration',
    test: () => {
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
      if (providers.indexOf('test_embed_provider') === -1) {
        throw new Error('Custom provider was not registered');
      }

      const out = astRagEmbedTexts({
        provider: 'test_embed_provider',
        model: 'mock-model',
        texts: ['a', 'b'],
        auth: {}
      });

      if (!out || !Array.isArray(out.vectors) || out.vectors.length !== 2) {
        throw new Error('Custom embedding provider did not return expected vectors');
      }

      AST.RAG.unregisterEmbeddingProvider('test_embed_provider');
    }
  }
];
