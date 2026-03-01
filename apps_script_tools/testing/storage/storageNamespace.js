STORAGE_NAMESPACE_TESTS = [
  {
    description: 'AST.Storage should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Storage, 'AST.Storage is not available');

      const requiredMethods = [
        'run',
        'list',
        'head',
        'read',
        'write',
        'delete',
        'exists',
        'copy',
        'move',
        'signedUrl',
        'multipartWrite',
        'walk',
        'copyPrefix',
        'deletePrefix',
        'sync',
        'providers',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.Storage[method], 'function', `AST.Storage.${method} is not available`);
      });
    })
  },
  {
    description: 'AST.Storage.providers() should list all supported storage providers',
    test: () => astTestRunWithAssertions(t => {
      const providers = AST.Storage.providers();
      const expected = ['gcs', 's3', 'dbfs'];
      t.deepEqual(providers, expected, `Expected providers ${JSON.stringify(expected)}, got ${JSON.stringify(providers)}`);
    })
  },
  {
    description: 'AST.Storage.capabilities(gcs) should report advanced storage support',
    test: () => astTestRunWithAssertions(t => {
      const capabilities = AST.Storage.capabilities('gcs');

      ['list', 'head', 'read', 'write', 'delete', 'exists', 'copy', 'move', 'signed_url', 'multipart_write', 'walk', 'copy_prefix', 'delete_prefix', 'sync'].forEach(key => {
        t.equal(capabilities[key], true, `Expected gcs capability ${key}=true, got ${JSON.stringify(capabilities)}`);
      });
    })
  }
];
