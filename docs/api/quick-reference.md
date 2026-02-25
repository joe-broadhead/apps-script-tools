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
ASTX.AI
ASTX.RAG
ASTX.Cache
ASTX.Storage
ASTX.Config
ASTX.Runtime
ASTX.Telemetry
ASTX.TelemetryHelpers
ASTX.Jobs
ASTX.Chat
ASTX.Sql
ASTX.Utils
```

## `DataFrame` essentials

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
df.selectExpr(map, options)
df.selectExprDsl(map, options)
df.assign(map)
df.sort(by, ascending)
df.merge(other, how, options)
df.groupBy(keys)
df.window(spec).assign(map)
df.dropDuplicates(subset)
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
series.query((s, value, i) => boolean) // function predicate only
series.filter(predicate)
series.apply(fn)
series.sum()
series.mean()
series.median()
series.valueCounts()
series.str.*
series.dt.*
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

## `RAG` essentials

```javascript
ASTX.RAG.configure(config, options)
ASTX.RAG.buildIndex(request)
ASTX.RAG.syncIndex(request)
ASTX.RAG.search(request)
ASTX.RAG.previewSources(request)
ASTX.RAG.answer(request)
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
ASTX.Storage.providers()
ASTX.Storage.capabilities(provider)
ASTX.Storage.configure(config, options)
ASTX.Storage.getConfig()
ASTX.Storage.clearConfig()
```

## `Cache` essentials

```javascript
ASTX.Cache.get(key, options)
ASTX.Cache.set(key, value, options)
ASTX.Cache.delete(key, options)
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
- Telemetry records redact secrets by default and can emit to `logger`, Drive partitioned NDJSON batches (`drive_json`), or storage NDJSON batches (`storage_json`).
- `ASTX.Config.fromScriptProperties(...)` supports `keys`, `prefix`, and `stripPrefix` for deterministic property snapshots.
- `ASTX.Runtime.configureFromProps(...)` applies script/runtime config to selected modules (`AI`, `RAG`, `Cache`, `Storage`, `Telemetry`, `Jobs`).
- `ASTX.TelemetryHelpers.withSpan(...)` safely closes spans on success/error and rethrows task errors.
- Jobs step handlers must be globally resolvable named functions and return JSON-serializable values.
- Jobs checkpoint storage currently supports `checkpointStore='properties'` only.
