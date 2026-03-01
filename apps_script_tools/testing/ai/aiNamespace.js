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
        'estimateTokens',
        'truncateMessages',
        'renderPromptTemplate',
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
  },
  {
    description: 'AST.AI.renderPromptTemplate should render template variables',
    test: () => astTestRunWithAssertions(t => {
      const out = AST.AI.renderPromptTemplate({
        template: 'Hello {{name}}',
        variables: { name: 'AST' }
      });
      t.equal(out.text, 'Hello AST', `Expected rendered template, got ${JSON.stringify(out)}`);
    })
  },
  {
    description: 'AST.AI.truncateMessages should return bounded message output',
    test: () => astTestRunWithAssertions(t => {
      const out = AST.AI.truncateMessages({
        provider: 'openai',
        messages: [
          { role: 'system', content: 'Always grounded.' },
          { role: 'user', content: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
          { role: 'assistant', content: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
          { role: 'user', content: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' }
        ],
        maxInputTokens: 25,
        strategy: 'tail'
      });

      t.equal(out.status, 'ok', `Expected status ok, got ${JSON.stringify(out)}`);
      t.equal(out.after.inputTokens <= 25, true, `Expected bounded tokens <= 25, got ${JSON.stringify(out.after)}`);
    })
  }
];
