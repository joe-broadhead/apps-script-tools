const RAG_CHAT_BUILD = 'cookbook-rag-chat-starter';

function includeHtml_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function initAppWeb() {
  const config = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const store = cookbookCreateThreadStore_(ASTX, config);
  const userContext = cookbookResolveUserContext_();
  const threadState = cookbookEnsureActiveThread_(store, userContext);
  const index = cookbookGetIndexState_(ASTX, config, {
    allowAutoBuild: config.RAG_CHAT_AUTO_BUILD_INDEX,
    inspect: true
  });

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    app: cookbookBuildUiBootstrap_(config),
    runtime: {
      generationProvider: config.RAG_CHAT_GENERATION_PROVIDER,
      embeddingProvider: config.RAG_CHAT_EMBEDDING_PROVIDER,
      modelFast: cookbookSelectModel_(config, false),
      modelDeep: cookbookSelectModel_(config, true),
      embeddingModel: config.RAG_CHAT_EMBED_MODEL || ''
    },
    permissions: {
      canMutateIndex: config.RAG_CHAT_ALLOW_INDEX_MUTATIONS === true
    },
    index: {
      indexFileId: index.indexFileId,
      info: index.info,
      pendingJob: null
    },
    threads: threadState.threads,
    activeThread: cookbookThreadForClient_(threadState.activeThread)
  };
}

function newThreadWeb(request) {
  const config = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const store = cookbookCreateThreadStore_(ASTX, config);
  const userContext = cookbookResolveUserContext_();
  const title = cookbookNormalizeString_(request && request.title, 'New chat');

  store.newThread(userContext, {
    title: title,
    activate: true
  });

  const threadState = cookbookEnsureActiveThread_(store, userContext);
  return {
    ok: true,
    threads: threadState.threads,
    activeThread: cookbookThreadForClient_(threadState.activeThread)
  };
}

function switchThreadWeb(request) {
  const config = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const store = cookbookCreateThreadStore_(ASTX, config);
  const userContext = cookbookResolveUserContext_();
  const threadId = cookbookNormalizeString_(request && request.threadId, '');

  store.switchThread(userContext, { threadId: threadId });

  const threadState = cookbookEnsureActiveThread_(store, userContext, threadId);
  return {
    ok: true,
    threads: threadState.threads,
    activeThread: cookbookThreadForClient_(threadState.activeThread)
  };
}

function getIndexStateWeb() {
  const config = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const index = cookbookGetIndexState_(ASTX, config, {
    allowAutoBuild: false,
    inspect: true
  });

  return {
    ok: true,
    index: {
      indexFileId: index.indexFileId,
      info: index.info,
      pendingJob: null
    }
  };
}

function syncIndexWeb() {
  const config = cookbookRequireValidConfig_();
  if (config.RAG_CHAT_ALLOW_INDEX_MUTATIONS !== true) {
    throw new Error('Index mutation controls are disabled. Set RAG_CHAT_ALLOW_INDEX_MUTATIONS=true to enable sync/rebuild.');
  }

  const ASTX = cookbookAst_();
  const manager = cookbookCreateIndexManager_(ASTX, config);
  const result = manager.sync({
    indexFileId: config.RAG_CHAT_INDEX_FILE_ID
  });
  cookbookPersistIndexFileId_(result.indexFileId);

  return {
    ok: true,
    index: {
      indexFileId: result.indexFileId,
      info: cookbookInspectIndex_(ASTX, result.indexFileId),
      pendingJob: null
    }
  };
}

function rebuildIndexWeb() {
  const config = cookbookRequireValidConfig_();
  if (config.RAG_CHAT_ALLOW_INDEX_MUTATIONS !== true) {
    throw new Error('Index mutation controls are disabled. Set RAG_CHAT_ALLOW_INDEX_MUTATIONS=true to enable sync/rebuild.');
  }

  const ASTX = cookbookAst_();
  const result = ASTX.RAG.buildIndex(cookbookBuildIndexRequest_(config));
  cookbookPersistIndexFileId_(result.indexFileId);

  return {
    ok: true,
    index: {
      indexFileId: result.indexFileId,
      info: cookbookInspectIndex_(ASTX, result.indexFileId),
      pendingJob: null
    }
  };
}

