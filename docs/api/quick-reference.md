# API Quick Reference

## Consumer import alias

Use your configured Apps Script library identifier (recommended: `ASTLib`) and normalize once:

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Namespace

```javascript
ASTX.VERSION
ASTX.Series
ASTX.DataFrame
ASTX.GroupBy
ASTX.Sheets
ASTX.Drive
ASTX.Http
ASTX.AI
ASTX.RAG
ASTX.DBT
ASTX.Cache
ASTX.Storage
ASTX.Secrets
ASTX.Config
ASTX.Runtime
ASTX.Telemetry
ASTX.TelemetryHelpers
ASTX.Jobs
ASTX.Triggers
ASTX.Chat
ASTX.Messaging
ASTX.GitHub
ASTX.Sql
ASTX.Utils
```

## `DataFrame` essentials

Note: column names cannot collide with reserved `DataFrame` members (for example `sort`, `len`, `columns`, `data`, `index`).

```javascript
ASTX.DataFrame.fromRecords(records)
ASTX.DataFrame.fromColumns(columns, options)
ASTX.DataFrame.fromArrays(arrays, options)
ASTX.DataFrame.fromSheet(sheet, headerRow)
ASTX.DataFrame.fromQuery(request)
ASTX.DataFrame.validateSchema(dataFrame, schema, options)
ASTX.DataFrame.enforceSchema(dataFrame, schema, options)
```

```javascript
df.select(columns)
df.head(n)
df.tail(n)
df.take(indexes, options)
df.sample(options)
df.copy(options)
df.dropNulls(options)
df.fillNulls(values, options)
df.isNull()
df.isNa()
df.notNull()
df.notNa()
df.replace(toReplace, value, options)
df.where(condition, other)
df.mask(condition, other)
df.setIndex(keys, options)
df.sortIndex(options)
df.reindex(options)
df.shift(periods, options)
df.diff(periods, options)
df.pctChange(periods, options)
df.selectExpr(map, options)
df.selectExprDsl(map, options)
df.assign(map)
df.apply(fn, options)
df.applyMap(fn)
df.sort(by, ascending)
df.merge(other, how, options)
df.join(other, options)
df.melt(options)
df.explode(column, options)
df.pivotTable(options)
df.groupBy(keys)
df.window(spec).assign(map)
df.dropDuplicates(subset)
df.duplicated(subset, options)
df.nunique(options)
df.valueCounts(options)
df.agg(aggregations, options)
df.transform(transformer, options)
df.quantile(q, options)
df.describe(options)
df.nlargest(n, columns)
df.nsmallest(n, columns)
df.toColumns(options)
df.toRecords()
df.toArrays(headerOrder)
df.toJson(options)
df.toMarkdown()
df.toTable(request)
df.validateSchema(schema, options)
df.enforceSchema(schema, options)
```

## `Series` essentials

```javascript
ASTX.Series.fromArray(values, name)
ASTX.Series.fromValue(value, length, name)
ASTX.Series.fromRange(start, end, step, name)
```

```javascript
series.head(n)
series.tail(n)
series.take(indexes)
series.sample(options)
series.dropNulls(options)
series.fillNulls(value)
series.replace(toReplace, value, options)
series.interpolate(options)
series.where(condition, other)
series.mask(condition, other)
series.sortIndex(ascending)
series.reindex(index, options)
series.align(other, options)
series.shift(periods, fillValue)
series.diff(periods)
series.pctChange(periods, options)
series.query((s, value, i) => boolean) // function predicate only
series.filter(predicate)
series.map(mapper, options)
series.apply(fn)
series.agg(aggregations)
series.quantile(q, options)
series.idxMax()
series.idxMin()
series.cummax()
series.cummin()
series.cumproduct()
series.sum()
series.mean()
series.median()
series.valueCounts()
series.toFrame(options)
series.str.*
series.dt.*
```

## Global structures (utility classes)

These classes are available globally once the library is loaded:

```javascript
Queue
Deque
Stack
PriorityQueue
LinkedList
Graph
Trie
TernarySearchTree
BinarySearchTree
DisjointSet
LruCache
```

