import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadChatScripts } from './chat-helpers.mjs';

function createPropertiesService(seed = {}) {
  const store = { ...seed };
  const counters = {
    getProperty: 0,
    getProperties: 0,
    setProperty: 0,
    setProperties: 0,
    deleteProperty: 0
  };
  const handle = {
    getProperty: key => {
      counters.getProperty += 1;
      const normalized = String(key || '');
      return Object.prototype.hasOwnProperty.call(store, normalized) ? store[normalized] : null;
    },
    getProperties: () => {
      counters.getProperties += 1;
      return { ...store };
    },
    setProperty: (key, value) => {
      counters.setProperty += 1;
      store[String(key)] = String(value);
    },
    setProperties: (entries, deleteAllOthers) => {
      counters.setProperties += 1;
      if (deleteAllOthers) {
        Object.keys(store).forEach(key => delete store[key]);
      }

      const source = entries && typeof entries === 'object' ? entries : {};
      Object.keys(source).forEach(key => {
        store[String(key)] = String(source[key]);
      });
    },
    deleteProperty: key => {
      counters.deleteProperty += 1;
      delete store[String(key)];
    }
  };

  return {
    service: {
      getScriptProperties: () => handle
    },
    store,
    counters
  };
}

function createChatContext(overrides = {}) {
  const properties = createPropertiesService();
  const context = createGasContext({
    PropertiesService: properties.service,
    ...overrides
  });

  loadChatScripts(context, { includeAst: true });
  return {
    context,
    store: properties.store,
    counters: properties.counters
  };
}

test('AST exposes Chat namespace and ThreadStore factory', () => {
  const { context } = createChatContext();

  assert.equal(typeof context.AST.Chat, 'object');
  assert.equal(typeof context.AST.Chat.configure, 'function');
  assert.equal(typeof context.AST.Chat.getConfig, 'function');
  assert.equal(typeof context.AST.Chat.clearConfig, 'function');
  assert.equal(typeof context.AST.Chat.ThreadStore.create, 'function');
});

test('AST.Chat.configure supports merge=false reset semantics', () => {
  const { context } = createChatContext();

  const first = context.AST.Chat.configure({
    keyPrefix: 'first_prefix',
    durable: {
      backend: 'script_properties',
      namespace: 'first_namespace'
    }
  });
  assert.equal(first.keyPrefix, 'first_prefix');
  assert.equal(first.durable.namespace, 'first_namespace');

  const reset = context.AST.Chat.configure({
    keyPrefix: 'second_prefix'
  }, { merge: false });
  assert.equal(reset.keyPrefix, 'second_prefix');
  assert.notEqual(reset.durable.namespace, 'first_namespace');
});

test('AST.Chat.configure merge=false re-reads script properties after memoized snapshot', () => {
  const { context, store } = createChatContext();

  store.AST_CHAT_THREAD_MAX = '7';
  const first = context.AST.Chat.clearConfig();
  assert.equal(first.limits.threadMax, 7);

  store.AST_CHAT_THREAD_MAX = '11';
  const refreshed = context.AST.Chat.configure({}, { merge: false });
  assert.equal(refreshed.limits.threadMax, 11);
});

test('chat runtime config snapshot memoization invalidates after clearConfig', () => {
  const { context, store, counters } = createChatContext();

  store.AST_CHAT_THREAD_MAX = '9';

  const first = context.AST.Chat.clearConfig();
  const second = context.AST.Chat.getConfig();
  assert.equal(first.limits.threadMax, 9);
  assert.equal(second.limits.threadMax, 9);
  assert.equal(counters.getProperties, 1);

  store.AST_CHAT_THREAD_MAX = '12';
  const stillCached = context.AST.Chat.getConfig();
  assert.equal(stillCached.limits.threadMax, 9);
  assert.equal(counters.getProperties, 1);

  const refreshed = context.AST.Chat.clearConfig();
  assert.equal(refreshed.limits.threadMax, 12);
  assert.equal(counters.getProperties, 2);
});

test('ThreadStore persists user state via durable backend and builds history', () => {
  const { context } = createChatContext();
  const namespace = `chat_local_${Date.now()}`;

  const store = context.AST.Chat.ThreadStore.create({
    keyPrefix: namespace,
    lock: {
      lockScope: 'none'
    },
    hot: {
      backend: 'memory',
      namespace: `${namespace}:hot`,
      ttlSec: 60
    },
    durable: {
      backend: 'script_properties',
      namespace: `${namespace}:durable`,
      ttlSec: 3600
    }
  });

  const user = { userKey: 'user-1' };
  const initial = store.getOrCreateState(user);
  assert.equal(initial.state.threadCount, 0);

  const created = store.newThread(user, {
    title: 'First thread'
  });
  assert.equal(created.thread.title, 'First thread');
  assert.equal(created.activeThreadId, created.threadId);

  const firstTurn = store.appendTurn(user, {
    turn: {
      role: 'user',
      content: 'Hello from user'
    }
  });
  assert.equal(firstTurn.threadId, created.threadId);

  store.appendTurn(user, {
    turn: {
      role: 'assistant',
      content: 'Hello from assistant'
    }
  });

  const history = store.buildHistory(user, {
    maxPairs: 10,
    systemMessage: 'System prompt'
  });
  assert.equal(history.threadId, created.threadId);
  assert.equal(history.history[0].role, 'system');
  assert.equal(history.history[1].role, 'user');
  assert.equal(history.history[2].role, 'assistant');

  const list = store.listThreads(user);
  assert.equal(list.threadCount, 1);
  assert.equal(list.activeThreadId, created.threadId);

  const storeReloaded = context.AST.Chat.ThreadStore.create({
    keyPrefix: namespace,
    lock: {
      lockScope: 'none'
    },
    hot: {
      backend: 'memory',
      namespace: `${namespace}:hot`,
      ttlSec: 60
    },
    durable: {
      backend: 'script_properties',
      namespace: `${namespace}:durable`,
      ttlSec: 3600
    }
  });

  store.clearUser(user);
  const cleared = storeReloaded.getOrCreateState(user);
  assert.equal(cleared.state.threadCount, 0);
});