function chatTurnWeb(request) {
  const startedAt = Date.now();
  const message = cookbookNormalizeString_(request && request.message, '');
  if (!message) {
    throw new Error('Missing request.message.');
  }

  const deep = request && (request.deep === true || cookbookNormalizeString_(request.mode, '').toLowerCase() === 'deep');
  const config = cookbookRequireValidConfig_();
  const ASTX = cookbookAst_();
  const store = cookbookCreateThreadStore_(ASTX, config);
  const userContext = cookbookResolveUserContext_();
  let threadId = cookbookNormalizeString_(request && request.threadId, '');

  const indexState = cookbookEnsureIndex_(ASTX, config, {
    allowAutoBuild: config.RAG_CHAT_AUTO_BUILD_INDEX,
    inspect: true
  });

  let threadState = cookbookEnsureActiveThread_(store, userContext, threadId);
  if (!threadState.activeThread.threadId) {
    store.newThread(userContext, { title: 'New chat', activate: true });
    threadState = cookbookEnsureActiveThread_(store, userContext);
  }

  threadId = threadState.activeThread.threadId;

  const historyState = store.buildHistory(userContext, {
    threadId: threadId,
    maxPairs: config.RAG_CHAT_HISTORY_MAX_PAIRS,
    includeToolTurns: false,
    includeSystemTurns: false,
    systemMessage: cookbookBuildSystemMessage_(config, deep)
  });

  store.appendTurn(userContext, {
    threadId: threadId,
    turn: {
      role: 'user',
      content: message,
      meta: {
        mode: deep ? 'deep' : 'fast'
      }
    }
  });

  const answer = cookbookAnswerQuestion_(ASTX, config, {
    indexFileId: indexState.indexFileId,
    question: message,
    deep: deep,
    history: historyState.history
  });

  store.appendTurn(userContext, {
    threadId: threadId,
    turn: {
      role: 'assistant',
      content: answer.answer,
      meta: {
        mode: answer.mode,
        model: answer.model,
        status: answer.status,
        citations: answer.citations,
        diagnostics: answer.diagnostics
      }
    }
  });

  threadState = cookbookEnsureActiveThread_(store, userContext, threadId);

  return {
    ok: true,
    status: answer.status,
    answer: answer.answer,
    threadId: threadId,
    thread: cookbookThreadForClient_(threadState.activeThread),
    threads: threadState.threads,
    index: {
      indexFileId: indexState.indexFileId,
      pendingJob: null
    },
    citations: answer.citations,
    diagnostics: {
      mode: answer.mode,
      model: answer.model,
      path: 'rag_answer',
      cached: answer.cached,
      totalMs: Date.now() - startedAt,
      rag: answer.diagnostics || null
    }
  };
}

function cookbookRenderConfigErrorPage_(validation) {
  const items = (validation && validation.errors ? validation.errors : []).map(function (item) {
    return '<li>' + cookbookEscapeHtml_(item) + '</li>';
  }).join('');
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><title>Cookbook config error</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; padding: 24px;">',
    '<h2>Cookbook config error</h2>',
    '<p>Run <code>seedCookbookConfig()</code> and then update the required Script Properties.</p>',
    '<ul>' + items + '</ul>',
    '</body></html>'
  ].join('');
}

function cookbookResolveUserContext_() {
  let userKey = '';
  try {
    userKey = Session.getTemporaryActiveUserKey() || '';
  } catch (_error) {
    userKey = '';
  }
  if (!userKey) {
    userKey = 'anonymous';
  }
  return { userKey: userKey };
}

function cookbookCreateThreadStore_(ASTX, config) {
  return ASTX.Chat.ThreadStore.create(cookbookBuildThreadStoreConfig_(config));
}

function cookbookEnsureActiveThread_(store, userContext, preferredThreadId) {
  store.getOrCreateState(userContext);
  let threads = store.listThreads(userContext);

  if (preferredThreadId && threads.activeThreadId !== preferredThreadId) {
    try {
      store.switchThread(userContext, { threadId: preferredThreadId });
      threads = store.listThreads(userContext);
    } catch (_error) {
      threads = store.listThreads(userContext);
    }
  }

  if (!threads.threadCount || !threads.activeThreadId) {
    store.newThread(userContext, { title: 'New chat', activate: true });
    threads = store.listThreads(userContext);
  }

  const active = store.getThread(userContext, { threadId: threads.activeThreadId });
  return {
    threads: cookbookThreadsForClient_(threads),
    activeThread: {
      threadId: active.threadId,
      title: active.thread && active.thread.title ? active.thread.title : 'New chat',
      turns: Array.isArray(active.turns) ? active.turns : []
    }
  };
}

function cookbookThreadsForClient_(threads) {
  const items = Array.isArray(threads && threads.threads) ? threads.threads : [];
  return {
    activeThreadId: threads && threads.activeThreadId ? threads.activeThreadId : '',
    list: items.map(function (thread) {
      return {
        id: thread.threadId,
        title: thread.title || 'Untitled',
        preview: thread.preview || '',
        updatedAt: thread.updatedAt || thread.createdAt || ''
      };
    })
  };
}