## SQL request contract

```javascript
{
  provider: 'databricks' | 'bigquery',
  sql: 'select ...',
  parameters: { ... },
  placeholders: { ... },
  options: {
    allowUnsafePlaceholders: false
  }
}
```

## `Sql` essentials

```javascript
ASTX.Sql.run(request)
ASTX.Sql.prepare(request)
ASTX.Sql.executePrepared(request)
ASTX.Sql.status(request)
ASTX.Sql.cancel(request)
ASTX.Sql.providers()
ASTX.Sql.capabilities(provider)
```

## `Http` essentials

```javascript
ASTX.Http.request(request)
ASTX.Http.requestBatch(request)
ASTX.Http.capabilities(operation)
ASTX.Http.configure(config, options)
ASTX.Http.getConfig()
ASTX.Http.clearConfig()
```

## `RAG` essentials

```javascript
ASTX.RAG.configure(config, options)
ASTX.RAG.buildIndex(request)
ASTX.RAG.syncIndex(request)
ASTX.RAG.search(request)
ASTX.RAG.previewSources(request)
ASTX.RAG.answer(request)
ASTX.RAG.evaluate(request)
ASTX.RAG.compareRuns(request)
ASTX.RAG.inspectIndex({ indexFileId })
ASTX.RAG.buildRetrievalCacheKey(args)
ASTX.RAG.putRetrievalPayload(key, payload, options)
ASTX.RAG.getRetrievalPayload(key, options)
ASTX.RAG.deleteRetrievalPayload(key, options)
ASTX.RAG.Citations.normalizeInline(text)
ASTX.RAG.Citations.extractInlineIds(text)
ASTX.RAG.Citations.filterForAnswer(citations, options)
ASTX.RAG.Citations.toUrl(citation)
ASTX.RAG.Fallback.fromCitations(args)
ASTX.RAG.IndexManager.create(config)
ASTX.RAG.embeddingProviders()
ASTX.RAG.embeddingCapabilities(provider)
ASTX.RAG.registerEmbeddingProvider(name, adapter, options)
ASTX.RAG.unregisterEmbeddingProvider(name)
```

Notes:

- `buildIndex` / `syncIndex` support mixed source ingestion via Drive folders (`source.folderId`) and Storage URIs (`source.uri` / `source.uris`).
- Supported storage URI schemes: `gcs://`, `s3://`, `dbfs:/`.

## `DBT` essentials

```javascript
ASTX.DBT.run(request)
ASTX.DBT.loadManifest(request)
ASTX.DBT.loadArtifact(request)
ASTX.DBT.inspectManifest(request)
ASTX.DBT.inspectArtifact(request)
ASTX.DBT.listEntities(request)
ASTX.DBT.search(request)
ASTX.DBT.getEntity(request)
ASTX.DBT.getColumn(request)
ASTX.DBT.lineage(request)
ASTX.DBT.diffEntities(request)
ASTX.DBT.impact(request)
ASTX.DBT.providers()
ASTX.DBT.capabilities(provider)
ASTX.DBT.validateManifest(request)
ASTX.DBT.configure(config, options)
ASTX.DBT.getConfig()
ASTX.DBT.clearConfig()
```

## `Messaging` essentials

```javascript
ASTX.Messaging.run(request)
ASTX.Messaging.email.send(request)
ASTX.Messaging.email.sendBatch(request)
ASTX.Messaging.email.createDraft(request)
ASTX.Messaging.email.sendDraft(request)
ASTX.Messaging.email.listThreads(request)
ASTX.Messaging.email.getThread(request)
ASTX.Messaging.email.searchMessages(request)
ASTX.Messaging.email.getMessage(request)
ASTX.Messaging.email.listLabels(request)
ASTX.Messaging.email.updateMessageLabels(request)
ASTX.Messaging.chat.send(request)
ASTX.Messaging.chat.sendBatch(request)
ASTX.Messaging.chat.getMessage(request)
ASTX.Messaging.chat.listMessages(request)
ASTX.Messaging.tracking.buildPixelUrl(request)
ASTX.Messaging.tracking.wrapLinks(request)
ASTX.Messaging.tracking.recordEvent(request)
ASTX.Messaging.tracking.handleWebEvent(request)
ASTX.Messaging.logs.list(request)
ASTX.Messaging.logs.get(request)
ASTX.Messaging.logs.delete(request)
ASTX.Messaging.operations()
ASTX.Messaging.capabilities(operationOrGroup)
ASTX.Messaging.configure(config, options)
ASTX.Messaging.getConfig()
ASTX.Messaging.clearConfig()
```

