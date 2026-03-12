function getOrCreateThreadsState_(ASTX, userContext, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  var key = threadsKey_(userContext);
  var state = appCacheGet_(ASTX, cfg, key);

  if (!state || !Array.isArray(state.list)) {
    state = {
      activeThreadId: '',
      list: []
    };
    state = createThread_(ASTX, userContext, state, { title: 'New chat' }, cfg);
    saveThreadsState_(ASTX, userContext, state, cfg);
  }

  return normalizeThreadsState_(state, cfg);
}

function normalizeThreadsState_(state, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  state = state || {};
  var threadCfg = cfg.threads || RAG_CHAT_DEFAULTS.threads;

  var list = Array.isArray(state.list) ? state.list.slice() : [];
  list.sort(function (a, b) {
    return integerOr_(b && b.updatedAt, 0) - integerOr_(a && a.updatedAt, 0);
  });
  if (list.length > threadCfg.maxThreads) {
    list = list.slice(0, threadCfg.maxThreads);
  }

  var activeThreadId = stringOrEmpty_(state.activeThreadId);
  if (!activeThreadId && list.length) {
    activeThreadId = stringOrEmpty_(list[0].id);
  }

  return {
    activeThreadId: activeThreadId,
    list: list
  };
}

function saveThreadsState_(ASTX, userContext, state, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  appCacheSet_(ASTX, cfg, threadsKey_(userContext), normalizeThreadsState_(state, cfg), cfg.threads.ttlSec);
}

function createThread_(ASTX, userContext, threadsState, opts, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  opts = opts || {};
  threadsState = normalizeThreadsState_(threadsState, cfg);

  var id = stringOrEmpty_(opts.threadId) || makeThreadId_();
  if (threadExists_(id, threadsState)) {
    threadsState.activeThreadId = id;
    return threadsState;
  }

  var now = Date.now();
  var title = stringOrEmpty_(opts.title).trim() || 'New chat';

  var meta = {
    id: id,
    title: title,
    createdAt: now,
    updatedAt: now,
    preview: ''
  };

  var nextList = [meta].concat(threadsState.list || []);
  var maxThreads = integerOr_(cfg.threads.maxThreads, RAG_CHAT_DEFAULTS.threads.maxThreads);
  if (nextList.length > maxThreads) {
    for (var i = maxThreads; i < nextList.length; i += 1) {
      removeThread_(ASTX, userContext, nextList[i].id, cfg);
    }
    nextList = nextList.slice(0, maxThreads);
  }

  threadsState.list = nextList;
  threadsState.activeThreadId = id;

  saveThread_(ASTX, userContext, {
    id: id,
    title: title,
    createdAt: now,
    updatedAt: now,
    turns: []
  }, cfg);

  return normalizeThreadsState_(threadsState, cfg);
}

function loadThread_(ASTX, userContext, threadId, threadsState, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  var id = stringOrEmpty_(threadId);
  if (!id && threadsState) {
    id = stringOrEmpty_(threadsState.activeThreadId);
  }
  if (!id) id = makeThreadId_();

  var cached = appCacheGet_(ASTX, cfg, threadKey_(userContext, id));
  if (cached && cached.id) {
    cached.turns = Array.isArray(cached.turns) ? cached.turns : [];
    return cached;
  }

  var fallbackTitle = 'New chat';
  if (threadsState && Array.isArray(threadsState.list)) {
    for (var i = 0; i < threadsState.list.length; i += 1) {
      if (threadsState.list[i] && threadsState.list[i].id === id) {
        fallbackTitle = stringOrEmpty_(threadsState.list[i].title) || fallbackTitle;
        break;
      }
    }
  }

  var now = Date.now();
  var thread = {
    id: id,
    title: fallbackTitle,
    createdAt: now,
    updatedAt: now,
    turns: []
  };
  saveThread_(ASTX, userContext, thread, cfg);
  return thread;
}

function saveThread_(ASTX, userContext, thread, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  if (!thread || !thread.id) return;
  appCacheSet_(ASTX, cfg, threadKey_(userContext, thread.id), thread, cfg.threads.ttlSec);
}

function removeThread_(ASTX, userContext, threadId, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  if (!threadId) return;
  appCacheDelete_(ASTX, cfg, threadKey_(userContext, threadId));
}

function appendTurn_(thread, turn, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  var maxTurns = integerOr_(cfg.threads.maxTurns, RAG_CHAT_DEFAULTS.threads.maxTurns);
  var turns = Array.isArray(thread && thread.turns) ? thread.turns.slice() : [];

  turns.push(turn);
  if (turns.length > maxTurns) {
    turns = turns.slice(turns.length - maxTurns);
  }

  thread.turns = turns;
  thread.updatedAt = Date.now();

  if ((stringOrEmpty_(thread.title).toLowerCase() === 'new chat') && turns.length) {
    var firstQ = stringOrEmpty_(turns[0] && turns[0].q).trim();
    if (firstQ) thread.title = firstQ.slice(0, 64);
  }

  return thread;
}

