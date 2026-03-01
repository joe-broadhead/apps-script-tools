# API Tools

## Import pattern

In consumer scripts, normalize the namespace once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## `ASTX.Series`

Use `Series` for one-dimensional transforms and aggregations.

Key capabilities:

- Element-wise transforms: `apply`, arithmetic methods, comparisons.
- Filtering: `filter`, `query`, `where`, `mask`.
- Missing-data handling: `dropNulls`, `fillNulls`, `replace`.
- Aggregation and interpolation: `agg`, `interpolate`.
- Index/delta helpers: `sortIndex`, `reindex`, `align`, `shift`, `diff`, `pctChange`.
- Stats/selectors: `sum`, `mean`, `median`, `mode`, `std`, `var`, `quantile`, `idxMax`, `idxMin`, `cummax`, `cummin`, `cumproduct`.
- Conversion: `toFrame`.
- String/date namespaces: `series.str.*`, `series.dt.*`.

Important contract:

- `query` accepts function predicates only.
- string evaluation is intentionally not supported.

```javascript
const s = ASTX.Series.fromArray([1, 2, 3, 4, 5], 'numbers');
const odd = s.query((_series, value) => value % 2 === 1);
```

Complexity notes:

- arithmetic/boolean transforms are linear in series length (`O(n)`).
- `query` and `filter` are linear scans (`O(n)`).

## `ASTX.DataFrame`

`DataFrame` is the primary tabular abstraction.

Compatibility status for pandas-inspired APIs is tracked in [Pandas Compatibility Matrix](pandas-compatibility-matrix.md).

Creation:

- `fromRecords(records)`
- `fromColumns(columns, options)`
- `fromArrays(arrays, options)`
- `fromSheet(sheet, headerRow)`
- `fromQuery(request)`

Transform:

- shape/selection: `head`, `tail`, `take`, `sample`, `copy`, `select`, `selectExpr`, `selectExprDsl`.
- missing/conditional: `dropNulls`, `fillNulls`, `replace`, `where`, `mask`.
- null masks and duplicate profiles: `isNull`/`isNa`, `notNull`/`notNa`, `duplicated`, `nunique`, `valueCounts`.
- index/alignment: `setIndex`, `sortIndex`, `reindex`.
- transformation: `assign`, `apply`, `applyMap`, `transform`, `sort`, `shift`, `diff`, `pctChange`.
- aggregation: `agg`.
- relational/reshape: `merge`, `join`, `melt`, `explode`, `pivot`, `pivotTable`, `groupBy`, `window`.
- selectors/stats: `quantile`, `describe`, `nlargest`, `nsmallest`.
- `dropDuplicates(subset = [])` with explicit subset semantics.

Output:

- `toColumns(options)`
- `toRecords`, `toArrays`, `toJson`, `toMarkdown`, `toSheet`, `toTable`.
- schema contracts:
  - `DataFrame.validateSchema(dataFrame, schema, options)` / `df.validateSchema(schema, options)`
  - `DataFrame.enforceSchema(dataFrame, schema, options)` / `df.enforceSchema(schema, options)`

```javascript
const df = ASTX.DataFrame.fromColumns({
  id: [1, 2],
  amount: [10, 20]
});

const out = df.assign({ amount_x2: frame => frame.amount.multiply(2) });
```

```javascript
const df = ASTX.DataFrame.fromColumns({
  id: [1, 2, 3],
  amount: [10, 25, 40]
});

const withDelta = df.pctChange(1, { columns: ['amount'] });
const topRows = df.nlargest(5, ['amount']);
const summary = df.describe({ columns: ['amount'] });
```

Window and expression projection examples:

```javascript
const projected = df.selectExpr({
  id: 'id',
  amount_x2: row => row.amount * 2
});

const withWindows = df
  .window({
    partitionBy: ['region'],
    orderBy: [{ column: 'event_ts', ascending: true }]
  })
  .assign({
    row_number: w => w.rowNumber(),
    amount_lag_1: w => w.col('amount').lag(1),
    amount_running_sum: w => w.col('amount').running('sum')
  });
```

High-signal behavior:

- key comparisons normalize `null`, `undefined`, and missing values to the same key state.
- object/date subset keys are compared canonically by value.

Complexity guidance:

- `sort`: `O(n log n)`
- `dropDuplicates`: `O(n * k)` where `k` is subset key count
- hash-join style `merge` is approximately `O(n + m + matches)`

Schema contract example:

```javascript
const schema = {
  id: { type: 'integer', nullable: false },
  amount: { type: 'float', nullable: true }
};

const report = df.validateSchema(schema, { allowExtraColumns: false });
if (!report.valid) {
  Logger.log(report.violations);
}

const enforced = df.enforceSchema(schema, {
  coerce: true,
  dropExtraColumns: false,
  strict: true
});
```

## `ASTX.GroupBy`

Create grouped workflows from `DataFrame.groupBy(keys)`.

- `agg(mapping)` supports named aggregators or custom functions.
- `apply(fn)` runs per-group transforms and concatenates output.

```javascript
const grouped = df.groupBy(['region']).agg({ amount: ['sum', 'mean'] });
```

## Global structure classes

These classes are available globally when the library is loaded and are useful in downstream script logic:

- `Queue`, `Deque`, `Stack`
- `PriorityQueue`, `LinkedList`
- `Graph`
- `Trie`, `TernarySearchTree`, `BinarySearchTree`
- `DisjointSet`
- `LruCache`

High-signal behavior:

