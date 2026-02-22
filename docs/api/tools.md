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
- Filtering: `filter`, `query`.
- Stats: `sum`, `mean`, `median`, `mode`, `std`, `var`.
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

Creation:

- `fromRecords(records)`
- `fromColumns(columns, options)`
- `fromArrays(arrays, options)`
- `fromSheet(sheet, headerRow)`
- `fromQuery(request)`

Transform:

- `select`, `selectExpr`, `drop`, `rename`, `assign`, `merge`, `sort`, `pivot`, `groupBy`, `window`.
- `dropDuplicates(subset = [])` with explicit subset semantics.

Output:

- `toColumns(options)`
- `toRecords`, `toArrays`, `toJson`, `toMarkdown`, `toSheet`, `toTable`.

```javascript
const df = ASTX.DataFrame.fromColumns({
  id: [1, 2],
  amount: [10, 20]
});

const out = df.assign({ amount_x2: frame => frame.amount.multiply(2) });
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

## `ASTX.GroupBy`

Create grouped workflows from `DataFrame.groupBy(keys)`.

- `agg(mapping)` supports named aggregators or custom functions.
- `apply(fn)` runs per-group transforms and concatenates output.

```javascript
const grouped = df.groupBy(['region']).agg({ amount: ['sum', 'mean'] });
```

## `ASTX.Sql.run`

Executes SQL against supported providers with request validation.

- providers: `databricks`, `bigquery`.
- validates provider/sql/parameters/placeholders/options shape.
- unsafe placeholder interpolation is disabled by default.

See [SQL Contracts](sql-contracts.md) for provider-specific request details.

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

Primary methods:

- `ASTX.Cache.get(key, options)`
- `ASTX.Cache.set(key, value, options)`
- `ASTX.Cache.delete(key, options)`
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
```

`storage_json` example:

```javascript
ASTX.Cache.configure({
  backend: 'storage_json',
  namespace: 'my_project',
  storageUri: 's3://my-bucket/cache/ast-cache.json'
});
```

## `ASTX.Storage`

Cross-provider object storage surface:

- providers: `gcs`, `s3`, `dbfs`
- operations: `list`, `head`, `read`, `write`, `delete`
- URI model: `gcs://`, `s3://`, `dbfs:/`

Primary methods:

- `ASTX.Storage.run(request)` for explicit operation routing.
- `ASTX.Storage.list/head/read/write/delete(request)` convenience wrappers.
- `ASTX.Storage.providers()` and `ASTX.Storage.capabilities(provider)` for runtime checks.
- `ASTX.Storage.configure(config)` to set runtime defaults from script properties.
- `ASTX.Storage.getConfig()` and `ASTX.Storage.clearConfig()` for runtime config inspection/reset.

High-signal behavior:

- auth/config resolution: per-call override first, then `ASTX.Storage.configure(...)`, then script properties.
- write payload contract is base64-first with `text/json` helper inputs.
- `head/read/delete` missing objects throw `AstStorageNotFoundError`.
- transport retries apply to transient HTTP statuses (`429`, `5xx`) only.

```javascript
const out = ASTX.Storage.read({
  uri: 'gcs://my-bucket/data/config.json'
});

Logger.log(out.output.data.json || out.output.data.text);
```

See:

- [Storage Contracts](storage-contracts.md)
- [Storage Providers](storage-providers.md)
- [Storage Security](../operations/storage-security.md)

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

Sink support:

- `logger` (default) emits JSON payloads to Apps Script `Logger`.
- `drive_json` appends NDJSON records to a Drive file.

High-signal behavior:

- `configure(...)` supports `sink`, `redactSecrets`, `sampleRate`, `driveFolderId`, `driveFileName`, and trace limits.
- sensitive keys and token-like values are redacted by default.
- telemetry calls should never block functional execution paths.
- span IDs and trace IDs are generated if not supplied.

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
- set `options.includeRaw=true` to include provider raw payloads.

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
    required: ['priority', 'owner']
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

Drive-backed retrieval-augmented generation surface for Apps Script chat workflows.

Primary methods:

- `ASTX.RAG.buildIndex(...)` to create a Drive JSON index from Drive sources.
- `ASTX.RAG.syncIndex(...)` to refresh existing indexes after file changes.
- `ASTX.RAG.search(...)` for cosine-ranked retrieval over indexed chunks.
- `ASTX.RAG.answer(...)` for grounded answering with strict citation mapping and abstention.
- `ASTX.RAG.inspectIndex(...)` for index metadata/health checks.
- `ASTX.RAG.embeddingProviders()` and `ASTX.RAG.embeddingCapabilities(...)`.
- `ASTX.RAG.registerEmbeddingProvider(...)` and `ASTX.RAG.unregisterEmbeddingProvider(...)`.

Source support:

- plain text
- PDF
- Google Docs
- Google Slides (slide text + speaker notes)

High-signal behavior:

- embedding provider/model is bound at index build time and enforced for retrieval.
- `answer(...)` returns `status='insufficient_context'` when citation grounding fails.
- source parse failures can be downgraded to warnings with `options.skipParseFailures=true`.

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