function cookbookThreadForClient_(threadState) {
  const rawTurns = Array.isArray(threadState && threadState.turns) ? threadState.turns : [];
  return {
    id: threadState && threadState.threadId ? threadState.threadId : '',
    title: threadState && threadState.title ? threadState.title : 'New chat',
    turns: cookbookBuildTranscriptTurns_(rawTurns)
  };
}

function cookbookBuildTranscriptTurns_(turns) {
  const out = [];
  let pending = null;

  for (let idx = 0; idx < turns.length; idx += 1) {
    const turn = turns[idx] || {};
    const role = cookbookNormalizeString_(turn.role, '');
    const meta = turn.meta || {};

    if (role === 'user') {
      if (pending) {
        out.push(pending);
      }
      pending = {
        q: cookbookNormalizeString_(turn.content, ''),
        a: '',
        status: '',
        deep: cookbookNormalizeString_(meta.mode, '') === 'deep',
        model: '',
        createdAt: turn.createdAt || '',
        citations: [],
        diagnostics: null
      };
      continue;
    }

    if (role === 'assistant') {
      const normalizedAssistant = {
        a: cookbookNormalizeString_(turn.content, ''),
        status: cookbookNormalizeString_(meta.status, 'ok'),
        deep: cookbookNormalizeString_(meta.mode, '') === 'deep',
        model: cookbookNormalizeString_(meta.model, ''),
        citations: Array.isArray(meta.citations) ? meta.citations : [],
        diagnostics: meta.diagnostics || null,
        createdAt: turn.createdAt || ''
      };

      if (!pending) {
        pending = {
          q: '',
          a: normalizedAssistant.a,
          status: normalizedAssistant.status,
          deep: normalizedAssistant.deep,
          model: normalizedAssistant.model,
          createdAt: normalizedAssistant.createdAt,
          citations: normalizedAssistant.citations,
          diagnostics: normalizedAssistant.diagnostics
        };
      } else {
        pending.a = normalizedAssistant.a;
        pending.status = normalizedAssistant.status;
        pending.deep = normalizedAssistant.deep;
        pending.model = normalizedAssistant.model;
        pending.citations = normalizedAssistant.citations;
        pending.diagnostics = normalizedAssistant.diagnostics;
      }

      out.push(pending);
      pending = null;
    }
  }

  if (pending) {
    out.push(pending);
  }

  return out;
}

function cookbookCreateIndexManager_(ASTX, config) {
  return ASTX.RAG.IndexManager.create({
    defaults: cookbookBuildRagDefaults_(config)
  });
}

function cookbookBuildIndexRequest_(config) {
  const request = {
    source: {
      folderId: config.RAG_CHAT_SOURCE_FOLDER_ID,
      includeSubfolders: true,
      includeMimeTypes: cookbookSupportedMimeTypes_()
    },
    index: {
      indexName: config.RAG_CHAT_INDEX_NAME
    },
    embedding: {
      provider: config.RAG_CHAT_EMBEDDING_PROVIDER
    },
    options: {
      skipParseFailures: true
    }
  };

  if (config.RAG_CHAT_EMBED_MODEL) {
    request.embedding.model = config.RAG_CHAT_EMBED_MODEL;
  }

  return request;
}

function cookbookPersistIndexFileId_(indexFileId) {
  cookbookPersistConfigValues_({
    RAG_CHAT_INDEX_FILE_ID: indexFileId || ''
  });
}

function cookbookInspectIndex_(ASTX, indexFileId) {
  if (!indexFileId) {
    return null;
  }
  return ASTX.RAG.inspectIndex({ indexFileId: indexFileId });
}

function cookbookGetIndexState_(ASTX, config, options) {
  const runtimeOptions = options || {};
  const manager = cookbookCreateIndexManager_(ASTX, config);
  try {
    const state = manager.fastState({
      indexFileId: config.RAG_CHAT_INDEX_FILE_ID,
      inspect: runtimeOptions.inspect === true
    });
    if (!state.ready && runtimeOptions.allowAutoBuild) {
      return cookbookEnsureIndex_(ASTX, config, runtimeOptions);
    }
    return {
      indexFileId: state.indexFileId,
      info: state.ready ? state : null
    };
  } catch (_error) {
    if (!runtimeOptions.allowAutoBuild) {
      return {
        indexFileId: config.RAG_CHAT_INDEX_FILE_ID || '',
        info: null
      };
    }
    return cookbookEnsureIndex_(ASTX, config, runtimeOptions);
  }
}

