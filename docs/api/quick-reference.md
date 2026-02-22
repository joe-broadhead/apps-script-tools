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
ASTX.Telemetry
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
```

```javascript
df.select(columns)
df.selectExpr(map, options)
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

## `RAG` essentials

```javascript
ASTX.RAG.configure(config, options)
ASTX.RAG.buildIndex(request)
ASTX.RAG.syncIndex(request)
ASTX.RAG.search(request)
ASTX.RAG.answer(request)
ASTX.RAG.inspectIndex({ indexFileId })
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
ASTX.AI.providers()
ASTX.AI.capabilities(provider)
ASTX.AI.configure(config, options)
ASTX.AI.getConfig()
ASTX.AI.clearConfig()
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

## `Telemetry` essentials

```javascript
ASTX.Telemetry.configure(config, options)
ASTX.Telemetry.getConfig()
ASTX.Telemetry.clearConfig()
ASTX.Telemetry.startSpan(name, context)
ASTX.Telemetry.endSpan(spanId, result)
ASTX.Telemetry.recordEvent(event)
ASTX.Telemetry.getTrace(traceId)
```

## High-signal behavior notes

- `Series.query` rejects string predicates.
- `dropDuplicates()` uses all columns by default.
- `dropDuplicates(['a', 'b'])` uses only the provided subset.
- key-based comparisons canonicalize object/date values and normalize null/undefined/missing.
- `Sql.run` validates provider/request shape before execution.
- placeholder interpolation is blocked unless explicitly enabled.
- AI tool loops are bounded by `options.maxToolRounds` (default `3`).
- unsupported AI provider/operation combinations throw typed capability errors.
- RAG answer generation is grounded against retrieved chunks with citation IDs (`S1..Sn`).
- Cache supports deterministic TTL (`ttlSec`) and tag-based invalidation.
- Cache backend options are `memory`, `drive_json`, `script_properties`, and `storage_json` (`gcs://`, `s3://`, `dbfs:/` via `storageUri`).
- Storage `head/read/delete` missing objects throw `AstStorageNotFoundError`.
- Telemetry records redact secrets by default and can emit to `logger` or Drive NDJSON (`drive_json`).
