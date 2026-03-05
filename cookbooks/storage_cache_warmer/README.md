# Storage Cache Warmer Cookbook

Practical Apps Script cookbook that uses `AST.Cache` with `storage_json` backend to warm and validate a persisted cache object on GCS/S3/DBFS.

## Files

- `src/main.gs`: runnable entrypoint (`runStorageCacheWarmerSmoke`)
- `src/appsscript.json`: library binding + scopes
- `.clasp.json.example`: local clasp config template

## Setup

1. Copy clasp config and set your target script id:

```bash
cp .clasp.json.example .clasp.json
```

2. Set script properties:

- `STORAGE_CACHE_URI` (for example `gcs://bucket/path/cache.json`)
- `STORAGE_CACHE_NAMESPACE` (optional; defaults to `cookbook_cache_warmer`)

3. Configure provider credentials using AST.Storage-supported properties (for GCS/S3/DBFS).
4. Set the published AST library version in `src/appsscript.json`.
5. Push and run:

```bash
clasp push
# Run runStorageCacheWarmerSmoke from Apps Script editor or clasp run.
```

## Notes

- Uses public `AST.Cache` APIs only.
- Good baseline for scheduled warm-cache jobs.
