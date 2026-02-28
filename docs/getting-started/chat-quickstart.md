# Chat Quick Start

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure runtime defaults

```javascript
function configureChatRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Chat.configure({
    CHAT_STORE_BACKEND: 'script_properties',
    CHAT_MAX_THREADS: 20,
    CHAT_MAX_TURNS_PER_THREAD: 40
  });
}
```

## Create a thread store and append turns

```javascript
function chatStoreExample(userId) {
  const ASTX = ASTLib.AST || ASTLib;
  const store = ASTX.Chat.ThreadStore.create();
  const userContext = { userId: userId };

  const thread = store.newThread(userContext, { title: 'Project QA' });

  store.appendTurn(userContext, {
    threadId: thread.threadId,
    turn: {
      role: 'user',
      content: 'Summarize the rollout risks.'
    }
  });

  store.appendTurn(userContext, {
    threadId: thread.threadId,
    turn: {
      role: 'assistant',
      content: 'Top risks are inventory lag and cutover timing.'
    }
  });

  Logger.log(JSON.stringify(store.buildHistory(userContext, { threadId: thread.threadId })));
}
```

## Switch threads and list state

```javascript
function chatListThreadsExample(userId) {
  const ASTX = ASTLib.AST || ASTLib;
  const store = ASTX.Chat.ThreadStore.create();

  const threads = store.listThreads({ userId: userId });
  Logger.log(JSON.stringify(threads));
}
```

## Notes

- Chat state is per-user and bounded by configured thread/turn limits.
- For large-scale apps, pair Chat with `AST.Cache` + `AST.Storage` for externalized payloads.
- Keep assistant/tool payloads concise in thread history to reduce script-properties pressure.
