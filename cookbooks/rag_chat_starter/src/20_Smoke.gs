function runCookbookSmokeInternal_(config) {
  const ASTX = cookbookAst_();
  const indexState = cookbookEnsureIndex_(ASTX, config, {
    allowAutoBuild: config.RAG_CHAT_AUTO_BUILD_INDEX,
    inspect: true
  });
  const answer = cookbookAnswerQuestion_(ASTX, config, {
    indexFileId: indexState.indexFileId,
    question: config.RAG_CHAT_SMOKE_QUESTION,
    deep: false,
    history: []
  });

  return {
    status: 'ok',
    entrypoint: 'runCookbookSmoke',
    cookbook: cookbookName_(),
    appName: config.RAG_CHAT_APP_NAME,
    question: config.RAG_CHAT_SMOKE_QUESTION,
    index: indexState,
    answer: {
      status: answer.status,
      answer: answer.answer,
      citationCount: answer.citations.length,
      citations: answer.citations.slice(0, 3),
      mode: answer.mode,
      model: answer.model
    },
    completedAt: new Date().toISOString()
  };
}

function runCookbookDemoInternal_(config) {
  const ASTX = cookbookAst_();
  const indexState = cookbookEnsureIndex_(ASTX, config, {
    allowAutoBuild: config.RAG_CHAT_AUTO_BUILD_INDEX,
    inspect: true
  });
  const preview = ASTX.RAG.previewSources({
    indexFileId: indexState.indexFileId,
    query: config.RAG_CHAT_SMOKE_QUESTION,
    retrieval: {
      topK: config.RAG_CHAT_RETRIEVAL_TOP_K_FAST,
      minScore: config.RAG_CHAT_MIN_SCORE,
      mode: 'hybrid'
    },
    preview: {
      snippetMaxChars: 220,
      includeText: false,
      includePayload: false,
      cachePayload: false
    },
    options: {
      diagnostics: true
    }
  });

  const store = cookbookCreateThreadStore_(ASTX, config);
  const userContext = { userKey: 'cookbook_demo_user' };
  store.clearUser(userContext);
  const threadState = cookbookEnsureActiveThread_(store, userContext);
  const answer = cookbookAnswerQuestion_(ASTX, config, {
    indexFileId: indexState.indexFileId,
    question: config.RAG_CHAT_SMOKE_QUESTION,
    deep: true,
    history: []
  });

  store.appendTurn(userContext, {
    threadId: threadState.activeThread.threadId,
    turn: {
      role: 'user',
      content: config.RAG_CHAT_SMOKE_QUESTION,
      meta: {
        source: 'demo'
      }
    }
  });
  store.appendTurn(userContext, {
    threadId: threadState.activeThread.threadId,
    turn: {
      role: 'assistant',
      content: answer.answer,
      meta: {
        source: 'demo',
        mode: answer.mode,
        status: answer.status,
        model: answer.model,
        citations: answer.citations
      }
    }
  });

  const refreshed = cookbookEnsureActiveThread_(store, userContext, threadState.activeThread.threadId);

  return {
    status: 'ok',
    entrypoint: 'runCookbookDemo',
    cookbook: cookbookName_(),
    app: cookbookBuildUiBootstrap_(config),
    index: indexState,
    threadState: {
      activeThreadId: refreshed.threads.activeThreadId,
      threadCount: refreshed.threads.list.length,
      latestThread: cookbookThreadForClient_(refreshed.activeThread)
    },
    previewCards: Array.isArray(preview.cards) ? preview.cards.slice(0, 4) : [],
    answer: {
      status: answer.status,
      citationCount: answer.citations.length,
      mode: answer.mode,
      model: answer.model
    },
    completedAt: new Date().toISOString()
  };
}
