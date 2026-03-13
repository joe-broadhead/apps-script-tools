# Config Cache Patterns Cookbook

This cookbook demonstrates secure runtime composition patterns using public `AST` APIs only:

- `ASTX.Config.schema(...)`
- `ASTX.Config.bind(...)`
- `ASTX.Runtime.configureFromProps(...)`
- `ASTX.Secrets.get(...)`
- `ASTX.Secrets.resolveValue(...)`
- `ASTX.Secrets.rotate(...)`
- `ASTX.Cache.fetch(...)`
- `ASTX.Cache.fetchMany(...)`
- `ASTX.Cache.invalidateByTag(...)`
- `ASTX.Cache.invalidateByPrefix(...)`
- `ASTX.Cache.invalidateByPredicate(...)`

It follows the cookbook template v2 contract from `/Users/joe/Documents/Joe/Github/apps-script-tools/cookbooks/_template`.

## What it covers

Smoke flow:

1. bind typed config with deterministic precedence (`request > runtime > script properties`)
2. hydrate `AST.Cache` and `AST.Secrets` via `AST.Runtime.configureFromProps(...)`
3. resolve a `secret://script_properties/...` reference safely
4. verify cache miss -> hit transitions with `AST.Cache.fetch(...)` and `AST.Cache.fetchMany(...)`

Demo flow:

1. rotate a script-properties secret and restore it
2. exercise `setMany`, `fetchMany`, and invalidation by tag/prefix/predicate
3. optionally switch the demo cache backend from `memory` to `storage_json`

## Folder contract

```text
cookbooks/config_cache_patterns/
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
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `/Users/joe/Documents/Joe/Github/apps-script-tools/cookbooks/config_cache_patterns/src/appsscript.json`.
4. Push with `clasp push`.
5. Run `seedCookbookConfig()`.
6. Run `runCookbookAll()`.

## Script properties

Cookbook keys:

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `CONFIG_CACHE_PATTERNS_APP_NAME` | Yes | `AST Config Cache Patterns` | Display name used in outputs. |
| `CONFIG_CACHE_PATTERNS_ENV` | Yes | `prod` | Script-property baseline for precedence demos (`dev`, `stage`, `prod`). |
| `CONFIG_CACHE_PATTERNS_TIMEOUT_MS` | No | `30000` | Typed integer config example. |
| `CONFIG_CACHE_PATTERNS_ENABLE_BATCH` | No | `false` | Typed boolean config example. |
| `CONFIG_CACHE_PATTERNS_SECRET_REF` | Yes | `secret://script_properties/CONFIG_CACHE_PATTERNS_API_TOKEN` | Secret reference resolved by `AST.Secrets.resolveValue(...)`. |
| `CONFIG_CACHE_PATTERNS_CACHE_BACKEND` | No | `memory` | Demo cache backend (`memory` or `storage_json`). |
| `CONFIG_CACHE_PATTERNS_CACHE_NAMESPACE` | No | `cookbook_config_cache_patterns` | Base namespace for smoke/demo cache entries. |
| `CONFIG_CACHE_PATTERNS_CACHE_TTL_SEC` | No | `120` | TTL applied to cache examples. |
| `CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI` | No | `''` | Required only when backend is `storage_json`. |
| `CONFIG_CACHE_PATTERNS_API_TOKEN` | Yes | `replace-me-demo-token` | Script-properties secret used by the demo. |
| `CONFIG_CACHE_PATTERNS_ROTATABLE_SECRET` | Yes | `rotate-me-demo-token-v1` | Secret rotated and restored by the demo flow. |

## Safe defaults

The seeded defaults are intentionally low-risk:

- secrets use `script_properties`, not Secret Manager
- cache defaults to `memory`
- no network calls are required for the smoke flow
- no plaintext secret values are logged

## Optional `storage_json` backend

To test durable cache behavior, switch:

```text
CONFIG_CACHE_PATTERNS_CACHE_BACKEND=storage_json
CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI=gcs://my-bucket/cookbooks/config_cache_patterns/cache.json
```

Supported storage URIs:

- `gcs://...` or `gs://...`
- `s3://...`
- `dbfs:/...`

Provider auth comes from the normal library keys:

- GCS: `GCS_SERVICE_ACCOUNT_JSON` or Apps Script OAuth
- S3: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`
- DBFS: `DATABRICKS_HOST`, `DATABRICKS_TOKEN`

## Entrypoints

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

## Expected output shape

`runCookbookSmoke()` returns a payload like:

```json
{
  "status": "ok",
  "boundConfig": {
    "env": "dev",
    "timeoutMs": 15000,
    "enableBatch": true
  },
  "sources": {
    "CONFIG_CACHE_PATTERNS_ENV": "request",
    "CONFIG_CACHE_PATTERNS_ENABLE_BATCH": "runtime"
  },
  "cache": {
    "firstFetchHit": false,
    "secondFetchHit": true,
    "fetchMany": { "hits": 1, "misses": 2 }
  }
}
```

`runCookbookDemo()` returns a payload like:

```json
{
  "status": "ok",
  "secrets": {
    "rotated": true,
    "restored": true
  },
  "cache": {
    "backend": "memory",
    "invalidateByTag": 2,
    "invalidateByPrefix": 2,
    "invalidateByPredicate": 1
  }
}
```

## Production guidance

Recommended:

- use `AST.Config.schema(...)` once and reuse the compiled schema
- keep request overrides narrow and typed
- use `AST.Runtime.configureFromProps(...)` to hydrate module runtimes from curated config maps
- store plaintext secrets in Script Properties only for low-risk/internal projects
- use `storage_json` for shared multi-user cache workloads

Anti-patterns:

- logging raw secret values
- using `memory` cache as if it were shared across users/executions
- pointing `storage_json` at an unscoped shared prefix
- duplicating handwritten precedence logic instead of using `AST.Config.bind(...)`

## OAuth scopes

The default smoke path works with Script Properties only and typically needs no extra scopes beyond the library baseline.

If you enable:

- `storage_json`: add `https://www.googleapis.com/auth/script.external_request`
- Secret Manager: also add the OAuth scopes your GCP secret workflow requires

Keep the manifest least-privilege for the exact providers you use.

## Troubleshooting

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- If backend is `storage_json`, set `CONFIG_CACHE_PATTERNS_CACHE_STORAGE_URI`.

`Secret resolution fails`

- Confirm `CONFIG_CACHE_PATTERNS_SECRET_REF` points to `secret://script_properties/<KEY>`.
- Confirm the referenced key exists in Script Properties.

`storage_json demo fails`

- Check provider credentials for GCS/S3/DBFS.
- Confirm the storage URI is writable and scoped to a scratch prefix.
