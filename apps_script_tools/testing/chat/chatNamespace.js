CHAT_NAMESPACE_TESTS = [
  {
    description: 'AST.Chat should expose public helper methods',
    test: () => {
      if (!AST || !AST.Chat) {
        throw new Error('AST.Chat is not available');
      }

      const requiredMethods = ['configure', 'getConfig', 'clearConfig'];
      requiredMethods.forEach(method => {
        if (typeof AST.Chat[method] !== 'function') {
          throw new Error(`AST.Chat.${method} is not available`);
        }
      });

      if (!AST.Chat.ThreadStore || typeof AST.Chat.ThreadStore.create !== 'function') {
        throw new Error('AST.Chat.ThreadStore.create is not available');
      }
    }
  },
  {
    description: 'AST.Chat.ThreadStore should support create/switch/append/history flow',
    test: () => {
      const namespace = `ast_chat_gas_${Date.now()}`;
      const store = AST.Chat.ThreadStore.create({
        keyPrefix: namespace,
        lock: {
          lockScope: 'none'
        },
        hot: {
          backend: 'memory',
          namespace: `${namespace}:hot`,
          ttlSec: 120
        },
        durable: {
          backend: 'script_properties',
          namespace: `${namespace}:durable`,
          ttlSec: 3600
        },
        limits: {
          threadMax: 5,
          turnsMax: 20
        }
      });

      const user = { userKey: 'gas-user' };
      const created = store.newThread(user, { title: 'Namespace test thread' });

      if (!created.threadId) {
        throw new Error('Thread creation did not return threadId');
      }

      store.appendTurn(user, {
        threadId: created.threadId,
        turn: {
          role: 'user',
          content: 'What is the status?'
        }
      });
      store.appendTurn(user, {
        threadId: created.threadId,
        turn: {
          role: 'assistant',
          content: 'Status is green.'
        }
      });

      const history = store.buildHistory(user, {
        threadId: created.threadId,
        maxPairs: 5,
        systemMessage: 'You are a project assistant.'
      });

      if (!history.history || history.history.length < 3) {
        throw new Error('History did not include expected turns');
      }

      if (history.history[0].role !== 'system') {
        throw new Error('History system message was not included at first position');
      }

      const switched = store.switchThread(user, {
        threadId: created.threadId
      });
      if (switched.activeThreadId !== created.threadId) {
        throw new Error('switchThread did not set activeThreadId');
      }

      const listed = store.listThreads(user);
      if (listed.threadCount !== 1) {
        throw new Error(`Expected 1 thread, got ${listed.threadCount}`);
      }

      store.clearUser(user);
      const afterClear = store.getOrCreateState(user);
      if (afterClear.state.threadCount !== 0) {
        throw new Error('clearUser did not remove persisted thread state');
      }
    }
  }
];
