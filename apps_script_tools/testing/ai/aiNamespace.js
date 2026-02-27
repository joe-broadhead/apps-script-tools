AI_NAMESPACE_TESTS = [
  {
    description: 'AST.AI should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.AI, 'AST.AI is not available');

      const requiredMethods = [
        'run',
        'text',
        'structured',
        'tools',
        'image',
        'stream',
        'providers',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig'
      ];
      requiredMethods.forEach(method => {
        t.equal(typeof AST.AI[method], 'function', `AST.AI.${method} is not available`);
      });

      t.ok(
        AST.AI.OutputRepair && typeof AST.AI.OutputRepair.continueIfTruncated === 'function',
        'AST.AI.OutputRepair.continueIfTruncated is not available'
      );
    })
  },
  {
    description: 'AST.AI.providers() should list all supported providers',
    test: () => astTestRunWithAssertions(t => {
      const providers = AST.AI.providers();
      const expected = ['openai', 'gemini', 'vertex_gemini', 'openrouter', 'perplexity'];
      t.deepEqual(providers, expected, `Expected providers ${JSON.stringify(expected)}, but got ${JSON.stringify(providers)}`);
    })
  },
  {
    description: 'AST.AI.capabilities(vertex_gemini) should report imageGeneration=false',
    test: () => astTestRunWithAssertions(t => {
      const capabilities = AST.AI.capabilities('vertex_gemini');
      t.equal(capabilities.imageGeneration, false, `Expected imageGeneration=false, but got ${JSON.stringify(capabilities)}`);
    })
  }
];
