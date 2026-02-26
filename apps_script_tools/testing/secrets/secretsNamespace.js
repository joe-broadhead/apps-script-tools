SECRETS_NAMESPACE_TESTS = [
  {
    description: 'AST.Secrets should expose public helper methods',
    test: () => {
      if (!AST || !AST.Secrets) {
        throw new Error('AST.Secrets is not available');
      }

      const requiredMethods = [
        'run',
        'get',
        'set',
        'delete',
        'providers',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig',
        'resolveValue'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.Secrets[method] !== 'function') {
          throw new Error(`AST.Secrets.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.Secrets.providers should include script_properties and secret_manager',
    test: () => {
      const providers = AST.Secrets.providers();
      const expected = ['script_properties', 'secret_manager'];

      if (JSON.stringify(providers) !== JSON.stringify(expected)) {
        throw new Error(`Expected providers ${JSON.stringify(expected)}, got ${JSON.stringify(providers)}`);
      }
    }
  }
];
