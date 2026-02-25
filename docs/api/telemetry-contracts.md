# Telemetry Contracts

`ASTX.Telemetry` provides a lightweight observability layer for runtime traces and events.

## Import pattern

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Public API

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

## Config contract

```javascript
{
  sink: 'logger' | 'drive_json' | 'storage_json',
  redactSecrets: true,
  sampleRate: 1.0,
  driveFolderId: '',
  driveFileName: 'ast-telemetry.ndjson',
  storageUri: 's3://my-bucket/telemetry',
  storageAuth: {},
  storageProviderOptions: {},
  flushMode: 'threshold', // immediate | threshold | manual
  batchMaxEvents: 25,
  batchMaxBytes: 65536,
  partitionByHour: true,
  storageTimeoutMs: 45000,
  storageRetries: 2,
  lockTimeoutMs: 30000,
  maxTraceCount: 200,
  maxSpansPerTrace: 200
}
```

Notes:

- `sink='logger'` is default.
- `sink='drive_json'` writes partitioned NDJSON batch files in Drive (`events/YYYY/MM/DD[/HH]`).
- `sink='storage_json'` writes NDJSON batches to `gcs://`, `s3://`, or `dbfs:/`.
- `flushMode='threshold'` flushes when event/byte thresholds are reached.
- call `ASTX.Telemetry.flush()` when using `flushMode='manual'`.
- `sampleRate` is clamped to `[0, 1]`.

## Span lifecycle

### Start span

```javascript
const spanId = ASTX.Telemetry.startSpan('ai.run', {
  provider: 'openai',
  operation: 'text'
});
```

### End span

```javascript
ASTX.Telemetry.endSpan(spanId, {
  status: 'ok',
  result: { tokens: 123 }
});
```

Error completion:

```javascript
ASTX.Telemetry.endSpan(spanId, {
  status: 'error',
  error: new Error('Provider timeout')
});
```

## Event contract

```javascript
ASTX.Telemetry.recordEvent({
  traceId: 'trace_...',
  spanId: 'span_...',
  name: 'retrieval.ranked',
  level: 'info',
  payload: { returned: 8, topK: 8 }
});
```

## Retrieval contract

```javascript
const trace = ASTX.Telemetry.getTrace(traceId);
```

Manual flush example:

```javascript
ASTX.Telemetry.configure({
  sink: 'drive_json',
  driveFolderId: 'YOUR_FOLDER_ID',
  driveFileName: 'ast-telemetry.ndjson',
  flushMode: 'manual'
});

// ...run workload...
ASTX.Telemetry.flush();
```

Trace response includes:

- `traceId`, `status`, `startedAt`, `updatedAt`, `endedAt`
- `spans[]` with `durationMs`, `status`, `context`, `result`, `error`
- `events[]` with event metadata and payload

## Redaction policy

Secret-like keys are redacted by default, including:

- `apiKey`
- `token`
- `secret`
- `password`
- `authorization`
- `cookie`

Token-like string values (for example `Bearer ...`) are also sanitized.

## Typed errors

- `AstTelemetryError`
- `AstTelemetryValidationError`
- `AstTelemetryCapabilityError`

## Current instrumentation coverage

Telemetry spans currently instrument:

- `ASTX.AI` requests (`ai.run`)
- `ASTX.RAG.buildIndex(...)` (`rag.buildIndex`)
- `ASTX.RAG.answer(...)` (`rag.answer`)

Telemetry is intentionally non-blocking; sink failures are swallowed so business paths continue.
