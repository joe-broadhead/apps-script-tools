function includeHtml_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet() {
  var cfg = resolveAppConfig_({});
  var actor = buildActorContext_();

  try {
    assertWebAppAccess_(cfg, actor, 'web app');
  } catch (_error) {
    return HtmlService
      .createHtmlOutput('<h2>Access denied</h2><p>Sign in with an authorized account.</p>')
      .setTitle('Access denied');
  }

  var title = stringOrEmpty_(cfg.app.name) || 'AST RAG Chat Starter';
  var template = HtmlService.createTemplateFromFile('Index');
  template.initialTitle = title;

  return template
    .evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function initAppWeb(request) {
  request = request || {};
  var started = Date.now();

  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'app initialization');
  var runtime = resolveRuntime_(request);
  var userContext = buildUserContext_();
  var isAdmin = false;
  try {
    assertWebAppAdmin_(cfg, actor, 'admin check');
    isAdmin = true;
  } catch (_notAdmin) {
    isAdmin = false;
  }

  var canMutateIndex = cfg.security.restrictIndexMutationsToAdmins !== true || isAdmin;
  var canWarmModels = cfg.security.restrictWarmupToAdmins !== true || isAdmin;

  configureAstRuntime_(ASTX, cfg);
  var indexState = ensureSharedIndex_(ASTX, runtime, cfg, request, {
    allowMutate: canMutateIndex
  });

  var threadsState = getOrCreateThreadsState_(ASTX, userContext, cfg);
  var activeThread = loadThread_(
    ASTX,
    userContext,
    threadsState.activeThreadId,
    threadsState,
    cfg
  );

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    app: buildUiBootstrap_(cfg),
    runtime: {
      generationProvider: runtime.generationProvider,
      embeddingProvider: runtime.embeddingProvider,
      modelFast: runtime.modelFast,
      modelDeep: runtime.modelDeep,
      embeddingModel: runtime.embeddingModel
    },
    permissions: {
      isAdmin: isAdmin,
      canMutateIndex: canMutateIndex,
      canWarmModels: canWarmModels
    },
    user: {
      locale: userContext.locale,
      timeZone: userContext.timeZone,
      emailHash: userContext.emailHash
    },
    index: {
      indexFileId: indexState.indexFileId,
      info: indexState.indexInfo,
      pendingJob: indexState.pendingJob || null
    },
    threads: threadsState,
    activeThread: scrubThreadForClient_(activeThread),
    execution: {
      serverMs: Date.now() - started
    }
  };
}

function warmModelsWeb(request) {
  request = request || {};
  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'model warmup');

  if (cfg.security.restrictWarmupToAdmins === true) {
    assertWebAppAdmin_(cfg, actor, 'model warmup');
  }

  var runtime = resolveRuntime_(request);

  configureAstRuntime_(ASTX, cfg);

  var out = {
    ok: true,
    build: RAG_CHAT_BUILD,
    warmed: [],
    skipped: []
  };

  try {
    ASTX.AI.text({
      provider: runtime.generationProvider,
      model: runtime.modelFast,
      input: 'Reply with exactly: warm',
      options: { temperature: 0, maxOutputTokens: 8, retries: 0 },
      auth: runtime.generationAuth
    });
    out.warmed.push(runtime.modelFast);
  } catch (_e) {
    out.skipped.push(runtime.modelFast);
  }

  if (runtime.modelDeep !== runtime.modelFast) {
    try {
      ASTX.AI.text({
        provider: runtime.generationProvider,
        model: runtime.modelDeep,
        input: 'Reply with exactly: warm',
        options: { temperature: 0, maxOutputTokens: 8, retries: 0 },
        auth: runtime.generationAuth
      });
      out.warmed.push(runtime.modelDeep);
    } catch (_e2) {
      out.skipped.push(runtime.modelDeep);
    }
  }

  return out;
}

