# Telemetry Operations

This page covers practical telemetry setup and operations for `ASTX.Telemetry`.

## Quick setup

```javascript
const ASTX = ASTLib.AST || ASTLib;

ASTX.Telemetry.configure({
  sink: 'logger',
  redactSecrets: true,
  sampleRate: 1.0
});
```

For Drive-backed retention:

```javascript
ASTX.Telemetry.configure({
  sink: 'drive_json',
  driveFolderId: 'YOUR_DRIVE_FOLDER_ID',
  driveFileName: 'ast-telemetry.ndjson'
});
```

## Recommended defaults

- `redactSecrets: true` in all environments.
- `sampleRate: 1.0` for test/staging, then tune for production.
- rotate Drive NDJSON files periodically for long-running projects.

## Trace usage pattern

```javascript
function runWorkflowWithTelemetry() {
  const spanId = ASTX.Telemetry.startSpan('workflow.run', {
    workflow: 'daily_sync'
  });

  try {
    const result = ASTX.Sql.run({
      provider: 'bigquery',
      sql: 'select 1 as ok'
    });

    ASTX.Telemetry.endSpan(spanId, {
      status: 'ok',
      result: { rows: result.data ? result.data.length : 0 }
    });
  } catch (error) {
    ASTX.Telemetry.endSpan(spanId, {
      status: 'error',
      error
    });
    throw error;
  }
}
```

## Data handling and safety

- Do not put raw credentials in custom telemetry payloads.
- Telemetry redaction protects common key names and bearer-like strings.
- If you pass custom nested payloads, treat redaction as defense-in-depth, not a reason to log secrets.

## Drive sink operations

- Sink file content format: newline-delimited JSON (one record per line).
- Existing files are appended to; file creation is automatic if missing.
- Prefer a dedicated Drive folder for telemetry artifacts.

## Troubleshooting

### No telemetry output in logs

- Ensure `ASTX.Telemetry.configure(...)` was called.
- Verify `sampleRate > 0`.
- Confirm spans are closed with `endSpan(...)`.

### Drive sink errors

- Verify script has Drive scopes enabled.
- Confirm `driveFolderId` points to an accessible folder.
- If `drive_json` is not required, fallback to `sink: 'logger'`.

### Missing trace when calling `getTrace(traceId)`

- `getTrace` returns only in-memory traces.
- If runtime restarted, previously captured traces are only in your sink output.
