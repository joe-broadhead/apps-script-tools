DBT_NAMESPACE_TESTS = [
  {
    description: 'AST.DBT should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.DBT, 'AST.DBT is not available');

      const requiredMethods = [
        'run',
        'loadManifest',
        'loadArtifact',
        'inspectManifest',
        'inspectArtifact',
        'listEntities',
        'search',
        'getEntity',
        'getColumn',
        'lineage',
        'diffEntities',
        'impact',
        'providers',
        'capabilities',
        'validateManifest',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.DBT[method], 'function', `AST.DBT.${method} is not available`);
      });
    })
  },
  {
    description: 'AST.DBT.providers should include drive and storage providers',
    test: () => astTestRunWithAssertions(t => {
      const providers = AST.DBT.providers();
      const expected = ['drive', 'gcs', 's3', 'dbfs'];

      expected.forEach(provider => {
        t.ok(providers.indexOf(provider) !== -1, `Expected provider '${provider}' in AST.DBT.providers()`);
      });
    })
  }
];
