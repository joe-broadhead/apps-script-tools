# Telemetry Alerting Cookbook

Template-v2 cookbook for `AST.Telemetry` and `AST.TelemetryHelpers`.

This cookbook demonstrates:
- manual span/event recording
- grouped query and aggregate diagnostics
- redaction behavior for secret-like keys
- alert rule creation, listing, evaluation, and dry-run notification
- helper-based instrumentation with `ASTX.TelemetryHelpers.withSpan(...)` and `wrap(...)`
- inline telemetry export for inspection without external infrastructure

## Setup

1. Copy `.clasp.json.example` to `.clasp.json` and set the target `scriptId`.
2. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
3. `clasp push`
4. Run `seedCookbookConfig()`.
5. Run `runCookbookAll()`.

## Script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `TELEMETRY_COOKBOOK_APP_NAME` | Yes | `AST Telemetry Alerting` | Human-readable cookbook name used in outputs and alert labels |
| `TELEMETRY_COOKBOOK_SINK` | Yes | `logger` | Telemetry sink: `logger`, `drive_json`, `storage_json` |
| `TELEMETRY_COOKBOOK_FLUSH_MODE` | Yes | `threshold` | Sink flush mode: `immediate`, `threshold`, `manual` |
| `TELEMETRY_COOKBOOK_SAMPLE_RATE` | Yes | `1` | Runtime sample rate for general usage; smoke/demo force `1.0` for deterministic output |
| `TELEMETRY_COOKBOOK_MAX_TRACES` | Yes | `200` | In-memory trace retention budget |
| `TELEMETRY_COOKBOOK_BATCH_MAX_EVENTS` | Yes | `25` | Batch flush threshold for buffered sinks |
| `TELEMETRY_COOKBOOK_EXPORT_FORMAT` | Yes | `ndjson` | Inline export format used by the demo |
| `TELEMETRY_COOKBOOK_ALERT_THRESHOLD` | Yes | `1` | Error-count threshold used by the smoke alert rule |
| `TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID` | No | `` | Required only when `TELEMETRY_COOKBOOK_SINK=drive_json` |
| `TELEMETRY_COOKBOOK_DRIVE_FILE_NAME` | No | `telemetry-alerting.ndjson` | Drive file basename for `drive_json` sink |
| `TELEMETRY_COOKBOOK_STORAGE_URI` | No | `` | Required only when `TELEMETRY_COOKBOOK_SINK=storage_json` |
| `TELEMETRY_COOKBOOK_NOTIFY_CHAT_WEBHOOK` | No | `` | Optional HTTPS Chat webhook included only in dry-run notification previews |
| `TELEMETRY_COOKBOOK_NOTIFY_EMAIL_TO` | No | `` | Optional comma-separated email recipients included only in dry-run notification previews |
| `TELEMETRY_COOKBOOK_VERBOSE` | No | `false` | Enables extra helper logging when customized |

## Entry points

### `runCookbookSmoke()`

Deterministic smoke path that:
- records one successful span and one failing span on the same trace
- records associated events with secret-like payload keys
- queries and aggregates the generated telemetry
- creates and lists an alert rule
- evaluates the rule without mutating suppression state
- runs `notifyAlert(...)` in dry-run mode with logger channels

Expected high-signal output:
- `redactionPreview` shows `[REDACTED]` values for secret-like keys
- `evaluationSummary.triggered` is at least `1`
- `notificationDryRun.dryRun === true`

### `runCookbookDemo()`

Demonstrates app-style helper instrumentation:
- `ASTX.TelemetryHelpers.withSpan(...)`
- `ASTX.TelemetryHelpers.wrap(...)`
- grouped aggregate output by span name
- inline export preview (`json`, `ndjson`, or `csv`)
- best-effort sink flush summary

### `runCookbookAll()`

Runs config validation, smoke, and demo in one call.

## Least-privilege scopes

Default `src/appsscript.json` intentionally has no extra OAuth scopes beyond the library dependency.

Add scopes only if you enable these features:
- `https://www.googleapis.com/auth/drive` when using `drive_json` sink
- `https://www.googleapis.com/auth/script.external_request` when using `storage_json` sink or real Chat webhook delivery
- `https://www.googleapis.com/auth/script.send_mail` or Gmail send scopes when using real email delivery

The cookbook defaults to:
- `sink=logger`
- inline export
- dry-run notifications

That means the default smoke path does not require Drive, HTTP, or mail scopes.

## Sink options

### `logger`
- fastest local feedback
- no durable storage
- recommended default for validating instrumentation and alert logic

### `drive_json`
- durable NDJSON batches in Drive
- requires `TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID`
- useful for Apps Script-native audit trails

### `storage_json`
- durable NDJSON batches in object storage via `AST.Storage`
- requires `TELEMETRY_COOKBOOK_STORAGE_URI`
- use when you want centralized retention in GCS, S3, or DBFS

## Redaction and security notes

- `AST.Telemetry` redacts secret-like keys such as `apiKey`, `token`, `secret`, `authorization`, `password`, and `cookie`.
- This cookbook intentionally records secret-shaped fields in smoke mode so you can verify redaction in query output.
- `runCookbookSmoke()` redacts configured Chat webhook values from the returned config summary.
- Notification examples run with `dryRun: true` by default to avoid accidental external sends.

## Troubleshooting

`Cookbook config is invalid`
- Run `seedCookbookConfig()` again.
- If using `drive_json`, set `TELEMETRY_COOKBOOK_DRIVE_FOLDER_ID`.
- If using `storage_json`, set `TELEMETRY_COOKBOOK_STORAGE_URI`.
- Fractional values for integer fields are rejected intentionally.

`No telemetry records were returned`
- Keep `TELEMETRY_COOKBOOK_SAMPLE_RATE` above `0`.
- The cookbook forces `sampleRate=1` internally, so this usually indicates code was modified or the library version is stale.

`Chat webhook or email preview fails validation`
- Chat webhook URLs must start with `https://`.
- Email recipients should be comma-separated addresses.
- Real delivery requires additional OAuth scopes; dry-run does not.

## Suggested validation flow

1. `seedCookbookConfig()`
2. `validateCookbookConfig()`
3. `runCookbookSmoke()`
4. `runCookbookDemo()`
5. `runCookbookAll()`