function chatTurnWeb(request) {
  request = request || {};
  var started = Date.now();

  var message = stringOrEmpty_(request.message).trim();
  if (!message) throw new Error('Missing request.message.');

  var deep = request.deep === true || stringOrEmpty_(request.mode).toLowerCase() === 'deep';

  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'chat');
  var runtime = resolveRuntime_(request);
  var userContext = buildUserContext_();
  var requestFingerprint = buildChatRequestFingerprint_(
    stringOrEmpty_(request.threadId),
    message,
    deep
  );

  configureAstRuntime_(ASTX, cfg);
  var rateState = null;
  var recent = getRecentChatResponse_(ASTX, cfg, userContext, requestFingerprint);
  if (recent && typeof recent === 'object') {
    recent.diagnostics = recent.diagnostics || {};
    recent.diagnostics.cached = true;
    recent.diagnostics.path = 'request_dedupe';
    recent.diagnostics.totalMs = Date.now() - started;
    recent.diagnostics.rateLimit = rateState;
    if (typeof recordChatMetric_ === 'function') {
      recordChatMetric_(ASTX, cfg, {
        mode: deep ? 'deep' : 'fast',
        path: 'request_dedupe',
        status: stringOrEmpty_(recent.status) || 'ok',
        cached: true,
        failed: false,
        totalMs: recent.diagnostics.totalMs
      });
    }
    return recent;
  }
  rateState = enforceChatRateLimit_(ASTX, cfg, userContext);

  acquireChatInflightLock_(ASTX, cfg, userContext, requestFingerprint);

  try {
    var canMutateIndex = cfg.security.restrictIndexMutationsToAdmins !== true;

    if (!canMutateIndex) {
      try {
        assertWebAppAdmin_(cfg, actor, 'index management');
        canMutateIndex = true;
      } catch (_notAdmin2) {
        canMutateIndex = false;
      }
    }

    var indexState = ensureSharedIndex_(ASTX, runtime, cfg, request, {
      allowMutate: canMutateIndex
    });
    var indexFileId = indexState.indexFileId;
    if (!indexFileId) {
      var pendingError = new Error('Knowledge index is still building. Please retry in a moment.');
      pendingError.code = 'INDEX_PENDING';
      pendingError.details = {
        pendingJob: indexState.pendingJob || null
      };
      throw pendingError;
    }

    var threadsState = getOrCreateThreadsState_(ASTX, userContext, cfg);
    var threadId = stringOrEmpty_(request.threadId);

    if (!threadId || !threadExists_(threadId, threadsState)) {
      threadsState = createThread_(ASTX, userContext, threadsState, { title: 'New chat' }, cfg);
      threadId = threadsState.activeThreadId;
    } else {
      threadsState.activeThreadId = threadId;
    }

    var thread = loadThread_(ASTX, userContext, threadId, threadsState, cfg);
    var systemMessage = buildSystemMessage_(userContext, deep, cfg);
    var history = buildHistoryFromThread_(thread, 10, systemMessage);
    var model = deep ? runtime.modelDeep : runtime.modelFast;

    var ragResult = null;
    var path = deep ? 'deep' : 'fast';
    var ragStarted = Date.now();

    try {
      ragResult = runRagAnswer_({
        ASTX: ASTX,
        cfg: cfg,
        runtime: runtime,
        indexFileId: indexFileId,
        message: message,
        history: history,
        deep: deep,
        model: model,
        request: request
      });
    } catch (error) {
      if (deep) {
        // Fallback to fast mode once to improve resiliency.
        deep = false;
        model = runtime.modelFast;
        path = 'deep_fallback_fast';
        ragResult = runRagAnswer_({
          ASTX: ASTX,
          cfg: cfg,
          runtime: runtime,
          indexFileId: indexFileId,
          message: message,
          history: history,
          deep: false,
          model: model,
          request: request
        });
      } else {
        throw error;
      }
    }
    var answer = normalizeAnswerStyle_(stringOrEmpty_(ragResult && ragResult.answer));
    if (!answer) {
      answer = cfg.rag.insufficientEvidenceMessage;
    }

    var citations = decorateCitations_(ragResult && ragResult.citations);
    var status = stringOrEmpty_(ragResult && ragResult.status) || 'ok';

    var turn = {
      q: message,
      a: answer,
      status: status,
      deep: deep,
      model: model,
      createdAt: Date.now(),
      citations: citations,
      diagnostics: {
        build: RAG_CHAT_BUILD,
        mode: deep ? 'deep' : 'fast',
        path: path,
        retrieval: ragResult && ragResult.retrieval ? ragResult.retrieval : null,
        usage: ragResult && ragResult.usage ? ragResult.usage : null,
        ragMs: Date.now() - ragStarted
      }
    };

    thread = appendTurn_(thread, turn, cfg);
    saveThread_(ASTX, userContext, thread, cfg);

    threadsState = touchThreadMeta_(threadsState, threadId, message, cfg);
    saveThreadsState_(ASTX, userContext, threadsState, cfg);

    var response = {
      ok: true,
      build: RAG_CHAT_BUILD,
      threadId: threadId,
      answer: answer,
      status: status,
      citations: citations,
      thread: scrubThreadForClient_(thread),
      threads: threadsState,
      diagnostics: {
        mode: deep ? 'deep' : 'fast',
        path: path,
        model: model,
        provider: runtime.generationProvider,
        cached: false,
        requestFingerprint: requestFingerprint,
        rateLimit: rateState,
        totalMs: Date.now() - started
      }
    };
    putRecentChatResponse_(ASTX, cfg, userContext, requestFingerprint, response);
    if (typeof recordChatMetric_ === 'function') {
      recordChatMetric_(ASTX, cfg, {
        mode: deep ? 'deep' : 'fast',
        path: path,
        status: status,
        cached: false,
        failed: false,
        totalMs: response.diagnostics.totalMs
      });
    }

    return response;
  } catch (error) {
    if (typeof recordChatMetric_ === 'function') {
      recordChatMetric_(ASTX, cfg, {
        mode: deep ? 'deep' : 'fast',
        path: deep ? 'deep' : 'fast',
        status: 'error',
        cached: false,
        failed: true,
        totalMs: Date.now() - started
      });
    }
    throw error;
  } finally {
    releaseChatInflightLock_(ASTX, cfg, userContext);
  }
}

