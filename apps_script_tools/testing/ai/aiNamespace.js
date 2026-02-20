AI_NAMESPACE_TESTS = [
  {
    description: 'AST.AI should expose public helper methods',
    test: () => {
      if (!AST || !AST.AI) {
        throw new Error('AST.AI is not available');
      }

      const requiredMethods = [
        'run',
        'text',
        'structured',
        'tools',
        'image',
        'providers',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig'
      ];
      requiredMethods.forEach(method => {
        if (typeof AST.AI[method] !== 'function') {
          throw new Error(`AST.AI.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.AI.providers() should list all supported providers',
    test: () => {
      const providers = AST.AI.providers();
      const expected = ['openai', 'gemini', 'vertex_gemini', 'openrouter', 'perplexity'];

      if (JSON.stringify(providers) !== JSON.stringify(expected)) {
        throw new Error(`Expected providers ${JSON.stringify(expected)}, but got ${JSON.stringify(providers)}`);
      }
    }
  },
  {
    description: 'AST.AI.capabilities(vertex_gemini) should report imageGeneration=false',
    test: () => {
      const capabilities = AST.AI.capabilities('vertex_gemini');

      if (capabilities.imageGeneration !== false) {
        throw new Error(`Expected imageGeneration=false, but got ${JSON.stringify(capabilities)}`);
      }
    }
  }
];
