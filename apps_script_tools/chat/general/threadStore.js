const AST_CHAT_STATE_SCHEMA_VERSION = '1.0';

function astChatCreateEmptyState(userKey) {
  const nowIso = astChatNowIsoString();
  return {
    schemaVersion: AST_CHAT_STATE_SCHEMA_VERSION,
    userKey,
    activeThreadId: null,
    threads: [],
    turnsByThread: {},
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function astChatNormalizeStateRecord(state, userKey) {
  if (!astChatIsPlainObject(state)) {
    return astChatCreateEmptyState(userKey);
  }

  const normalized = astChatCreateEmptyState(userKey);
  normalized.schemaVersion = astChatNormalizeString(state.schemaVersion, AST_CHAT_STATE_SCHEMA_VERSION);
  normalized.createdAt = astChatNormalizeString(state.createdAt, normalized.createdAt);
  normalized.updatedAt = astChatNormalizeString(state.updatedAt, normalized.updatedAt);

  const incomingThreads = Array.isArray(state.threads) ? state.threads : [];
  const turnsByThread = astChatIsPlainObject(state.turnsByThread) ? state.turnsByThread : {};
  const seenThreadIds = {};

  for (let idx = 0; idx < incomingThreads.length; idx += 1) {
    const thread = incomingThreads[idx];
    if (!astChatIsPlainObject(thread)) {
      continue;
    }

    const threadId = astChatNormalizeString(thread.threadId || thread.id, '');
    if (!threadId || seenThreadIds[threadId]) {
      continue;
    }
    seenThreadIds[threadId] = true;

    const threadTurns = Array.isArray(turnsByThread[threadId]) ? turnsByThread[threadId] : [];
    const normalizedTurns = [];

    for (let turnIdx = 0; turnIdx < threadTurns.length; turnIdx += 1) {
      const turn = astChatNormalizeTurnRecord(threadTurns[turnIdx], false);
      if (!turn) {
        continue;
      }
      normalizedTurns.push(turn);
    }

    const createdAt = astChatNormalizeString(thread.createdAt, normalized.createdAt);
    const updatedAt = astChatNormalizeString(thread.updatedAt, createdAt);
    const lastTurnAt = astChatNormalizeString(thread.lastTurnAt, updatedAt);
    const title = astChatNormalizeString(thread.title, `Chat ${normalized.threads.length + 1}`);

    normalized.threads.push({
      threadId,
      title,
      createdAt,
      updatedAt,
      lastTurnAt,
      turnCount: normalizedTurns.length,
      meta: astChatIsPlainObject(thread.meta) ? astChatEnsureSerializable(thread.meta, 'thread.meta') : {}
    });
    normalized.turnsByThread[threadId] = normalizedTurns;
  }

  const activeThreadId = astChatNormalizeString(state.activeThreadId, '');
  normalized.activeThreadId = activeThreadId && seenThreadIds[activeThreadId]
    ? activeThreadId
    : (normalized.threads[0] ? normalized.threads[0].threadId : null);

  return normalized;
}

function astChatNormalizeTurnRecord(turn, required = true) {
  if (!astChatIsPlainObject(turn)) {
    if (required) {
      throw new AstChatValidationError('turn must be an object');
    }
    return null;
  }

  const role = astChatNormalizeString(turn.role, '').toLowerCase();
  if (!['system', 'user', 'assistant', 'tool'].includes(role)) {
    if (required) {
      throw new AstChatValidationError('turn.role must be one of: system, user, assistant, tool');
    }
    return null;
  }

  const content = astChatNormalizeString(turn.content, '');
  if (!content) {
    if (required) {
      throw new AstChatValidationError('turn.content is required');
    }
    return null;
  }

  return {
    turnId: astChatNormalizeString(turn.turnId, astChatGenerateId('turn')),
    role,
    content,
    createdAt: astChatNormalizeString(turn.createdAt, astChatNowIsoString()),
    meta: astChatIsPlainObject(turn.meta) ? astChatEnsureSerializable(turn.meta, 'turn.meta') : {}
  };
}

function astChatApplyThreadLimit(state, limits) {
  const threadMax = limits.threadMax;
  if (!Number.isFinite(threadMax) || threadMax <= 0 || state.threads.length <= threadMax) {
    return;
  }

  while (state.threads.length > threadMax) {
    let removalIndex = -1;

    for (let idx = 0; idx < state.threads.length; idx += 1) {
      if (state.threads[idx].threadId !== state.activeThreadId) {
        removalIndex = idx;
        break;
      }
    }

    if (removalIndex === -1) {
      removalIndex = 0;
    }

    const removed = state.threads.splice(removalIndex, 1)[0];
    if (removed && removed.threadId) {
      delete state.turnsByThread[removed.threadId];
      if (state.activeThreadId === removed.threadId) {
        state.activeThreadId = state.threads[0] ? state.threads[0].threadId : null;
      }
    }
  }
}

function astChatApplyTurnLimit(state, threadId, limits) {
  const turnsMax = limits.turnsMax;
  const turns = Array.isArray(state.turnsByThread[threadId]) ? state.turnsByThread[threadId] : [];

  if (Number.isFinite(turnsMax) && turnsMax > 0 && turns.length > turnsMax) {
    state.turnsByThread[threadId] = turns.slice(turns.length - turnsMax);
  }

  const thread = state.threads.find(item => item.threadId === threadId);
  if (thread) {
    thread.turnCount = state.turnsByThread[threadId].length;
    thread.updatedAt = astChatNowIsoString();
    thread.lastTurnAt = thread.updatedAt;
  }
}

function astChatReadStateForUser(userKey, config) {
  const cache = astChatResolveCacheApi();
  const stateKey = astChatBuildStateKey(userKey, config.keyPrefix);
  const hotOptions = astChatBuildCacheOptions(config.hot);
  const durableOptions = astChatBuildCacheOptions(config.durable);

  const hotState = cache.get(stateKey, hotOptions);
  if (astChatIsPlainObject(hotState)) {
    return astChatNormalizeStateRecord(hotState, userKey);
  }

  const durableState = cache.get(stateKey, durableOptions);
  if (astChatIsPlainObject(durableState)) {
    const normalized = astChatNormalizeStateRecord(durableState, userKey);
    cache.set(stateKey, normalized, Object.assign({}, hotOptions, { ttlSec: config.hot.ttlSec }));
    return normalized;
  }

  return astChatCreateEmptyState(userKey);
}

function astChatWriteStateForUser(userKey, state, config) {
  const cache = astChatResolveCacheApi();
  const stateKey = astChatBuildStateKey(userKey, config.keyPrefix);
  const normalized = astChatNormalizeStateRecord(state, userKey);
  normalized.updatedAt = astChatNowIsoString();

  cache.set(
    stateKey,
    normalized,
    Object.assign({}, astChatBuildCacheOptions(config.durable), { ttlSec: config.durable.ttlSec })
  );
  cache.set(
    stateKey,
    normalized,
    Object.assign({}, astChatBuildCacheOptions(config.hot), { ttlSec: config.hot.ttlSec })
  );

  return normalized;
}

function astChatBuildStateSummary(state) {
  const safe = astChatNormalizeStateRecord(state, state.userKey || 'unknown');
  return {
    schemaVersion: safe.schemaVersion,
    userKey: safe.userKey,
    activeThreadId: safe.activeThreadId,
    threadCount: safe.threads.length,
    threads: safe.threads.map(thread => astChatJsonClone(thread)),
    updatedAt: safe.updatedAt,
    createdAt: safe.createdAt
  };
}

function astChatCreateThreadInState(state, args = {}, config) {
  if (!astChatIsPlainObject(args)) {
    args = {};
  }

  const nowIso = astChatNowIsoString();
  const threadId = astChatNormalizeString(args.threadId, astChatGenerateId('thread'));
  const title = astChatNormalizeString(args.title, `Chat ${state.threads.length + 1}`);

  if (state.threads.some(item => item.threadId === threadId)) {
    throw new AstChatValidationError('threadId already exists', { threadId });
  }

  const thread = {
    threadId,
    title,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastTurnAt: nowIso,
    turnCount: 0,
    meta: astChatIsPlainObject(args.meta) ? astChatEnsureSerializable(args.meta, 'thread.meta') : {}
  };

  state.threads.push(thread);
  state.turnsByThread[threadId] = [];

  const activate = astChatNormalizeBoolean(args.activate, true);
  if (activate || !state.activeThreadId) {
    state.activeThreadId = threadId;
  }

  astChatApplyThreadLimit(state, config.limits);
  state.updatedAt = nowIso;

  const persistedThread = state.threads.find(item => item.threadId === threadId);
  if (!persistedThread) {
    throw new AstChatValidationError('Unable to persist thread because threadMax limit was reached', {
      threadId,
      threadMax: config && config.limits ? config.limits.threadMax : null,
      activeThreadId: state.activeThreadId,
      activate
    });
  }

  return persistedThread;
}

function astChatSwitchThreadInState(state, threadId) {
  const normalizedThreadId = astChatNormalizeString(threadId, '');
  if (!normalizedThreadId) {
    throw new AstChatValidationError('threadId is required');
  }

  const thread = state.threads.find(item => item.threadId === normalizedThreadId);
  if (!thread) {
    throw new AstChatNotFoundError('Thread not found', { threadId: normalizedThreadId });
  }

  thread.updatedAt = astChatNowIsoString();
  state.activeThreadId = normalizedThreadId;
  state.updatedAt = thread.updatedAt;
  return thread;
}

function astChatAppendTurnInState(state, args = {}, config) {
  if (!astChatIsPlainObject(args)) {
    args = {};
  }

  let threadId = astChatNormalizeString(args.threadId, state.activeThreadId || '');
  if (!threadId) {
    const created = astChatCreateThreadInState(state, {
      title: 'New chat',
      activate: true
    }, config);
    threadId = created.threadId;
  }

  const thread = state.threads.find(item => item.threadId === threadId);
  if (!thread) {
    throw new AstChatNotFoundError('Thread not found', { threadId });
  }

  const turn = astChatNormalizeTurnRecord(args.turn, true);
  const turns = Array.isArray(state.turnsByThread[threadId]) ? state.turnsByThread[threadId] : [];
  turns.push(turn);
  state.turnsByThread[threadId] = turns;
  state.activeThreadId = threadId;

  astChatApplyTurnLimit(state, threadId, config.limits);
  state.updatedAt = astChatNowIsoString();

  return {
    thread,
    turn
  };
}

function astChatBuildHistoryFromState(state, args = {}) {
  if (!astChatIsPlainObject(args)) {
    args = {};
  }

  const threadId = astChatNormalizeString(args.threadId, state.activeThreadId || '');
  if (!threadId) {
    return {
      threadId: null,
      history: [],
      turnCount: 0
    };
  }

  const thread = state.threads.find(item => item.threadId === threadId);
  if (!thread) {
    throw new AstChatNotFoundError('Thread not found', { threadId });
  }

  const turns = Array.isArray(state.turnsByThread[threadId]) ? state.turnsByThread[threadId] : [];
  const maxPairs = astChatNormalizePositiveInt(args.maxPairs, 10, 1, 500);
  const maxTurns = maxPairs * 2;
  const includeToolTurns = astChatNormalizeBoolean(args.includeToolTurns, true);
  const includeSystemTurns = astChatNormalizeBoolean(args.includeSystemTurns, true);

  const filtered = turns.filter(turn => {
    if (!includeToolTurns && turn.role === 'tool') {
      return false;
    }
    if (!includeSystemTurns && turn.role === 'system') {
      return false;
    }
    return true;
  });

  const tail = filtered.slice(Math.max(0, filtered.length - maxTurns));
  const history = tail.map(turn => ({
    role: turn.role,
    content: turn.content
  }));

  const systemMessage = astChatNormalizeString(args.systemMessage, '');
  if (systemMessage) {
    history.unshift({
      role: 'system',
      content: systemMessage
    });
  }

  return {
    threadId,
    history,
    turnCount: turns.length
  };
}

function astChatWithMutableState(userContext, storeConfig, mutateFn, options = {}) {
  const userKey = astChatResolveUserKey(userContext);
  const lockContext = astChatRunWithLock(() => {
    const state = astChatReadStateForUser(userKey, storeConfig);
    const output = mutateFn(state, userKey);
    const persisted = astChatWriteStateForUser(userKey, state, storeConfig);
    return {
      output,
      state: persisted
    };
  }, storeConfig.lock, options);

  return {
    lockMode: lockContext.lockMode,
    output: lockContext.value.output,
    state: lockContext.value.state
  };
}
