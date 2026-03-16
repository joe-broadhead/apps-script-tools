# Storage Cache Warmer Cookbook

Focused Apps Script cookbook that warms and validates a persisted `AST.Cache` object using the `storage_json` backend.

It is intentionally smaller than the template-v2 cookbooks because it exists to prove one narrow pattern clearly:

- write a cache heartbeat into object storage
- read it back immediately
- confirm the configured backend/namespace/URI are wired correctly

Supported storage URI schemes:

- `gcs://...` or `gs://...`
- `s3://...`
- `dbfs:/...`

## What it covers

- `AST.Cache.set(...)` with `backend: 'storage_json'`
- `AST.Cache.get(...)` roundtrip verification
- minimal persisted-cache smoke validation for scheduled warmers or health checks

## Files

- `src/main.gs`: runnable entrypoint (`runStorageCacheWarmerSmoke`)
- `src/appsscript.json`: library binding + OAuth scopes
- `.clasp.json.example`: local clasp config template

## Setup

1. Copy `.clasp.json.example` to `.clasp.json`.
2. Set your target `scriptId`.
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `src/appsscript.json`.
4. Set the required Script Properties.
5. Configure provider credentials using the normal `AST.Storage` properties for GCS/S3/DBFS.
6. Push with `clasp push`.
7. Run `runStorageCacheWarmerSmoke()`.

## Script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `STORAGE_CACHE_URI` | Yes | none | Target cache object URI. Use `gcs://`, `gs://`, `s3://`, or `dbfs:/`. |
| `STORAGE_CACHE_NAMESPACE` | No | `cookbook_cache_warmer` | Cache namespace used for the warmed key. |

## Entrypoint

### `runStorageCacheWarmerSmoke()`

The smoke run:

1. reads `STORAGE_CACHE_URI` and optional namespace from Script Properties
2. writes a heartbeat payload to the configured `storage_json` cache
3. reads the same key back immediately
4. returns whether the persisted cache roundtrip succeeded

## Expected output shape

`runStorageCacheWarmerSmoke()` returns a payload like:

```json
{
  "namespace": "cookbook_cache_warmer",
  "key": "warmup:heartbeat",
  "hit": true,
  "storageUri": "gcs://bucket/path/cache.json"
}
```

## OAuth scopes

`src/appsscript.json` currently requests:

- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/cloud-platform`

If you use only non-GCP backends, keep the manifest aligned with the provider you actually need.

## Troubleshooting

`Missing script property STORAGE_CACHE_URI`

- Set `STORAGE_CACHE_URI` in Script Properties before running the smoke function.

`The smoke run returns hit=false`

- Confirm provider auth is configured correctly.
- Confirm the URI uses a supported scheme: `gcs://`, `gs://`, `s3://`, or `dbfs:/`.
- Confirm the target object path is writable by the configured identity.

`You want a fuller cache/config cookbook`

- Use `cookbooks/config_cache_patterns` for the broader template-v2 example.
- Keep this cookbook for the smallest persisted-cache smoke path.