- `Queue` and `Deque` use non-shift internals for stable performance under high churn.
- `PriorityQueue` uses a binary heap with stable ordering for equal priorities.
- `Graph` de-duplicates edges and safely handles missing BFS start vertices.
- `Trie.endsWith(...)` is value-correct for suffix checks.
- `DisjointSet` provides union-find with path compression + union by rank.
- `LruCache` provides deterministic least-recently-used eviction.

## `ASTX.Sql`

SQL runtime surface with direct execution, prepared execution, and provider execution control.

Primary methods:

- `ASTX.Sql.run(request)`
- `ASTX.Sql.prepare(request)`
- `ASTX.Sql.executePrepared(request)`
- `ASTX.Sql.status(request)`
- `ASTX.Sql.cancel(request)`
- `ASTX.Sql.providers()`
- `ASTX.Sql.capabilities(provider)`

High-signal behavior:

- providers: `databricks`, `bigquery`.
- `run(...)` validates provider/sql/parameters/placeholders/options shape.
- unsafe placeholder interpolation is disabled by default for `run(...)`.
- `prepare(...)` compiles `{{param}}` template placeholders and returns a runtime `statementId`.
- `executePrepared(...)` safely serializes typed params and returns `{ dataFrame, execution }`.
- `status(...)` and `cancel(...)` call provider-specific execution-control helpers.

See [SQL Contracts](sql-contracts.md) for provider-specific request details.

## `ASTX.Http`

Shared HTTP execution surface for retries, timeout budgets, and typed transport errors.

Primary methods:

- `ASTX.Http.request(request)` for single-request execution.
- `ASTX.Http.requestBatch(request)` for batch execution with per-item success/error envelopes.
- `ASTX.Http.capabilities(operation)` for runtime contract inspection.
- `ASTX.Http.configure(config)` / `ASTX.Http.getConfig()` / `ASTX.Http.clearConfig()`.

High-signal behavior:

- config precedence: request options -> runtime `configure(...)` -> script properties.
- transient retries apply to `429` and `5xx` statuses by default.
- deterministic timeout budget semantics via `options.timeoutMs`.
- response envelope always includes `source`, `output`, and `usage`.

```javascript
const out = ASTX.Http.request({
  url: 'https://api.example.com/v1/health',
  method: 'GET',
  options: {
    retries: 2,
    timeoutMs: 15000
  }
});

Logger.log(out.output.statusCode);
```

## `ASTX.Sheets` and `ASTX.Drive`

Workspace interoperability surfaces:

- `ASTX.Sheets.openById`, `ASTX.Sheets.openByUrl`
- `ASTX.Drive.read`, `ASTX.Drive.create`

## `ASTX.Cache`

General-purpose cache layer for repeated API results and computed artifacts.

Backends:

- `memory`
- `drive_json`
- `script_properties`
- `storage_json` (persists via `AST.Storage` URI: `gcs://`, `s3://`, `dbfs:/`)

Production recommendation:

- use `storage_json` for shared multi-user app traffic.
- use `memory` for per-execution memoization only.
- avoid `drive_json` and `script_properties` for high-concurrency hot paths.

Primary methods:

- `ASTX.Cache.get(key, options)`
- `ASTX.Cache.set(key, value, options)`
- `ASTX.Cache.getMany(keys, options)`
- `ASTX.Cache.setMany(entries, options)`
- `ASTX.Cache.fetch(key, resolver, options)`
- `ASTX.Cache.fetchMany(keys, resolver, options)`
- `ASTX.Cache.delete(key, options)`
- `ASTX.Cache.deleteMany(keys, options)`
- `ASTX.Cache.invalidateByTag(tag, options)`
- `ASTX.Cache.stats(options)`
- `ASTX.Cache.backends()` and `ASTX.Cache.capabilities(backend)`
- `ASTX.Cache.configure(config)` / `ASTX.Cache.getConfig()` / `ASTX.Cache.clearConfig()`
- `ASTX.Cache.clear(options)` to clear all entries in a namespace/backend

High-signal behavior:

- config precedence is per-call options, then runtime `configure(...)`, then script properties.
- deterministic TTL semantics via `ttlSec`.
- tags are normalized and de-duplicated for invalidation workflows.
- `stats()` returns backend/namespace entry counts and hit/miss counters.

```javascript
ASTX.Cache.configure({
  backend: 'memory',
  namespace: 'my_project',
  defaultTtlSec: 300
});

ASTX.Cache.set('rag:query:abc', { chunks: [1, 2, 3] }, {
  ttlSec: 120,
  tags: ['rag', 'search']
});

const cached = ASTX.Cache.get('rag:query:abc');

const batch = ASTX.Cache.getMany(['rag:query:abc', 'rag:query:def']);
const refreshed = ASTX.Cache.fetchMany(['rag:query:def', 'rag:query:xyz'], payload => {
  return { chunks: [], key: payload.requestedKey };
});

// default: failFast=false (per-key errors returned in items with status='error')
const resilient = ASTX.Cache.fetchMany(['a', 'b'], payload => {
  if (payload.requestedKey === 'b') throw new Error('upstream failed');
  return { ok: true };
});

// optional failFast=true for strict all-or-nothing semantics
const strict = ASTX.Cache.fetchMany(['a', 'b'], resolverFn, { failFast: true });
```

`storage_json` example:

```javascript
ASTX.Cache.configure({
  backend: 'storage_json',
  namespace: 'my_project',
  storageUri: 's3://my-bucket/cache/ast-cache.json'
});
```

