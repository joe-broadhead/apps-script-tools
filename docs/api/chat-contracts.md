# Chat Contracts

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Namespace surface

```javascript
ASTX.Chat.configure(config, options?)
ASTX.Chat.getConfig()
ASTX.Chat.clearConfig()
ASTX.Chat.ThreadStore.create(config?)
```

## ThreadStore config

```javascript
{
  keyPrefix: 'my_app',
  hot: {
    backend: 'memory',
    namespace: 'my_app_hot',
    ttlSec: 300
  },
  durable: {
    backend: 'drive_json' | 'storage_json' | 'script_properties',
    namespace: 'my_app_threads',
    driveFolderId: 'optional',
    driveFileName: 'optional',
    storageUri: 'optional',
    ttlSec: 86400
  },
  limits: {
    threadMax: 25,
    turnsMax: 200
  },
  lock: {
    lockScope: 'script' | 'user' | 'none',
    lockTimeoutMs: 3000,
    allowLockFallback: true
  }
}
```

## User context contract

All store methods require a user context argument. Accepted forms:

- string user key: `'user-123'`
- object with one of:
  - `userKey`
  - `userId`
  - `email`
  - `sessionId`

If none are provided, the module attempts `Session.getTemporaryActiveUserKey()` when available.

## Turn contract

```javascript
{
  role: 'system' | 'user' | 'assistant' | 'tool',
  content: 'required non-empty string',
  turnId: 'optional',
  createdAt: 'optional ISO timestamp',
  meta: { ...optional JSON object... }
}
```

## Store methods

### `getOrCreateState(userContext)`

Returns summary metadata for user thread state.

### `listThreads(userContext)`

Returns all thread metadata and `activeThreadId`.

### `getThread(userContext, { threadId })`

Returns a single thread and persisted turns.

### `newThread(userContext, args)`

Creates a new thread.

Args:

```javascript
{
  threadId: 'optional',
  title: 'optional',
  activate: true,
  meta: { ...optional JSON object... },
  lockScope: 'optional override',
  lockTimeoutMs: 3000,
  allowLockFallback: true
}
```

### `switchThread(userContext, { threadId, ...lockOptions })`

Sets active thread for the user.

### `appendTurn(userContext, { threadId?, turn, ...lockOptions })`

Appends one turn to the specified thread (or active thread when omitted).

### `buildHistory(userContext, options)`

Builds bounded message history suitable for model calls.

```javascript
{
  threadId: 'optional; defaults to active thread',
  maxPairs: 10,
  includeToolTurns: true,
  includeSystemTurns: true,
  systemMessage: 'optional system instruction prepended to output history'
}
```

### `clearUser(userContext)`

Deletes hot + durable state for that user.

## Lock behavior

Write methods (`newThread`, `switchThread`, `appendTurn`) use lock controls from config or per-call overrides.

- `lockScope='none'`: no lock attempt.
- lock unavailable: operation proceeds with `diagnostics.lockMode='none'`.
- lock acquired: `diagnostics.lockMode='acquired'`.
- lock not acquired:
  - if `allowLockFallback=true`, operation proceeds with `diagnostics.lockMode='degraded'`.
  - else throws `AstChatLockError`.

## Error types

- `AstChatError`
- `AstChatValidationError`
- `AstChatCapabilityError`
- `AstChatNotFoundError`
- `AstChatLockError`

