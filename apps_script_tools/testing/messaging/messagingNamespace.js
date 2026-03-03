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
      t.equal(typeof AST.Messaging.registerTemplate, 'function', 'AST.Messaging.registerTemplate is not available');
      t.equal(typeof AST.Messaging.getTemplate, 'function', 'AST.Messaging.getTemplate is not available');
      t.equal(typeof AST.Messaging.renderTemplate, 'function', 'AST.Messaging.renderTemplate is not available');
      t.equal(typeof AST.Messaging.sendTemplate, 'function', 'AST.Messaging.sendTemplate is not available');
      t.equal(typeof AST.Messaging.verifyInbound, 'function', 'AST.Messaging.verifyInbound is not available');
      t.equal(typeof AST.Messaging.parseInbound, 'function', 'AST.Messaging.parseInbound is not available');
      t.equal(typeof AST.Messaging.routeInbound, 'function', 'AST.Messaging.routeInbound is not available');

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

      const templateMethods = ['register', 'get', 'render', 'send'];
      templateMethods.forEach(method => {
        t.equal(typeof AST.Messaging.templates[method], 'function', `AST.Messaging.templates.${method} is not available`);
      });

      const inboundMethods = ['verify', 'parse', 'route'];
      inboundMethods.forEach(method => {
        t.equal(typeof AST.Messaging.inbound[method], 'function', `AST.Messaging.inbound.${method} is not available`);
      });
    })
  }
];