## `ASTX.RAG` retrieval modes

`ASTX.RAG.search(...)` and `ASTX.RAG.answer(...)` both support:

- `retrieval.mode = 'vector'` (default cosine-only ranking)
- `retrieval.mode = 'hybrid'` (weighted vector + lexical fusion)
- `retrieval.mode = 'lexical'` (BM25-only ranking; no embedding call)
- `retrieval.lexicalPrefilterTopN` for optional lexical shortlist before vector scoring
- `retrieval.rerank` for optional top-N reranking
- `retrieval.access` for source-level allow/deny constraints
- `generation.maxContextChars` / `generation.maxContextTokensApprox` for bounded grounding context packing
- optional request/runtime cache controls (`cache.enabled`, backend overrides, TTLs)

```javascript
const answer = ASTX.RAG.answer({
  indexFileId: 'YOUR_INDEX_FILE_ID',
  question: 'What are the top project risks?',
  retrieval: {
    mode: 'hybrid',
    topK: 8,
    minScore: 0.2,
    vectorWeight: 0.6,
    lexicalWeight: 0.4,
    lexicalPrefilterTopN: 100,
    rerank: { enabled: true, topN: 12 },
    access: {
      allowedFileIds: ['file_public_1', 'file_public_2'],
      deniedFileIds: ['file_sensitive_1']
    }
  },
  generation: { provider: 'vertex_gemini' },
  options: { enforceAccessControl: true },
  cache: {
    enabled: true,
    backend: 'storage_json',
    namespace: 'rag_prod',
    storageUri: 's3://my-bucket/ast-cache',
    embeddingTtlSec: 900,
    answerTtlSec: 180
  }
});
```

## `ASTX.Storage`

Cross-provider object storage surface:

- providers: `gcs`, `s3`, `dbfs`
- operations: `list`, `head`, `read`, `write`, `delete`, `exists`, `copy`, `move`, `signed_url`, `multipart_write`
- URI model: `gcs://`, `s3://`, `dbfs:/`

Primary methods:

- `ASTX.Storage.run(request)` for explicit operation routing.
- `ASTX.Storage.list/head/read/write/delete(request)` convenience wrappers.
- `ASTX.Storage.exists/copy/move/signedUrl/multipartWrite(request)` advanced object lifecycle wrappers.
- `ASTX.Storage.walk/copyPrefix/deletePrefix/sync(request)` bulk prefix operations with dry-run and progress summaries.
- `ASTX.Storage.providers()` and `ASTX.Storage.capabilities(provider)` for runtime checks.
- `ASTX.Storage.configure(config)` to set runtime defaults from script properties.
- `ASTX.Storage.getConfig()` and `ASTX.Storage.clearConfig()` for runtime config inspection/reset.

High-signal behavior:

- auth/config resolution: per-call override first, then `ASTX.Storage.configure(...)`, then script properties.
- write payload contract is base64-first with `text/json` helper inputs.
- `head/read/delete` missing objects throw `AstStorageNotFoundError`.
- `exists` returns `output.exists.exists=false` for missing objects.
- `copy/move` require same-provider `fromUri` and `toUri` in this release.
- `signedUrl` is supported for `gcs` and `s3`; DBFS reports typed capability error.
- transport retries apply to transient HTTP statuses (`429`, `5xx`) only.

```javascript
const out = ASTX.Storage.read({
  uri: 'gcs://my-bucket/data/config.json'
});

Logger.log(out.output.data.json || out.output.data.text);
```

## `ASTX.Secrets`

Secrets surface for secure runtime secret resolution.

Providers:

- `script_properties` (`get/set/delete`)
- `secret_manager` (`get`)

Primary methods:

- `ASTX.Secrets.get(request)`
- `ASTX.Secrets.set(request)`
- `ASTX.Secrets.delete(request)`
- `ASTX.Secrets.resolveValue(value, options)` for `secret://...` references
- `ASTX.Secrets.providers()` / `ASTX.Secrets.capabilities(provider)`
- `ASTX.Secrets.configure(config)` / `ASTX.Secrets.getConfig()` / `ASTX.Secrets.clearConfig()`

High-signal behavior:

- deterministic config precedence: request > runtime configure > script properties.
- `secret_manager` uses OAuth token (`request.auth.oauthToken` or `ScriptApp.getOAuthToken()`).
- typed not-found/auth/provider errors.
- no secret values emitted in telemetry events.

```javascript
ASTX.Secrets.configure({
  AST_SECRETS_PROVIDER: 'script_properties',
  SECRET_MANAGER_PROJECT_ID: 'my-project-id'
});

const apiKey = ASTX.Secrets.resolveValue('secret://script_properties/OPENAI_API_KEY_RAW');

const token = ASTX.Secrets.get({
  provider: 'secret_manager',
  key: 'my-api-token',
  auth: { projectId: 'my-project-id' }
});
```

See:

- [Storage Contracts](storage-contracts.md)
- [Storage Providers](storage-providers.md)
- [Storage Security](../operations/storage-security.md)

## `ASTX.Config`

Script property extraction helpers for deterministic runtime bootstrap.

Primary methods:

- `ASTX.Config.fromScriptProperties(options)` to read and normalize script properties.
- `ASTX.Config.schema(definition)` to compile typed config schemas.
- `ASTX.Config.bind(definitionOrSchema, options)` to bind typed values with precedence.

High-signal behavior:

- values are normalized to trimmed strings.
- supports `keys` filtering and prefix filtering (`prefix`, `stripPrefix`).
- accepts explicit handle injection via `scriptProperties: PropertiesService.getScriptProperties()`.
- default implicit-handle reads are fresh (no shared memoized snapshot). Set `cacheDefaultHandle: true` to opt into implicit-handle memoization.
- gracefully returns `{}` when script properties are unavailable.
- bind precedence defaults to `request > runtime > script_properties`.

```javascript
const props = ASTX.Config.fromScriptProperties({
  scriptProperties: PropertiesService.getScriptProperties(),
  prefix: 'OPENAI_',
  stripPrefix: true
});

const schema = ASTX.Config.schema({
  GITHUB_TIMEOUT_MS: { type: 'int', min: 1000, default: 45000 },
  GITHUB_CACHE_ENABLED: { type: 'bool', default: false }
});

const cfg = ASTX.Config.bind(schema, {
  request: { GITHUB_TIMEOUT_MS: 20000 },
  runtime: {},
  scriptProperties: PropertiesService.getScriptProperties()
});
```

See:

- [Config Contracts](config-contracts.md)

## `ASTX.Runtime`

One-shot runtime configuration hydration across module namespaces.

Primary methods:

- `ASTX.Runtime.configureFromProps(options)` to apply script properties to module `configure(...)` hooks.
- `ASTX.Runtime.modules()` to list supported runtime-configurable module names.

High-signal behavior:

- default target modules: `AI`, `RAG`, `DBT`, `Cache`, `Storage`, `Secrets`, `Telemetry`, `Jobs`, `Triggers`, `GitHub`.
- configuration merge policy is controlled by `options.merge` (default `true`).
- supports scoped application with `options.modules` (for example `['AI', 'RAG']`).
- forwards `scriptProperties`/`keys`/`prefix`/`stripPrefix` and config snapshot controls (`disableCache`, `forceRefresh`, `cacheScopeId`, `cacheDefaultHandle`) to `AST.Config.fromScriptProperties(...)`.

```javascript
const summary = ASTX.Runtime.configureFromProps({
  modules: ['AI', 'RAG', 'Storage'],
  scriptProperties: PropertiesService.getScriptProperties()
});

Logger.log(summary.configuredModules);
```

## `ASTX.Telemetry`

Observability foundation for request traces and operational diagnostics.

Primary methods:

- `ASTX.Telemetry.configure(config, options)` to set runtime telemetry defaults.
- `ASTX.Telemetry.getConfig()` to inspect current runtime telemetry config.
- `ASTX.Telemetry.clearConfig()` to reset runtime telemetry config.
- `ASTX.Telemetry.startSpan(name, context)` to begin a trace span.
- `ASTX.Telemetry.endSpan(spanId, result)` to close span state and persist sink output.
- `ASTX.Telemetry.recordEvent(event)` to append structured event records.
- `ASTX.Telemetry.getTrace(traceId)` to retrieve in-memory trace state.
- `ASTX.Telemetry.flush(options)` to force buffered sink flushes (used by `drive_json` and `storage_json` manual mode).
- `ASTX.Telemetry.query(request)` to filter/paginate normalized span and event records.
- `ASTX.Telemetry.aggregate(request)` to compute grouped counts, error-rate, and p50/p95 latency metrics.
- `ASTX.Telemetry.export(request)` to export query output as `json`, `ndjson`, or `csv` (inline, Drive, or Storage).

Sink support:

- `logger` (default) emits JSON payloads to Apps Script `Logger`.
- `drive_json` writes partitioned NDJSON batch files in Drive (`events/YYYY/MM/DD[/HH]`).
- `storage_json` writes NDJSON batch files to `gcs://`, `s3://`, or `dbfs:/` via `AST.Storage`.

High-signal behavior:

- `configure(...)` supports `sink`, redaction/sampling, drive settings, storage sink settings (`storageUri`, `flushMode`, `batchMaxEvents`, `batchMaxBytes`, retries/timeouts), and trace limits.
- sensitive keys and token-like values are redacted by default.
- telemetry calls should never block functional execution paths.
- span IDs and trace IDs are generated if not supplied.
- query/aggregate operates on the in-memory telemetry store (already redacted records).

```javascript
const traceSpan = ASTX.Telemetry.startSpan('demo.operation', {
  requestId: 'req_123'
});

try {
  const value = ASTX.Utils.arraySum([1, 2, 3, 4]);
  ASTX.Telemetry.endSpan(traceSpan, {
    status: 'ok',
    result: { value }
  });
} catch (error) {
  ASTX.Telemetry.endSpan(traceSpan, {
    status: 'error',
    error
  });
  throw error;
}
```

See:

- [Telemetry Contracts](telemetry-contracts.md)
- [Telemetry Operations](../operations/telemetry.md)

## `ASTX.TelemetryHelpers`

Safe wrappers around span/event operations for app-level workflows.

Primary methods:

- `ASTX.TelemetryHelpers.startSpanSafe(name, context, options)`
- `ASTX.TelemetryHelpers.endSpanSafe(spanId, result, options)`
- `ASTX.TelemetryHelpers.recordEventSafe(event, options)`
- `ASTX.TelemetryHelpers.withSpan(name, context, task, options)`
- `ASTX.TelemetryHelpers.wrap(name, task, options)`

High-signal behavior:

- never throws from telemetry API failures.
- `withSpan(...)` always attempts to close the span on both success and error.
- task errors are re-thrown after telemetry finalization.

