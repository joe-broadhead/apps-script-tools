# HTTP Ingestion Pipeline Cookbook

This cookbook demonstrates resilient third-party API integration with `AST.Http`, plus optional composition with `AST.Cache` and `AST.Telemetry`.

It uses only public `AST` APIs:

- `ASTX.Http.request(...)`
- `ASTX.Http.requestBatch(...)`
- `ASTX.Http.configure(...)`
- `ASTX.Cache.fetch(...)`
- `ASTX.Cache.configure(...)`
- `ASTX.Telemetry.startSpan(...)`
- `ASTX.Telemetry.recordEvent(...)`
- `ASTX.Telemetry.endSpan(...)`
- `ASTX.Telemetry.getTrace(...)`

## What it covers

Smoke flow:

1. configure `AST.Http` timeout, retries, and user agent defaults
2. execute one successful request against a deterministic public endpoint
3. execute a mixed `requestBatch(...)` flow with success + not-found error handling
4. return a normalized summary with safe redaction of URL/query/header metadata

Demo flow:

1. demonstrate cached HTTP fetch via `AST.Cache.fetch(...)`
2. capture a transient failure path (`429`) and deterministic failure path (`404`)
3. record one telemetry span and one telemetry event around batch execution
4. return a safe logging example that redacts token-like query params and headers

## Folder contract

```text
cookbooks/http_ingestion_pipeline/
  README.md
  .clasp.json.example
  .claspignore
  src/
    appsscript.json
    00_Config.gs
    10_EntryPoints.gs
    20_Smoke.gs
    30_Examples.gs
    99_DevTools.gs
```

## Setup

1. Copy `.clasp.json.example` to `.clasp.json`.
2. Set your Apps Script `scriptId`.
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
4. Push with `clasp push`.
5. Run `seedCookbookConfig()`.
6. Run `runCookbookAll()`.

## Script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `HTTP_COOKBOOK_APP_NAME` | Yes | `AST HTTP Ingestion Pipeline` | Display name included in outputs. |
| `HTTP_COOKBOOK_SUCCESS_URL` | No | `https://httpbin.org/anything/ast-http-cookbook?source=smoke&token=demo-token` | Success endpoint used by smoke/demo. |
| `HTTP_COOKBOOK_NOT_FOUND_URL` | No | `https://httpbin.org/status/404` | Deterministic non-transient failure endpoint. |
| `HTTP_COOKBOOK_TRANSIENT_URL` | No | `https://httpbin.org/status/429` | Deterministic transient failure endpoint. |
| `HTTP_COOKBOOK_TIMEOUT_MS` | No | `15000` | Runtime timeout budget forwarded to `AST.Http`. |
| `HTTP_COOKBOOK_RETRIES` | No | `1` | Retry count for `AST.Http` requests. |
| `HTTP_COOKBOOK_USER_AGENT` | No | `apps-script-tools-http-cookbook/1.0` | User agent override. |
| `HTTP_COOKBOOK_CACHE_ENABLED` | No | `true` | Enable `AST.Cache` composition in demo flow. |
| `HTTP_COOKBOOK_CACHE_BACKEND` | No | `memory` | `memory`, `drive_json`, `script_properties`, or `storage_json`. |
| `HTTP_COOKBOOK_CACHE_NAMESPACE` | No | `ast_http_cookbook` | Cache namespace for fetch examples. |
| `HTTP_COOKBOOK_CACHE_TTL_SEC` | No | `120` | Fresh cache TTL seconds. |
| `HTTP_COOKBOOK_CACHE_STALE_TTL_SEC` | No | `300` | Stale cache TTL seconds. |
| `HTTP_COOKBOOK_CACHE_STORAGE_URI` | No | `''` | Required when `storage_json` is selected. |
| `HTTP_COOKBOOK_TELEMETRY_ENABLED` | No | `true` | Enable `AST.Telemetry` span/event example. |

## Timeout and retry tuning

Default behavior in this cookbook:

```text
HTTP_COOKBOOK_TIMEOUT_MS=15000
HTTP_COOKBOOK_RETRIES=1
```

Practical guidance:

- lower `HTTP_COOKBOOK_TIMEOUT_MS` for latency-sensitive ingest steps
- increase `HTTP_COOKBOOK_RETRIES` only for genuinely transient upstreams
- treat `429` and `5xx` as retryable/transient cases
- treat `404` and most other `4xx` responses as deterministic failures that should surface immediately

## Cache and telemetry composition

Recommended default for smoke/demo work:

```text
HTTP_COOKBOOK_CACHE_ENABLED=true
HTTP_COOKBOOK_CACHE_BACKEND=memory
HTTP_COOKBOOK_CACHE_TTL_SEC=120
HTTP_COOKBOOK_CACHE_STALE_TTL_SEC=300
HTTP_COOKBOOK_TELEMETRY_ENABLED=true
```

For shared scheduled workloads, use persisted cache:

```text
HTTP_COOKBOOK_CACHE_BACKEND=storage_json
HTTP_COOKBOOK_CACHE_STORAGE_URI=gcs://my-bucket/http/cache.json
```

## Safe redaction/logging pattern

This cookbook intentionally avoids logging raw `Authorization`, API key, cookie, or token-like query parameter values.

Redaction examples included in the demo:

- query params like `token=...` become `token=[REDACTED]`
- headers like `Authorization` become `[REDACTED]`

## Entrypoints

Required template entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

Additional helper entrypoints:

- `showCookbookSources()`
- `showCookbookContract()`

## Expected output shape

`runCookbookSmoke()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "request": {
    "statusCode": 200,
    "attempts": 1
  },
  "batch": {
    "total": 2,
    "success": 1,
    "failed": 1
  }
}
```

`runCookbookDemo()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "cache": {
    "cacheHit": false,
    "source": "resolver"
  },
  "failures": {
    "transient": {
      "name": "AstHttpRateLimitError"
    },
    "deterministic": {
      "name": "AstHttpNotFoundError"
    }
  },
  "telemetry": {
    "status": "ok"
  }
}
```

## OAuth scopes

Required Apps Script scope:

- `https://www.googleapis.com/auth/script.external_request`

## Troubleshooting

`Cookbook config is invalid`

- Ensure all configured URLs use `https://`.
- If using `storage_json`, provide `HTTP_COOKBOOK_CACHE_STORAGE_URI`.
- Keep stale TTL greater than or equal to fresh TTL.

`Transient failure never retries`

- Increase `HTTP_COOKBOOK_RETRIES`.
- Verify the upstream returns transient statuses like `429` or `5xx`.

`Safe logging still shows secrets`

- Route all logged request metadata through the cookbook redaction helpers.
- Avoid logging raw request headers or full URLs directly.