function runRagAnswer_(cfg) {
  var ASTX = cfg.ASTX;
  var runtime = cfg.runtime;
  var appCfg = cfg.cfg;
  var deep = cfg.deep === true;

  var retrievalTopK = deep ? appCfg.rag.topKDeep : appCfg.rag.topKFast;
  var maxOutputTokens = deep ? appCfg.rag.maxOutputTokensDeep : appCfg.rag.maxOutputTokensFast;

  return ASTX.RAG.answer({
    indexFileId: cfg.indexFileId,
    question: cfg.message,
    history: cfg.history,
    retrieval: {
      topK: retrievalTopK,
      minScore: appCfg.rag.minScore,
      mode: deep ? 'hybrid' : 'vector',
      filters: cfg.request.retrievalFilters || undefined
    },
    generation: {
      provider: runtime.generationProvider,
      model: cfg.model,
      auth: runtime.generationAuth,
      providerOptions: cfg.request.generationProviderOptions || {},
      options: {
        temperature: 0.1,
        maxOutputTokens: maxOutputTokens
      }
    },
    options: {
      requireCitations: true,
      insufficientEvidenceMessage: appCfg.rag.insufficientEvidenceMessage
    },
    auth: runtime.embeddingAuth
  });
}

function syncIndexWeb(request) {
  request = request || {};
  var started = Date.now();
  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'index sync');
  if (cfg.security.restrictIndexMutationsToAdmins === true) {
    assertWebAppAdmin_(cfg, actor, 'index sync');
  }
  var runtime = resolveRuntime_(request);

  configureAstRuntime_(ASTX, cfg);
  var result = syncSharedIndex_(ASTX, runtime, cfg, request, {
    allowMutate: true
  });
  if (typeof recordIndexMutationMetric_ === 'function') {
    recordIndexMutationMetric_(ASTX, cfg, {
      mode: 'sync',
      indexFileId: result.indexFileId,
      sourceCount: result.indexInfo && result.indexInfo.sourceCount,
      chunkCount: result.indexInfo && result.indexInfo.chunkCount,
      failed: false
    });
  }

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    index: {
      indexFileId: result.indexFileId,
      info: result.indexInfo,
      pendingJob: result.pendingJob || null
    },
    indexOperation: result.indexOperation || null,
    execution: {
      serverMs: Date.now() - started
    }
  };
}

function rebuildIndexWeb(request) {
  request = request || {};
  request.forceRebuild = true;
  return syncIndexWeb(request);
}

function indexJobStatusWeb(request) {
  request = request || {};
  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'index job status');
  var job = getCurrentIndexJobState_(ASTX, cfg);

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    job: job || null
  };
}

function getIndexStateWeb(request) {
  request = request || {};
  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'index state');

  configureAstRuntime_(ASTX, cfg);

  var settings = resolveIndexSettings_(cfg, request);
  var indexFileId = stringOrEmpty_(settings.indexFileId);
  var info = null;
  if (indexFileId) {
    try {
      info = inspectIndexWithCache_(ASTX, cfg, indexFileId);
    } catch (_error) {
      info = null;
    }
  }

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    index: {
      indexFileId: indexFileId,
      info: info,
      pendingJob: getCurrentIndexJobState_(ASTX, cfg) || null
    }
  };
}