```javascript
const sum = ASTX.TelemetryHelpers.withSpan(
  'app.compute.sum',
  { requestId: 'req_1' },
  () => ASTX.Utils.arraySum([1, 2, 3, 4]),
  { includeResult: true }
);
```

## `ASTX.Jobs`

Checkpointed job orchestration for multi-step workflows that need retry and resume semantics.

Primary methods:

- `ASTX.Jobs.run(request)` to enqueue and execute immediately until completion/pause/failure.
- `ASTX.Jobs.enqueue(request)` to persist a queued job without executing it.
- `ASTX.Jobs.chain(request)` to compile sequential tasks into one checkpointed job.
- `ASTX.Jobs.enqueueMany(request)` to fan out one handler over `items[]` with bounded dependency width.
- `ASTX.Jobs.mapReduce(request)` to run bounded map fan-out plus one reduce step.
- `ASTX.Jobs.resume(jobId, options)` to continue a queued/paused job from checkpoint.
- `ASTX.Jobs.status(jobId, options)` to fetch a single persisted job record.
- `ASTX.Jobs.list(filters, options)` to list persisted job records.
- `ASTX.Jobs.cancel(jobId, options)` to cancel a queued/paused job.
- `ASTX.Jobs.configure(config, options)` / `ASTX.Jobs.getConfig()` / `ASTX.Jobs.clearConfig()`.

High-signal behavior:

- steps require unique `id`, `handler`, and optional `dependsOn`.
- handlers must be globally resolvable named functions in Apps Script runtime.
- async step handlers are not supported; handlers must return JSON-serializable outputs.
- checkpoints are persisted in script properties with configurable key prefix.
- retries are bounded by `maxRetries`; jobs pause on retryable step failure.
- orchestration helpers return `result.orchestration` with parent/child/stage status aggregation.
- currently supported checkpoint store is `properties`.

```javascript
const queued = ASTX.Jobs.enqueue({
  name: 'daily_reconciliation',
  steps: [
    { id: 'extract', handler: 'extractStep' },
    { id: 'transform', handler: 'transformStep', dependsOn: ['extract'] },
    { id: 'publish', handler: 'publishStep', dependsOn: ['transform'] }
  ],
  options: {
    maxRetries: 2,
    maxRuntimeMs: 240000,
    propertyPrefix: 'AST_JOBS_JOB_'
  }
});

const resumed = ASTX.Jobs.resume(queued.id);
Logger.log(resumed.status);
```

See:

- [Jobs Contracts](jobs-contracts.md)

## `ASTX.Triggers`

Declarative lifecycle for time-based Apps Script triggers with idempotent upsert behavior.

Primary methods:

- `ASTX.Triggers.upsert(request)` to create/update a trigger definition and backing ScriptApp trigger.
- `ASTX.Triggers.list(request)` to enumerate registered definitions.
- `ASTX.Triggers.delete(request)` to remove one or all definitions and backing triggers.
- `ASTX.Triggers.runNow(request)` to execute a definition immediately (manual dispatch path).
- `ASTX.Triggers.run(request)` for explicit operation routing.
- `ASTX.Triggers.configure(config, options)` / `ASTX.Triggers.getConfig()` / `ASTX.Triggers.clearConfig()`.

High-signal behavior:

- idempotent `upsert`: unchanged schedule + dispatch does not recreate trigger state.
- supports time-based schedules:
  - `every_minutes`
  - `every_hours`
  - `every_days`
  - `every_weeks`
- dispatch modes:
  - `direct`: call a named global handler synchronously.
  - `jobs`: enqueue into `ASTX.Jobs` (optionally auto-resume).
- `options.dryRun=true` supports planning/validation without creating or deleting project triggers.
- trigger dispatch handler defaults to `astTriggersDispatch`, which resolves definitions by `event.triggerUid`.

```javascript
ASTX.Triggers.upsert({
  id: 'daily_sync',
  schedule: {
    type: 'every_days',
    every: 1,
    atHour: 5
  },
  dispatch: {
    mode: 'jobs',
    autoResumeJobs: true,
    job: {
      name: 'daily-sync-job',
      steps: [
        { id: 'step_one', handler: 'runDailySyncStep' }
      ]
    }
  }
});
```

## `ASTX.Chat`

Durable chat-state module for user-scoped thread persistence, turn appends, and history building.

Primary methods:

- `ASTX.Chat.configure(config, options)` / `ASTX.Chat.getConfig()` / `ASTX.Chat.clearConfig()`.
- `ASTX.Chat.ThreadStore.create(config)` to create a store instance with resolved runtime config.

Store instance methods:

- `getOrCreateState(userContext)` initialize or fetch per-user state.
- `listThreads(userContext)` list thread metadata for a user.
- `getThread(userContext, { threadId })` fetch a single thread and persisted turns.
- `newThread(userContext, args)` create thread metadata.
- `switchThread(userContext, { threadId })` change active thread.
- `appendTurn(userContext, { threadId?, turn })` append a turn and enforce caps.
- `buildHistory(userContext, options)` build bounded chat history for model calls.
- `clearUser(userContext)` remove cached + durable state for a user key.

High-signal behavior:

- state is isolated by normalized user key and persisted via cache backend configuration.
- defaults use hot `memory` cache + durable `drive_json` store.
- durable backend can be switched to `storage_json` (for `gcs://`, `s3://`, `dbfs:/`) or `script_properties`.
- lock-aware writes support explicit degraded mode when `allowLockFallback=true`.
- deterministic limits enforce `threadMax` and `turnsMax`.