## `AI` essentials

```javascript
ASTX.AI.run(request)
ASTX.AI.text(request)
ASTX.AI.structured(request)
ASTX.AI.tools(request)
ASTX.AI.image(request)
ASTX.AI.stream(request)
ASTX.AI.providers()
ASTX.AI.capabilities(provider)
ASTX.AI.configure(config, options)
ASTX.AI.getConfig()
ASTX.AI.clearConfig()
ASTX.AI.OutputRepair.continueIfTruncated(request)
```

## Workspace helpers

```javascript
ASTX.Sheets.openById(spreadsheetId)
ASTX.Sheets.openByUrl(spreadsheetUrl)
ASTX.Drive.read(fileId, fileType, options)
ASTX.Drive.create(fileType, fileName, options)
```

## `Storage` essentials

```javascript
ASTX.Storage.run(request)
ASTX.Storage.list(request)
ASTX.Storage.head(request)
ASTX.Storage.read(request)
ASTX.Storage.write(request)
ASTX.Storage.delete(request)
ASTX.Storage.exists(request)
ASTX.Storage.copy(request)
ASTX.Storage.move(request)
ASTX.Storage.signedUrl(request)
ASTX.Storage.multipartWrite(request)
ASTX.Storage.walk(request)
ASTX.Storage.copyPrefix(request)
ASTX.Storage.deletePrefix(request)
ASTX.Storage.sync(request)
ASTX.Storage.providers()
ASTX.Storage.capabilities(provider)
ASTX.Storage.configure(config, options)
ASTX.Storage.getConfig()
ASTX.Storage.clearConfig()
```

## `Secrets` essentials

```javascript
ASTX.Secrets.run(request)
ASTX.Secrets.get(request)
ASTX.Secrets.set(request)
ASTX.Secrets.delete(request)
ASTX.Secrets.providers()
ASTX.Secrets.capabilities(provider)
ASTX.Secrets.configure(config, options)
ASTX.Secrets.getConfig()
ASTX.Secrets.clearConfig()
ASTX.Secrets.resolveValue(value, options)
```

## `Cache` essentials

```javascript
ASTX.Cache.get(key, options)
ASTX.Cache.set(key, value, options)
ASTX.Cache.getMany(keys, options)
ASTX.Cache.setMany(entries, options)
ASTX.Cache.fetch(key, resolver, options)
ASTX.Cache.fetchMany(keys, resolver, options)
ASTX.Cache.delete(key, options)
ASTX.Cache.deleteMany(keys, options)
ASTX.Cache.invalidateByTag(tag, options)
ASTX.Cache.stats(options)
ASTX.Cache.backends()
ASTX.Cache.capabilities(backend)
ASTX.Cache.configure(config, options)
ASTX.Cache.getConfig()
ASTX.Cache.clearConfig()
ASTX.Cache.clear(options)
```

## `Config` essentials

```javascript
ASTX.Config.fromScriptProperties(options)
```

## `Runtime` essentials

```javascript
ASTX.Runtime.configureFromProps(options)
ASTX.Runtime.modules()
```

## `Telemetry` essentials

```javascript
ASTX.Telemetry.configure(config, options)
ASTX.Telemetry.getConfig()
ASTX.Telemetry.clearConfig()
ASTX.Telemetry.startSpan(name, context)
ASTX.Telemetry.endSpan(spanId, result)
ASTX.Telemetry.recordEvent(event)
ASTX.Telemetry.getTrace(traceId)
ASTX.Telemetry.flush(options)
```

## `TelemetryHelpers` essentials

