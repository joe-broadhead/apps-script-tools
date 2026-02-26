DBT_NAMESPACE_TESTS = [
  {
    description: 'AST.DBT should expose public helper methods',
    test: () => {
      if (!AST || !AST.DBT) {
        throw new Error('AST.DBT is not available');
      }

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
        if (typeof AST.DBT[method] !== 'function') {
          throw new Error(`AST.DBT.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.DBT.providers should include drive and storage providers',
    test: () => {
      const providers = AST.DBT.providers();
      const expected = ['drive', 'gcs', 's3', 'dbfs'];

      expected.forEach(provider => {
        if (providers.indexOf(provider) === -1) {
          throw new Error(`Expected provider '${provider}' in AST.DBT.providers()`);
        }
      });
    }
  }
];