```javascript
const store = ASTX.Chat.ThreadStore.create({
  keyPrefix: 'my_app',
  durable: {
    backend: 'drive_json',
    namespace: 'my_app_threads',
    driveFolderId: 'FOLDER_ID',
    driveFileName: 'threads.json'
  },
  limits: {
    threadMax: 25,
    turnsMax: 200
  }
});

const user = { userKey: 'user-123' };
const created = store.newThread(user, { title: 'New chat' });
store.appendTurn(user, {
  threadId: created.threadId,
  turn: { role: 'user', content: 'Summarize open blockers.' }
});

const history = store.buildHistory(user, {
  threadId: created.threadId,
  maxPairs: 10,
  systemMessage: 'You are a project assistant.'
});
```

## `ASTX.Messaging`

Google Email + Google Chat/Slack/Teams automation with tracking, dry-run planning, idempotency, and durable delivery logs.

Primary methods:

- `ASTX.Messaging.run(request)` for operation-routed execution.
- `ASTX.Messaging.email.*` for send, draft, search, thread/message, and label-update flows.
- `ASTX.Messaging.chat.*` for Google Chat, Slack, and Teams sends plus Google Chat API message reads.
- `ASTX.Messaging.tracking.*` for pixel URL generation, link wrapping, event recording, and web event handling.
- `ASTX.Messaging.logs.*` for delivery/event log list/get/delete flows.
- `ASTX.Messaging.operations()` and `ASTX.Messaging.capabilities(...)` for runtime discovery.
- `ASTX.Messaging.configure(config)` / `ASTX.Messaging.getConfig()` / `ASTX.Messaging.clearConfig()`.

High-signal behavior:

- email transport is GmailApp-first.
- chat transport supports `chat_webhook`, `chat_api`, `slack_webhook`, `slack_api`, and `teams_webhook`.
- tracking open/click instrumentation is opt-in.
- mutation operations support `options.dryRun=true` and return `dryRun.plannedRequest`.
- mutation sends support idempotent replay for retry-safe workflows.
- sync execution is default; optional async enqueue via `ASTX.Jobs`.
- durable log backend defaults to `drive_json` and can be switched to `storage_json`, `script_properties`, or `memory`.

```javascript
const out = ASTX.Messaging.email.send({
  body: {
    to: ['user@example.com'],
    subject: 'Status {{date}}',
    htmlBody: '<p>Run complete</p><a href=\"https://example.com\">Details</a>',
    template: { params: { date: '2026-03-01' } },
    options: {
      track: { enabled: true, open: true, click: true }
    }
  }
});

Logger.log(JSON.stringify(out.tracking, null, 2));
```

## `ASTX.GitHub`

GitHub API automation surface with REST + GraphQL support, typed errors, dry-run mutation planning, and optional cache/ETag revalidation.

Primary methods:

- `ASTX.GitHub.run(request)` for operation-routed REST execution.
- `ASTX.GitHub.graphql(request)` for explicit GraphQL queries/mutations.
- `ASTX.GitHub.authAsApp(request)` for GitHub App installation token exchange.
- `ASTX.GitHub.verifyWebhook(request)` and `ASTX.GitHub.parseWebhook(request)` for webhook integrity + normalized event parsing.
- Helper methods for repository, branch, commit, file, issue, pull request, release/tag, Actions workflow/run/artifact, and search flows.
- `ASTX.GitHub.operations()` and `ASTX.GitHub.capabilities(...)` for runtime discovery.
- `ASTX.GitHub.configure(config)` / `ASTX.GitHub.getConfig()` / `ASTX.GitHub.clearConfig()`.

High-signal behavior:

- auth precedence is request -> runtime `configure(...)` -> script properties.
- mutation operations support `options.dryRun=true` and return `dryRun.plannedRequest`.
- read operations can use cache + ETag revalidation when cache is enabled.
- retries are bounded to transient statuses (`429`, `502`, `503`, `504`) and secondary-rate-limit `403`.
- response includes normalized rate-limit metadata from GitHub headers.
- supports `secret://...` auth values via `AST.Secrets.resolveValue(...)` when `AST.Secrets` is available.

```javascript
const repo = ASTX.GitHub.getRepository({
  owner: 'octocat',
  repo: 'hello-world'
});

Logger.log(repo.data.full_name);
Logger.log(repo.rateLimit.remaining);
```

```javascript
const planned = ASTX.GitHub.createPullRequest({
  owner: 'octocat',
  repo: 'hello-world',
  body: {
    title: 'feature: add github toolkit',
    head: 'feature/github-toolkit',
    base: 'master'
  },
  options: {
    dryRun: true
  }
});

Logger.log(JSON.stringify(planned.dryRun.plannedRequest, null, 2));
```

See:

- [HTTP Contracts](http-contracts.md)
- [Chat Contracts](chat-contracts.md)
- [Messaging Contracts](messaging-contracts.md)
- [Messaging Email API](messaging-email.md)
- [Messaging Chat API](messaging-chat.md)
- [GitHub Contracts](github-contracts.md)
- [GitHub Operations](github-operations.md)
- [GitHub Security](../operations/github-security.md)

## `ASTX.AI`

Unified AI surface across:

- `openai`
- `gemini`
- `vertex_gemini`
- `openrouter`
- `perplexity`

Primary methods:

