STORAGE_NAMESPACE_TESTS = [
  {
    description: 'AST.Storage should expose public helper methods',
    test: () => {
      if (!AST || !AST.Storage) {
        throw new Error('AST.Storage is not available');
      }

      const requiredMethods = [
        'run',
        'list',
        'head',
        'read',
        'write',
        'delete',
        'providers',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.Storage[method] !== 'function') {
          throw new Error(`AST.Storage.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.Storage.providers() should list all supported storage providers',
    test: () => {
      const providers = AST.Storage.providers();
      const expected = ['gcs', 's3', 'dbfs'];

      if (JSON.stringify(providers) !== JSON.stringify(expected)) {
        throw new Error(`Expected providers ${JSON.stringify(expected)}, got ${JSON.stringify(providers)}`);
      }
    }
  },
  {
    description: 'AST.Storage.capabilities(gcs) should report CRUD support',
    test: () => {
      const capabilities = AST.Storage.capabilities('gcs');

      ['list', 'head', 'read', 'write', 'delete'].forEach(key => {
        if (capabilities[key] !== true) {
          throw new Error(`Expected gcs capability ${key}=true, got ${JSON.stringify(capabilities)}`);
        }
      });
    }
  }
];
