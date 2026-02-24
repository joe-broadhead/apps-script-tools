function astChatCreateThreadStore(config = {}) {
  const resolvedConfig = astChatResolveConfig(config);

  return Object.freeze({
    getOrCreateState(userContext = {}) {
      const userKey = astChatResolveUserKey(userContext);
      const state = astChatReadStateForUser(userKey, resolvedConfig);
      const persisted = astChatWriteStateForUser(userKey, state, resolvedConfig);
      return {
        state: astChatBuildStateSummary(persisted),
        diagnostics: {
          lockMode: 'none'
        }
      };
    },

    listThreads(userContext = {}) {
      const userKey = astChatResolveUserKey(userContext);
      const state = astChatReadStateForUser(userKey, resolvedConfig);
      return {
        activeThreadId: state.activeThreadId,
        threadCount: state.threads.length,
        threads: state.threads.map(thread => astChatJsonClone(thread))
      };
    },

    getThread(userContext = {}, options = {}) {
      const userKey = astChatResolveUserKey(userContext);
      const state = astChatReadStateForUser(userKey, resolvedConfig);
      const threadId = astChatNormalizeString(options.threadId, state.activeThreadId || '');
      if (!threadId) {
        return {
          threadId: null,
          thread: null,
          turns: []
        };
      }

      const thread = state.threads.find(item => item.threadId === threadId);
      if (!thread) {
        throw new AstChatNotFoundError('Thread not found', { threadId });
      }

      const turns = Array.isArray(state.turnsByThread[threadId]) ? state.turnsByThread[threadId] : [];
      return {
        threadId,
        thread: astChatJsonClone(thread),
        turns: astChatJsonClone(turns)
      };
    },

    newThread(userContext = {}, args = {}) {
      const mutation = astChatWithMutableState(
        userContext,
        resolvedConfig,
        state => {
          const thread = astChatCreateThreadInState(state, args, resolvedConfig);
          return {
            threadId: thread.threadId,
            thread: astChatJsonClone(thread),
            activeThreadId: state.activeThreadId
          };
        },
        args
      );

      return {
        threadId: mutation.output.threadId,
        thread: mutation.output.thread,
        activeThreadId: mutation.output.activeThreadId,
        state: astChatBuildStateSummary(mutation.state),
        diagnostics: {
          lockMode: mutation.lockMode
        }
      };
    },

    switchThread(userContext = {}, args = {}) {
      const mutation = astChatWithMutableState(
        userContext,
        resolvedConfig,
        state => {
          const thread = astChatSwitchThreadInState(state, args.threadId);
          return {
            threadId: thread.threadId,
            thread: astChatJsonClone(thread),
            activeThreadId: state.activeThreadId
          };
        },
        args
      );

      return {
        threadId: mutation.output.threadId,
        thread: mutation.output.thread,
        activeThreadId: mutation.output.activeThreadId,
        state: astChatBuildStateSummary(mutation.state),
        diagnostics: {
          lockMode: mutation.lockMode
        }
      };
    },

    appendTurn(userContext = {}, args = {}) {
      const mutation = astChatWithMutableState(
        userContext,
        resolvedConfig,
        state => astChatAppendTurnInState(state, args, resolvedConfig),
        args
      );

      return {
        threadId: mutation.output.thread.threadId,
        turn: astChatJsonClone(mutation.output.turn),
        thread: astChatJsonClone(mutation.output.thread),
        state: astChatBuildStateSummary(mutation.state),
        diagnostics: {
          lockMode: mutation.lockMode
        }
      };
    },

    buildHistory(userContext = {}, args = {}) {
      const userKey = astChatResolveUserKey(userContext);
      const state = astChatReadStateForUser(userKey, resolvedConfig);
      return astChatBuildHistoryFromState(state, args);
    },

    clearUser(userContext = {}) {
      const userKey = astChatResolveUserKey(userContext);
      const cache = astChatResolveCacheApi();
      const stateKey = astChatBuildStateKey(userKey, resolvedConfig.keyPrefix);
      const hotOptions = astChatBuildCacheOptions(resolvedConfig.hot);
      const durableOptions = astChatBuildCacheOptions(resolvedConfig.durable);

      cache.delete(stateKey, hotOptions);
      cache.delete(stateKey, durableOptions);
      return {
        userKey,
        cleared: true
      };
    }
  });
}

function astChatApiConfigure(config = {}, options = {}) {
  return astChatSetRuntimeConfig(config, options);
}

function astChatApiGetConfig() {
  return astChatGetRuntimeConfig();
}

function astChatApiClearConfig() {
  return astChatClearRuntimeConfig();
}

const AST_CHAT = Object.freeze({
  configure: astChatApiConfigure,
  getConfig: astChatApiGetConfig,
  clearConfig: astChatApiClearConfig,
  ThreadStore: Object.freeze({
    create: astChatCreateThreadStore
  })
});