- `ASTX.AI.run(request)` for explicit operation routing.
- `ASTX.AI.text(request)` for text generation.
- `ASTX.AI.structured(request)` for schema-constrained JSON output.
- `ASTX.AI.tools(request)` for bounded auto tool execution.
- `ASTX.AI.image(request)` for image generation paths.
- `ASTX.AI.stream(request)` for callback-based token/tool event streaming.
- `ASTX.AI.estimateTokens(request)` for heuristic token budget preflight.
- `ASTX.AI.truncateMessages(request)` for deterministic message-budget truncation.
- `ASTX.AI.renderPromptTemplate(request)` for strict variable-safe prompt rendering.
- `ASTX.AI.OutputRepair.continueIfTruncated(request)` for bounded continuation repair.
- `ASTX.AI.providers()` and `ASTX.AI.capabilities(provider)` for runtime checks.
- `ASTX.AI.configure(config)` to set runtime defaults (for example from consumer script properties).
- `ASTX.AI.getConfig()` and `ASTX.AI.clearConfig()` for runtime config inspection/reset.

High-signal behavior:

- auth/config resolution: per-call override first, then `ASTX.AI.configure(...)` runtime config, then script properties.
- unsupported provider-operation pairs throw `AstAiCapabilityError`.
- tool calls support function handlers and global-name handlers.
- tool execution is sequential and bounded by `options.maxToolRounds`.
- stream mode emits `start`, `token`, `tool_call`, `tool_result`, `done`, and `error` events via `onEvent`.
- optional `routing` supports provider fallback using `priority`, `fastest`, or `cost_first` strategies.
- deterministic provider `4xx` errors only fail over when `routing.retryOn.providerErrors=true`.
- response metadata includes `response.route.attempts` with per-provider attempt status and retryability.
- token preflight includes provider-aware heuristic metadata and budget overflow diagnostics.
- truncation strategies: `tail`, `head`, `semantic_blocks`.
- prompt template rendering throws `AstAiValidationError` on missing placeholders by default.
- structured mode has bounded reliability controls via `options.reliability`:
  - `maxSchemaRetries`
  - `repairMode` (`none`, `json_repair`, `llm_repair`)
  - `strictValidation`
- set `options.includeRaw=true` to include provider raw payloads.
- output continuation repair can be applied to partial text with `passes` + `maxOutputTokens`.

```javascript
const out = ASTX.AI.structured({
  provider: 'openai',
  input: 'Return JSON with priority and owner.',
  schema: {
    type: 'object',
    properties: {
      priority: { type: 'string' },
      owner: { type: 'string' }
    },
    required: ['priority', 'owner'],
    additionalProperties: false
  },
  options: {
    reliability: {
      maxSchemaRetries: 2,
      repairMode: 'json_repair',
      strictValidation: true
    }
  }
});

Logger.log(JSON.stringify(out.output.json));
```

```javascript
const streamResult = ASTX.AI.stream({
  provider: 'openai',
  input: 'Give me a short status update.',
  onEvent: event => {
    if (event.type === 'token') {
      Logger.log(event.delta);
    }
  }
});

Logger.log(streamResult.output.text);
```

See:

- [AI Contracts](ai-contracts.md)
- [AI Providers](ai-providers.md)
- [AI Tool Calling](ai-tool-calling.md)

## `ASTX.RAG`

Retrieval-augmented generation surface for Apps Script chat workflows with Drive and Storage URI ingestion.

Primary methods:

- `ASTX.RAG.buildIndex(...)` to create a Drive JSON index from Drive folders and/or Storage URIs.
- `ASTX.RAG.syncIndex(...)` to refresh existing indexes after file changes.
- `ASTX.RAG.search(...)` for cosine-ranked retrieval over indexed chunks.
- `ASTX.RAG.previewSources(...)` for citation-ready source cards and reusable retrieval payloads.
- `ASTX.RAG.answer(...)` for grounded answering with strict citation mapping and abstention.
- `ASTX.RAG.evaluate(...)` for deterministic retrieval/grounding/end-to-end scorecards.
- `ASTX.RAG.compareRuns(...)` for baseline vs candidate metric deltas.
- `ASTX.RAG.inspectIndex(...)` for index metadata/health checks.
- `ASTX.RAG.buildRetrievalCacheKey(...)`, `putRetrievalPayload(...)`, `getRetrievalPayload(...)`, `deleteRetrievalPayload(...)` for retrieval payload interop.
- `ASTX.RAG.Citations.*` for inline citation normalization/filtering/url mapping.
- `ASTX.RAG.Fallback.fromCitations(...)` for deterministic citation-only fallback synthesis.
- `ASTX.RAG.IndexManager.create(...)` for build/sync/fast-state orchestration.
- `ASTX.RAG.embeddingProviders()` and `ASTX.RAG.embeddingCapabilities(...)`.
- `ASTX.RAG.registerEmbeddingProvider(...)` and `ASTX.RAG.unregisterEmbeddingProvider(...)`.

Source support:

- plain text (Drive + `gcs://` + `s3://` + `dbfs:/`)
- PDF (Drive + `gcs://` + `s3://` + `dbfs:/`)
- Google Docs (Drive)
- Google Slides (Drive, slide text + speaker notes)

High-signal behavior:

- embedding provider/model is bound at index build time and enforced for retrieval.
- `answer(...)` returns `status='insufficient_context'` when citation grounding fails.
- source parse failures can be downgraded to warnings with `options.skipParseFailures=true`.
- repeated hot queries can be accelerated by enabling cache controls on `search(...)`/`answer(...)`.
- answer flows can reuse `previewSources` payloads via `retrievalPayload` or `retrievalPayloadKey`.
- `answer(...)` supports retrieval recovery controls (`retrieval.recovery`) before generation.
- `answer(...)` supports deterministic fallback policy controls (`fallback.onRetrievalError`, `fallback.onRetrievalEmpty`).
- `search(...)` and `answer(...)` support retrieval budgets via `options.maxRetrievalMs`.
- `answer(...)` supports retrieval-timeout behavior via `options.onRetrievalTimeout` (`error`, `insufficient_context`, `fallback`).
- `answer(...)` prompt controls include `generation.instructions`, `generation.style`, and `generation.forbiddenPhrases`.
- `IndexManager.ensure(...)` can optionally fallback unsupported MIME requests to supported MIME sets with diagnostics.
- `answer(...)` can return stable `diagnostics` for retrieval/generation phase timing + pipeline path when `options.diagnostics=true` (or `RAG_DIAGNOSTICS_ENABLED=true`).
- diagnostics include cache backend/lock metadata and lock timing/contention (`cache.lockScope`, `timings.lockWaitMs`, `cache.lockContention`).

See:

- [RAG Contracts](rag-contracts.md)
- [RAG Embedding Providers](rag-embedding-providers.md)
- [RAG Indexing](../operations/rag-indexing.md)

## `ASTX.Utils`

`Utils` exposes public utility helpers.

Examples:

- `ASTX.Utils.arraySum([1, 2, 3])`
- `ASTX.Utils.dateAdd(new Date(), 1, 'days')`
- `ASTX.Utils.toSnakeCase('Hello World')`

For release stability, call through `ASTX.Utils` rather than relying on global utility symbols.

## `ASTX.DBT`

`ASTX.DBT` provides dbt artifact loading (`manifest`, `catalog`, `run_results`, `sources`), preindexing, search, deep metadata access, deterministic diffing, and lineage impact overlays.

Primary methods:

- `ASTX.DBT.run(request)`
- `ASTX.DBT.loadManifest(request)`
- `ASTX.DBT.loadArtifact(request)`
- `ASTX.DBT.inspectManifest(request)`
- `ASTX.DBT.inspectArtifact(request)`
- `ASTX.DBT.listEntities(request)`
- `ASTX.DBT.search(request)`
- `ASTX.DBT.getEntity(request)`
- `ASTX.DBT.getColumn(request)`
- `ASTX.DBT.lineage(request)`
- `ASTX.DBT.diffEntities(request)`
- `ASTX.DBT.impact(request)`
- `ASTX.DBT.qualityReport(request)`
- `ASTX.DBT.testCoverage(request)`
- `ASTX.DBT.owners(request)`
- `ASTX.DBT.providers()` / `ASTX.DBT.capabilities(provider)`
- `ASTX.DBT.validateManifest(request)`
- `ASTX.DBT.configure(config)` / `ASTX.DBT.getConfig()` / `ASTX.DBT.clearConfig()`

Supported source locators:

- `drive://file/<FILE_ID>`
- `drive://path/<FOLDER_ID>/<FILE_NAME>`
- `gcs://bucket/path/manifest.json`
- `s3://bucket/path/manifest.json`
- `dbfs:/path/manifest.json`

Manifest validation modes:

- `strict` (full required sections + structural checks)
- `basic` (required sections + parse sanity)
- `off` (skip validation)

Example:

```javascript
const loaded = ASTX.DBT.loadManifest({
  uri: 'gcs://my-bucket/dbt/manifest.json',
  options: {
    validate: 'strict',
    schemaVersion: 'v12',
    buildIndex: true
  }
});

const search = ASTX.DBT.search({
  bundle: loaded.bundle,
  target: 'all',
  query: 'orders',
  filters: {
    resourceTypes: ['model'],
    column: {
      namesAny: ['order_id']
    }
  },
  include: {
    meta: true,
    columns: 'summary'
  }
});

Logger.log(search.items);
```

Artifact and impact example:

```javascript
const runResults = ASTX.DBT.loadArtifact({
  artifactType: 'run_results',
  uri: 'gcs://my-bucket/dbt/run_results.json',
  options: { validate: 'strict' }
});

const catalog = ASTX.DBT.loadArtifact({
  artifactType: 'catalog',
  uri: 'gcs://my-bucket/dbt/catalog.json',
  options: { validate: 'strict' }
});

const impact = ASTX.DBT.impact({
  bundle: loaded.bundle,
  uniqueId: 'model.analytics.orders',
  direction: 'downstream',
  depth: 2,
  artifacts: {
    run_results: { bundle: runResults.bundle },
    catalog: { bundle: catalog.bundle }
  }
});

Logger.log(impact.nodes);
```

Governance report example:

```javascript
const quality = ASTX.DBT.qualityReport({
  bundle: loaded.bundle,
  filters: {
    resourceTypes: ['model']
  },
  ownerPaths: ['owner.team', 'owner'],
  topK: 50
});

const coverage = ASTX.DBT.testCoverage({
  bundle: loaded.bundle,
  filters: {
    resourceTypes: ['model']
  },
  uncoveredOnly: true
});

const owners = ASTX.DBT.owners({
  bundle: loaded.bundle,
  filters: {
    resourceTypes: ['model']
  }
});

Logger.log(quality.summary);
Logger.log(coverage.summary);
Logger.log(owners.items);
```
