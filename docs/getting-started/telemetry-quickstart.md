# Telemetry Quick Start

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure telemetry sink

```javascript
function configureTelemetryRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Telemetry.configure({
    TELEMETRY_ENABLED: true,
    TELEMETRY_SINK: 'logger',
    TELEMETRY_MAX_TRACES: 500
  });
}
```

## Manual span lifecycle

```javascript
function telemetrySpanExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const spanId = ASTX.Telemetry.startSpan('demo.run', {
    feature: 'quickstart'
  });

  ASTX.Telemetry.recordEvent(spanId, 'step.complete', { step: 'load' });
  ASTX.Telemetry.endSpan(spanId, { status: 'ok' });
}
```

## Safe wrapper helper

```javascript
function telemetryWithSpanExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const total = ASTX.TelemetryHelpers.withSpan(
    'demo.calculate',
    { source: 'quickstart' },
    () => ASTX.Utils.arraySum([1, 2, 3, 4]),
    { includeResult: true }
  );

  Logger.log(total);
}
```

## Notes

- Sensitive keys are redacted automatically in span/event context.
- Choose `drive_json` or `storage_json` sinks for durable production traces.
- Call `ASTX.Telemetry.flush()` when using buffered/manual flush modes.