```javascript
ASTX.TelemetryHelpers.startSpanSafe(name, context, options)
ASTX.TelemetryHelpers.endSpanSafe(spanId, result, options)
ASTX.TelemetryHelpers.recordEventSafe(event, options)
ASTX.TelemetryHelpers.withSpan(name, context, task, options)
ASTX.TelemetryHelpers.wrap(name, task, options)
```

## `Jobs` essentials

```javascript
ASTX.Jobs.run(request)
ASTX.Jobs.enqueue(request)
ASTX.Jobs.resume(jobId, options)
ASTX.Jobs.status(jobId, options)
ASTX.Jobs.list(filters, options)
ASTX.Jobs.cancel(jobId, options)
ASTX.Jobs.configure(config, options)
ASTX.Jobs.getConfig()
ASTX.Jobs.clearConfig()
```

## `Triggers` essentials

```javascript
ASTX.Triggers.run(request)
ASTX.Triggers.upsert(request)
ASTX.Triggers.list(request)
ASTX.Triggers.delete(request)
ASTX.Triggers.runNow(request)
ASTX.Triggers.configure(config, options)
ASTX.Triggers.getConfig()
ASTX.Triggers.clearConfig()
```

## `Chat` essentials

```javascript
ASTX.Chat.configure(config, options)
ASTX.Chat.getConfig()
ASTX.Chat.clearConfig()
ASTX.Chat.ThreadStore.create(config)
```