function touchThreadMeta_(threadsState, threadId, preview, cfg) {
  cfg = cfg || RAG_CHAT_DEFAULTS;
  threadsState = normalizeThreadsState_(threadsState, cfg);
  var now = Date.now();
  var value = stringOrEmpty_(preview).trim().slice(0, 120);
  var list = threadsState.list || [];

  for (var i = 0; i < list.length; i += 1) {
    if (!list[i] || list[i].id !== threadId) continue;
    list[i].updatedAt = now;
    list[i].preview = value;
    if ((stringOrEmpty_(list[i].title).toLowerCase() === 'new chat') && value) {
      list[i].title = value.slice(0, 64);
    }
    break;
  }

  list.sort(function (a, b) {
    return integerOr_(b && b.updatedAt, 0) - integerOr_(a && a.updatedAt, 0);
  });

  threadsState.list = list.slice(0, integerOr_(cfg.threads.maxThreads, RAG_CHAT_DEFAULTS.threads.maxThreads));
  return threadsState;
}

function threadExists_(threadId, threadsState) {
  if (!threadId || !threadsState || !Array.isArray(threadsState.list)) return false;
  for (var i = 0; i < threadsState.list.length; i += 1) {
    if (threadsState.list[i] && threadsState.list[i].id === threadId) return true;
  }
  return false;
}

function makeThreadId_() {
  return 't_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
}

function scrubThreadForClient_(thread) {
  thread = thread || {};
  var turns = Array.isArray(thread.turns) ? thread.turns : [];
  var cleaned = [];
  for (var i = 0; i < turns.length; i += 1) {
    cleaned.push(scrubTurnForClient_(turns[i]));
  }
  return {
    id: stringOrEmpty_(thread.id),
    title: stringOrEmpty_(thread.title),
    createdAt: integerOr_(thread.createdAt, null),
    updatedAt: integerOr_(thread.updatedAt, null),
    turns: cleaned
  };
}

function scrubTurnForClient_(turn) {
  turn = turn || {};
  return {
    q: stringOrEmpty_(turn.q),
    a: stringOrEmpty_(turn.a),
    status: stringOrEmpty_(turn.status),
    deep: turn.deep === true,
    model: stringOrEmpty_(turn.model),
    createdAt: integerOr_(turn.createdAt, null),
    citations: Array.isArray(turn.citations) ? turn.citations : [],
    diagnostics: turn.diagnostics || null
  };
}

function buildHistoryFromThread_(thread, maxPairs, systemMessage) {
  var out = [];
  if (systemMessage) out.push({ role: 'system', content: systemMessage });

  var turns = Array.isArray(thread && thread.turns) ? thread.turns : [];
  var start = Math.max(0, turns.length - Math.max(1, integerOr_(maxPairs, 10)));
  for (var i = start; i < turns.length; i += 1) {
    var turn = turns[i] || {};
    var q = stringOrEmpty_(turn.q).trim();
    var a = stringOrEmpty_(turn.a).trim();
    if (q) out.push({ role: 'user', content: q });
    if (a) out.push({ role: 'assistant', content: a });
  }

  if (out.length > 24) out = out.slice(out.length - 24);
  return out;
}

function threadsKey_(userContext) {
  return 'threads:' + stringOrEmpty_(userContext && userContext.emailHash);
}

function threadKey_(userContext, threadId) {
  return 'thread:' + stringOrEmpty_(userContext && userContext.emailHash) + ':' + stringOrEmpty_(threadId);
}

function appCacheGet_(ASTX, cfg, key) {
  try {
    return ASTX.Cache.get(key, buildCacheOptions_(cfg, cfg.cache.namespace + '_threads'));
  } catch (_e) {
    return null;
  }
}

function appCacheSet_(ASTX, cfg, key, value, ttlSec) {
  try {
    ASTX.Cache.set(key, value, buildCacheOptions_(cfg, cfg.cache.namespace + '_threads', {
      ttlSec: integerOr_(ttlSec, cfg.threads.ttlSec)
    }));
  } catch (_e) {
    // ignore cache write failure in cookbook sample
  }
}

function appCacheDelete_(ASTX, cfg, key) {
  try {
    ASTX.Cache.delete(key, buildCacheOptions_(cfg, cfg.cache.namespace + '_threads'));
  } catch (_e) {
    // ignore cache delete failure in cookbook sample
  }
}
