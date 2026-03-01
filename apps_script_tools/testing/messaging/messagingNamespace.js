MESSAGING_NAMESPACE_TESTS = [
  {
    description: 'AST.Messaging should expose public helper methods',
    test: () => astTestRunWithAssertions(t => {
      t.ok(AST && AST.Messaging, 'AST.Messaging is not available');
      t.equal(typeof AST.Messaging.run, 'function', 'AST.Messaging.run is not available');
      t.equal(typeof AST.Messaging.operations, 'function', 'AST.Messaging.operations is not available');
      t.equal(typeof AST.Messaging.capabilities, 'function', 'AST.Messaging.capabilities is not available');
      t.equal(typeof AST.Messaging.configure, 'function', 'AST.Messaging.configure is not available');
      t.equal(typeof AST.Messaging.getConfig, 'function', 'AST.Messaging.getConfig is not available');
      t.equal(typeof AST.Messaging.clearConfig, 'function', 'AST.Messaging.clearConfig is not available');

      const emailMethods = ['send', 'sendBatch', 'createDraft', 'sendDraft', 'listThreads', 'getThread', 'searchMessages', 'getMessage', 'listLabels', 'updateMessageLabels'];
      emailMethods.forEach(method => {
        t.equal(typeof AST.Messaging.email[method], 'function', `AST.Messaging.email.${method} is not available`);
      });

      const chatMethods = ['send', 'sendBatch', 'getMessage', 'listMessages'];
      chatMethods.forEach(method => {
        t.equal(typeof AST.Messaging.chat[method], 'function', `AST.Messaging.chat.${method} is not available`);
      });

      const trackingMethods = ['buildPixelUrl', 'wrapLinks', 'recordEvent', 'handleWebEvent'];
      trackingMethods.forEach(method => {
        t.equal(typeof AST.Messaging.tracking[method], 'function', `AST.Messaging.tracking.${method} is not available`);
      });

      const logsMethods = ['list', 'get', 'delete'];
      logsMethods.forEach(method => {
        t.equal(typeof AST.Messaging.logs[method], 'function', `AST.Messaging.logs.${method} is not available`);
      });
    })
  }
];