test('ThreadStore enforces deterministic thread and turn limits', () => {
  const { context } = createChatContext();
  const namespace = `chat_limits_${Date.now()}`;
  const store = context.AST.Chat.ThreadStore.create({
    keyPrefix: namespace,
    lock: {
      lockScope: 'none'
    },
    limits: {
      threadMax: 2,
      turnsMax: 3
    },
    hot: {
      backend: 'memory',
      namespace: `${namespace}:hot`
    },
    durable: {
      backend: 'memory',
      namespace: `${namespace}:durable`
    }
  });

  const user = { userKey: 'user-limits' };
  const t1 = store.newThread(user, { title: 'T1', activate: true });
  const t2 = store.newThread(user, { title: 'T2', activate: true });
  const t3 = store.newThread(user, { title: 'T3', activate: true });

  const threads = store.listThreads(user);
  assert.equal(threads.threadCount, 2);
  assert.equal(threads.threads.some(item => item.threadId === t1.threadId), false);
  assert.equal(threads.threads.some(item => item.threadId === t2.threadId), true);
  assert.equal(threads.threads.some(item => item.threadId === t3.threadId), true);

  for (let idx = 0; idx < 5; idx += 1) {
    store.appendTurn(user, {
      threadId: t3.threadId,
      turn: {
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: `turn-${idx}`
      }
    });
  }

  const thread = store.getThread(user, { threadId: t3.threadId });
  assert.equal(thread.turns.length, 3);
  assert.equal(thread.turns[0].content, 'turn-2');
  assert.equal(thread.turns[2].content, 'turn-4');
});

test('ThreadStore uses degraded lock mode when lock acquisition fails and fallback is allowed', () => {
  const lock = {
    tryLock: () => false,
    releaseLock: () => {}
  };

  const { context } = createChatContext({
    LockService: {
      getScriptLock: () => lock
    }
  });

  const namespace = `chat_lock_fallback_${Date.now()}`;
  const store = context.AST.Chat.ThreadStore.create({
    keyPrefix: namespace,
    lock: {
      lockScope: 'script',
      lockTimeoutMs: 50,
      allowLockFallback: true
    },
    hot: {
      backend: 'memory',
      namespace: `${namespace}:hot`
    },
    durable: {
      backend: 'memory',
      namespace: `${namespace}:durable`
    }
  });

  const result = store.newThread({ userKey: 'lock-user' }, {
    title: 'Fallback thread'
  });
  assert.equal(result.diagnostics.lockMode, 'degraded');
});

test('ThreadStore lock path handles null args without raw TypeError', () => {
  const { context } = createChatContext();
  const namespace = `chat_null_args_${Date.now()}`;
  const store = context.AST.Chat.ThreadStore.create({
    keyPrefix: namespace,
    lock: {
      lockScope: 'none'
    },
    hot: {
      backend: 'memory',
      namespace: `${namespace}:hot`
    },
    durable: {
      backend: 'memory',
      namespace: `${namespace}:durable`
    }
  });

  const user = { userKey: 'null-args-user' };
  const created = store.newThread(user, null);
  assert.ok(created.threadId);

  assert.throws(
    () => store.switchThread(user, null),
    /AstChatValidationError|threadId is required/
  );

  assert.throws(
    () => store.appendTurn(user, null),
    /AstChatValidationError|turn\.role must be one of|turn must be an object/
  );
});

test('ThreadStore throws AstChatLockError when lock acquisition fails and fallback is disabled', () => {
  const lock = {
    tryLock: () => false,
    releaseLock: () => {}
  };

  const { context } = createChatContext({
    LockService: {
      getScriptLock: () => lock
    }
  });

  const namespace = `chat_lock_strict_${Date.now()}`;
  const store = context.AST.Chat.ThreadStore.create({
    keyPrefix: namespace,
    lock: {
      lockScope: 'script',
      lockTimeoutMs: 50,
      allowLockFallback: false
    },
    hot: {
      backend: 'memory',
      namespace: `${namespace}:hot`
    },
    durable: {
      backend: 'script_properties',
      namespace: `${namespace}:durable`
    }
  });

  assert.throws(
    () => store.newThread({ userKey: 'lock-user' }, { title: 'Strict thread' }),
    /AstChatLockError|Unable to acquire chat lock/
  );
});

test('ThreadStore newThread does not return evicted thread IDs', () => {
  const { context } = createChatContext();
  const namespace = `chat_thread_eviction_${Date.now()}`;
  const store = context.AST.Chat.ThreadStore.create({
    keyPrefix: namespace,
    lock: {
      lockScope: 'none'
    },
    limits: {
      threadMax: 1,
      turnsMax: 10
    },
    hot: {
      backend: 'memory',
      namespace: `${namespace}:hot`
    },
    durable: {
      backend: 'memory',
      namespace: `${namespace}:durable`
    }
  });

  const user = { userKey: 'evict-user' };
  const active = store.newThread(user, { title: 'active', activate: true });
  assert.ok(active.threadId);

  assert.throws(
    () => store.newThread(user, { title: 'inactive', activate: false }),
    /AstChatValidationError|Unable to persist thread because threadMax limit was reached/
  );

  const listed = store.listThreads(user);
  assert.equal(listed.threadCount, 1);
  assert.equal(listed.threads[0].threadId, active.threadId);
});