function cookbookEnsureIndex_(ASTX, config, options) {
  const runtimeOptions = options || {};
  const manager = cookbookCreateIndexManager_(ASTX, config);
  const result = manager.ensure({
    indexFileId: config.RAG_CHAT_INDEX_FILE_ID,
    options: {
      allowAutoBuild: runtimeOptions.allowAutoBuild === true,
      syncOnEnsure: false,
      fallbackToSupportedMimeTypes: true,
      inspectOnEnsure: true
    }
  });
  cookbookPersistIndexFileId_(result.indexFileId);
  return {
    indexFileId: result.indexFileId,
    info: cookbookInspectIndex_(ASTX, result.indexFileId)
  };
}

function cookbookSelectModel_(config, deep) {
  if (deep) {
    return config.RAG_CHAT_MODEL_DEEP || config.RAG_CHAT_MODEL_FAST || '';
  }
  return config.RAG_CHAT_MODEL_FAST || config.RAG_CHAT_MODEL_DEEP || '';
}

function cookbookBuildSystemMessage_(config, deep) {
  const modeLine = deep
    ? 'Give a more detailed answer, but stay concise enough for a chat UI.'
    : 'Give a concise answer optimized for quick chat consumption.';
  return [
    'You are a grounded assistant for a knowledge-base chat app.',
    'Answer only from retrieved context and keep inline citations in the form [S1].',
    'If the evidence is insufficient, respond with the configured insufficient-evidence message.',
    modeLine
  ].join(' ');
}

function cookbookAnswerQuestion_(ASTX, config, options) {
  const runtimeOptions = options || {};
  const deep = runtimeOptions.deep === true;
  const model = cookbookSelectModel_(config, deep);
  const generation = {
    provider: config.RAG_CHAT_GENERATION_PROVIDER,
    style: deep ? 'detailed' : 'chat',
    options: {
      temperature: deep ? 0.2 : 0.1,
      maxOutputTokens: deep ? config.RAG_CHAT_MAX_OUTPUT_TOKENS_DEEP : config.RAG_CHAT_MAX_OUTPUT_TOKENS_FAST
    }
  };
  if (model) {
    generation.model = model;
  }

  const response = ASTX.RAG.answer({
    indexFileId: runtimeOptions.indexFileId,
    question: runtimeOptions.question,
    history: Array.isArray(runtimeOptions.history) ? runtimeOptions.history : [],
    retrieval: {
      topK: deep ? config.RAG_CHAT_RETRIEVAL_TOP_K_DEEP : config.RAG_CHAT_RETRIEVAL_TOP_K_FAST,
      minScore: config.RAG_CHAT_MIN_SCORE,
      mode: 'hybrid'
    },
    generation: generation,
    options: {
      requireCitations: config.RAG_CHAT_REQUIRE_CITATIONS,
      insufficientEvidenceMessage: config.RAG_CHAT_INSUFFICIENT_EVIDENCE_MESSAGE,
      diagnostics: true
    }
  });

  const citations = cookbookDecorateCitations_(ASTX, response.citations || []);
  let answerText = cookbookNormalizeAnswerText_(ASTX, response.answer || '');
  if (!answerText && citations.length) {
    const fallback = ASTX.RAG.Fallback.fromCitations({
      citations: citations,
      intent: 'facts',
      factCount: 4
    });
    answerText = cookbookNormalizeAnswerText_(ASTX, fallback.answer || '');
  }

  return {
    status: response.status || 'ok',
    answer: answerText || config.RAG_CHAT_INSUFFICIENT_EVIDENCE_MESSAGE,
    citations: citations,
    mode: deep ? 'deep' : 'fast',
    model: model,
    cached: Boolean(response.diagnostics && response.diagnostics.pipelinePath === 'cache'),
    diagnostics: response.diagnostics || null
  };
}

function cookbookNormalizeAnswerText_(ASTX, text) {
  const normalized = ASTX.RAG.Citations.normalizeInline(cookbookNormalizeString_(text, ''));
  return normalized.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function cookbookDecorateCitations_(ASTX, citations) {
  const source = Array.isArray(citations) ? citations : [];
  const filtered = ASTX.RAG.Citations.filterForAnswer(source, { maxItems: 6 });
  return filtered.map(function (citation) {
    return {
      citationId: cookbookNormalizeString_(citation.citationId, ''),
      fileId: cookbookNormalizeString_(citation.fileId, ''),
      fileName: cookbookNormalizeString_(citation.fileName, 'Source'),
      mimeType: cookbookNormalizeString_(citation.mimeType, ''),
      page: citation.page == null ? null : citation.page,
      slide: citation.slide == null ? null : citation.slide,
      snippet: cookbookNormalizeString_(citation.snippet, '').replace(/\s+/g, ' ').slice(0, 320),
      url: ASTX.RAG.Citations.toUrl(citation),
      score: citation.finalScore == null ? null : citation.finalScore
    };
  });
}

function cookbookEscapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
