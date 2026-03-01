HTTP_NAMESPACE_TESTS = [
  {
    description: 'AST.Http should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Http, 'AST.Http is not available');

      const requiredMethods = [
        'request',
        'requestBatch',
        'capabilities',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        t.equal(typeof AST.Http[method], 'function', `AST.Http.${method} is not available`);
      });
    })
  },
  {
    description: 'AST.Http.capabilities should return request transport metadata',
    test: () => astTestRunWithAssertions(t => {
      const capabilities = AST.Http.capabilities();
      t.ok(capabilities && capabilities.request, 'request capabilities are missing');
      t.equal(capabilities.request.retries, true, 'request.retries should be true');
      t.equal(capabilities.request_batch.supported, true, 'request_batch.supported should be true');
    })
  }
];