function newThreadWeb(request) {
  request = request || {};
  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'new thread');
  var userContext = buildUserContext_();
  var threadsState = getOrCreateThreadsState_(ASTX, userContext, cfg);

  threadsState = createThread_(ASTX, userContext, threadsState, {
    threadId: stringOrEmpty_(request.threadId),
    title: stringOrEmpty_(request.title) || 'New chat'
  }, cfg);

  saveThreadsState_(ASTX, userContext, threadsState, cfg);
  var activeThread = loadThread_(
    ASTX,
    userContext,
    threadsState.activeThreadId,
    threadsState,
    cfg
  );

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    threads: threadsState,
    activeThread: scrubThreadForClient_(activeThread)
  };
}

function switchThreadWeb(request) {
  request = request || {};
  var threadId = stringOrEmpty_(request.threadId);
  if (!threadId) throw new Error('Missing request.threadId.');

  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'switch thread');
  var userContext = buildUserContext_();
  var threadsState = getOrCreateThreadsState_(ASTX, userContext, cfg);

  if (!threadExists_(threadId, threadsState)) {
    throw new Error('Thread not found.');
  }

  threadsState.activeThreadId = threadId;
  saveThreadsState_(ASTX, userContext, threadsState, cfg);
  var thread = loadThread_(ASTX, userContext, threadId, threadsState, cfg);

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    threads: threadsState,
    activeThread: scrubThreadForClient_(thread)
  };
}

function renameThreadWeb(request) {
  request = request || {};
  var threadId = stringOrEmpty_(request.threadId);
  var title = stringOrEmpty_(request.title).trim();
  if (!threadId) throw new Error('Missing request.threadId.');
  if (!title) throw new Error('Missing request.title.');

  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'rename thread');
  var userContext = buildUserContext_();
  var threadsState = getOrCreateThreadsState_(ASTX, userContext, cfg);

  for (var i = 0; i < threadsState.list.length; i += 1) {
    if (threadsState.list[i] && threadsState.list[i].id === threadId) {
      threadsState.list[i].title = title.slice(0, 80);
      break;
    }
  }

  var thread = loadThread_(ASTX, userContext, threadId, threadsState, cfg);
  thread.title = title.slice(0, 80);
  saveThread_(ASTX, userContext, thread, cfg);
  saveThreadsState_(ASTX, userContext, threadsState, cfg);

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    threads: threadsState,
    activeThread: scrubThreadForClient_(thread)
  };
}

function deleteThreadWeb(request) {
  request = request || {};
  var threadId = stringOrEmpty_(request.threadId);
  if (!threadId) throw new Error('Missing request.threadId.');

  var ASTX = getAst_();
  var cfg = resolveAppConfig_(request);
  var actor = buildActorContext_();
  assertWebAppAccess_(cfg, actor, 'delete thread');
  var userContext = buildUserContext_();
  var threadsState = getOrCreateThreadsState_(ASTX, userContext, cfg);

  var filtered = [];
  for (var i = 0; i < threadsState.list.length; i += 1) {
    var row = threadsState.list[i];
    if (!row || row.id === threadId) continue;
    filtered.push(row);
  }
  threadsState.list = filtered;
  removeThread_(ASTX, userContext, threadId, cfg);

  if (!threadsState.list.length) {
    threadsState = createThread_(ASTX, userContext, threadsState, { title: 'New chat' }, cfg);
  } else if (threadsState.activeThreadId === threadId) {
    threadsState.activeThreadId = threadsState.list[0].id;
  }

  saveThreadsState_(ASTX, userContext, threadsState, cfg);
  var activeThread = loadThread_(
    ASTX,
    userContext,
    threadsState.activeThreadId,
    threadsState,
    cfg
  );

  return {
    ok: true,
    build: RAG_CHAT_BUILD,
    threads: threadsState,
    activeThread: scrubThreadForClient_(activeThread)
  };
}

function configureAstRuntime_(ASTX, cfg) {
  try {
    ASTX.Cache.configure(buildCacheOptions_(cfg, cfg.cache.namespace + '_threads', {
      defaultTtlSec: cfg.threads.ttlSec
    }));
  } catch (_e) {
    // Ignore configure failures in cookbook.
  }

  try {
    if (ASTX.Jobs && typeof ASTX.Jobs.configure === 'function') {
      ASTX.Jobs.configure({
        propertyPrefix: cfg.runtime.indexJobPropertyPrefix,
        maxRuntimeMs: cfg.runtime.indexJobMaxRuntimeMs,
        maxRetries: cfg.runtime.indexJobMaxRetries
      });
    }
  } catch (_e2) {
    // Ignore job configure failures in cookbook runtime.
  }
}