```javascript
const store = ASTX.Chat.ThreadStore.create({
  keyPrefix: 'my_app',
  durable: { backend: 'drive_json' },
  limits: { threadMax: 25, turnsMax: 200 }
});

store.getOrCreateState({ userKey: 'user-1' });
store.newThread({ userKey: 'user-1' }, { title: 'New chat' });
store.switchThread({ userKey: 'user-1' }, { threadId: 'thread_123' });
store.appendTurn({ userKey: 'user-1' }, { turn: { role: 'user', content: 'Hello' } });
store.buildHistory({ userKey: 'user-1' }, { maxPairs: 10, systemMessage: 'You are helpful.' });

## `GitHub` essentials

```javascript
ASTX.GitHub.run(request)
ASTX.GitHub.graphql(request)
ASTX.GitHub.getMe(request)
ASTX.GitHub.getRepository(request)
ASTX.GitHub.createRepository(request)
ASTX.GitHub.forkRepository(request)
ASTX.GitHub.listBranches(request)
ASTX.GitHub.createBranch(request)
ASTX.GitHub.listCommits(request)
ASTX.GitHub.getCommit(request)
ASTX.GitHub.getFileContents(request)
ASTX.GitHub.createOrUpdateFile(request)
ASTX.GitHub.deleteFile(request)
ASTX.GitHub.pushFiles(request)
ASTX.GitHub.listIssues(request)
ASTX.GitHub.getIssue(request)
ASTX.GitHub.getIssueComments(request)
ASTX.GitHub.createIssue(request)
ASTX.GitHub.updateIssue(request)
ASTX.GitHub.addIssueComment(request)
ASTX.GitHub.listPullRequests(request)
ASTX.GitHub.searchPullRequests(request)
ASTX.GitHub.getPullRequest(request)
ASTX.GitHub.getPullRequestDiff(request)
ASTX.GitHub.getPullRequestFiles(request)
ASTX.GitHub.getPullRequestComments(request)
ASTX.GitHub.getPullRequestReviewComments(request)
ASTX.GitHub.getPullRequestReviews(request)
ASTX.GitHub.getPullRequestStatus(request)
ASTX.GitHub.createPullRequest(request)
ASTX.GitHub.updatePullRequest(request)
ASTX.GitHub.mergePullRequest(request)
ASTX.GitHub.updatePullRequestBranch(request)
ASTX.GitHub.createPullRequestReview(request)
ASTX.GitHub.submitPendingPullRequestReview(request)
ASTX.GitHub.deletePendingPullRequestReview(request)
ASTX.GitHub.addCommentToPendingReview(request)
ASTX.GitHub.replyToPullRequestComment(request)
ASTX.GitHub.listReleases(request)
ASTX.GitHub.getLatestRelease(request)
ASTX.GitHub.getReleaseByTag(request)
ASTX.GitHub.listTags(request)
ASTX.GitHub.getTag(request)
ASTX.GitHub.searchRepositories(request)
ASTX.GitHub.searchUsers(request)
ASTX.GitHub.searchCode(request)
ASTX.GitHub.searchIssues(request)
ASTX.GitHub.rateLimit(request)
ASTX.GitHub.operations()
ASTX.GitHub.providers()
ASTX.GitHub.capabilities(operationOrGroup)
ASTX.GitHub.configure(config, options)
ASTX.GitHub.getConfig()
ASTX.GitHub.clearConfig()
```

## High-signal behavior notes

- `Series.query` rejects string predicates.
- `dropDuplicates()` uses all columns by default.
- `dropDuplicates(['a', 'b'])` uses only the provided subset.
- key-based comparisons canonicalize object/date values and normalize null/undefined/missing.
- `validateSchema` reports missing/extra/type/nullability violations; set `strict: true` to throw.
- `enforceSchema` can coerce schema columns and optionally drop non-schema columns.
- `Sql.run` validates provider/request shape before execution.
- `Sql.prepare` stores compiled prepared statements in runtime memory and returns `statementId`.
- `Sql.executePrepared` returns `{ dataFrame, execution }` for provider detailed paths.
- `Sql.status` and `Sql.cancel` route through provider-specific execution control helpers.
- placeholder interpolation is blocked unless explicitly enabled.
- AI tool loops are bounded by `options.maxToolRounds` (default `3`).
- AI tools support per-tool guardrails: `timeoutMs`, `maxArgsBytes`, `maxResultBytes`, `retries`, and idempotent replay.
- unsupported AI provider/operation combinations throw typed capability errors.
- `ASTX.AI.stream(...)` emits `start`, `token`, `tool_call`, `tool_result`, `done`, and `error` events via `onEvent`.
- `ASTX.AI.OutputRepair.continueIfTruncated(...)` can continue truncated answers with bounded follow-up passes.
- `RAG.answer(...)` supports retrieval recovery policy (`retrieval.recovery.*`) before generation.
- `RAG.answer(...)` supports deterministic fallback controls (`fallback.onRetrievalError`, `fallback.onRetrievalEmpty`).
- `RAG.search(...)` and `RAG.answer(...)` support retrieval budgets via `options.maxRetrievalMs`.
- `RAG.answer(...)` supports retrieval-timeout behavior via `options.onRetrievalTimeout` (`error`, `insufficient_context`, `fallback`).
- `RAG.answer(...)` prompt controls include `generation.instructions`, `generation.style`, and `generation.forbiddenPhrases`.
- `RAG.answer(...)` supports prompt context budgets via `generation.maxContextChars` and `generation.maxContextTokensApprox`.
- `RAG.answer(...)` includes `diagnostics` only when enabled via `options.diagnostics=true` (or `RAG_DIAGNOSTICS_ENABLED=true`).
- RAG diagnostics include cache backend metadata and lock timing/contention fields (`cache.backend`, `cache.lockScope`, `timings.lockWaitMs`, `cache.lockContention`).
- `ASTX.Chat.ThreadStore` persists per-user thread state with lock-aware writes and deterministic thread/turn caps.
- `ASTX.AI.*` accepts optional `routing` candidates for priority/latency/cost-based provider fallback with per-attempt trace metadata.
- `ASTX.AI.structured(...)` includes a bounded reliability layer (`options.reliability`) for schema retries and optional repair (`json_repair`/`llm_repair`).
- RAG answer generation is grounded against retrieved chunks with citation IDs (`S1..Sn`).
- `ASTX.DBT.loadManifest(...)` supports `drive://file/<id>`, `drive://path/<folderId>/<fileName>`, `gcs://`, `s3://`, and `dbfs:/` sources.
- `ASTX.DBT.loadArtifact(...)` supports `catalog`, `run_results`, and `sources` payloads from inline objects or any DBT source URI.
- `ASTX.DBT.search(...)` uses structured filters over entities/columns (tags/meta/depends_on/resourceType/section) with deterministic pagination/sorting.
- `ASTX.DBT.getEntity(...)` and `ASTX.DBT.getColumn(...)` provide deep model/column metadata retrieval from preindexed bundles.
- `ASTX.DBT.lineage(...)` traverses `parent_map`/`child_map` with `depends_on.nodes` fallback when lineage maps are missing.
- `ASTX.DBT.diffEntities(...)` compares two manifest snapshots deterministically with stable pagination and change typing (`added|removed|modified|unchanged`).
- `ASTX.DBT.impact(...)` overlays lineage nodes with `run_results`, `catalog`, and `sources` artifact status when bundles/artifacts are supplied.
- RAG retrieval supports `vector` (default), `hybrid` (vector + lexical fusion), and `lexical` (no embedding call) modes.
- RAG retrieval supports lexical prefiltering in vector/hybrid mode via `retrieval.lexicalPrefilterTopN`.
- RAG retrieval supports optional reranking on top-N chunks via `retrieval.rerank`.
- RAG retrieval supports access constraints via `retrieval.access` (`allowedFileIds`, `deniedFileIds`, `allowedMimeTypes`, `deniedMimeTypes`).
- `RAG.answer(...)` can enforce citation/source boundaries with `options.enforceAccessControl=true`.
- `RAG.search(...)` / `RAG.answer(...)` can cache embeddings/results with `cache.enabled` and backend overrides.
- `RAG.previewSources(...)` returns citation-ready cards and optional reusable retrieval payloads.
- retrieval payload interop APIs (`buildRetrievalCacheKey`/`put`/`get`/`delete`) support search-to-answer reuse without re-search.
- `RAG.IndexManager.create(...).ensure/sync/fastState` wraps index lifecycle operations for app-level orchestration.
- Cache supports deterministic TTL (`ttlSec`) and tag-based invalidation.
- Cache backend options are `memory`, `drive_json`, `script_properties`, and `storage_json` (`gcs://`, `s3://`, `dbfs:/` via `storageUri`).
- Cache `updateStatsOnGet` defaults to `true`; set `updateStatsOnGet: false` to avoid write-on-read for high-throughput reads.
- Cache production default should be `storage_json`; keep `memory`/`drive_json`/`script_properties` for low-scale or execution-local workloads.
- Storage `head/read/delete` missing objects throw `AstStorageNotFoundError`.
- Storage `exists` returns `output.exists.exists` instead of throwing on not-found.
- Storage `copy/move` require same-provider source and destination in this release.
- Storage `copyPrefix/sync` can bridge providers using read+write fallback when source and target providers differ.
- Telemetry records redact secrets by default and can emit to `logger`, Drive partitioned NDJSON batches (`drive_json`), or storage NDJSON batches (`storage_json`).
- `ASTX.Config.fromScriptProperties(...)` supports `keys`, `prefix`, and `stripPrefix` for deterministic property snapshots.
- `ASTX.Runtime.configureFromProps(...)` applies script/runtime config to selected modules (`AI`, `RAG`, `DBT`, `Cache`, `Storage`, `Secrets`, `Telemetry`, `Jobs`, `Triggers`, `GitHub`).
- `ASTX.TelemetryHelpers.withSpan(...)` safely closes spans on success/error and rethrows task errors.
- Jobs step handlers must be globally resolvable named functions and return JSON-serializable values.
- Jobs checkpoint storage currently supports `checkpointStore='properties'` only.
- `ASTX.Config.fromScriptProperties(...)` supports explicit handle injection with `scriptProperties: PropertiesService.getScriptProperties()` for deterministic GAS web-app behavior.
- default implicit config snapshots are fresh reads; set `cacheDefaultHandle: true` to opt into implicit-handle memoization.
- GitHub mutation operations support `options.dryRun=true` planning and skip network writes.
- GitHub read operations support optional cache + ETag revalidation with stale-on-error fallback.
- GitHub API auth defaults to PAT (`GITHUB_TOKEN`) unless overridden per request.
