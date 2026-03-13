# Storage Ops Cookbook

This cookbook demonstrates practical `AST.Storage` workflows against dedicated scratch prefixes on `gcs://`, `s3://`, or `dbfs:/`.

It follows the cookbook template v2 contract from `/Users/joe/Documents/Joe/Github/apps-script-tools/cookbooks/_template` and uses public `AST` APIs only.

## What it covers

- `ASTX.Storage.list`
- `ASTX.Storage.head`
- `ASTX.Storage.read`
- `ASTX.Storage.write`
- `ASTX.Storage.delete`
- `ASTX.Storage.walk`
- `ASTX.Storage.transfer`
- `ASTX.Storage.copyPrefix`
- `ASTX.Storage.deletePrefix`
- `ASTX.Storage.sync`

The smoke flow exercises dry-run plus execution mode for bulk prefix operations. The demo flow covers single-object transfer, list/head/read/write/delete, and cleanup summaries.

## Folder contract

```text
cookbooks/storage_ops/
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
3. Replace `<PUBLISHED_AST_LIBRARY_VERSION>` in `/Users/joe/Documents/Joe/Github/apps-script-tools/cookbooks/storage_ops/src/appsscript.json`.
4. Push with `clasp push`.
5. Run `seedCookbookConfig()`.
6. Update the seeded script properties to real scratch prefixes.
7. Run `runCookbookAll()`.

## Script properties

Cookbook-specific keys:

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `STORAGE_OPS_APP_NAME` | Yes | `AST Storage Ops Cookbook` | Display name used in outputs. |
| `STORAGE_OPS_SOURCE_URI` | Yes | `gcs://example-bucket/cookbooks/storage_ops/source/` | Dedicated scratch source prefix. Must end with `/`. |
| `STORAGE_OPS_TARGET_URI` | Yes | `gcs://example-bucket/cookbooks/storage_ops/target/` | Dedicated scratch target prefix. Must end with `/`. |
| `STORAGE_OPS_EXECUTE_WRITES` | No | `true` | When `true`, smoke/demo execute real writes and cleanup. |
| `STORAGE_OPS_DELETE_EXTRA` | No | `true` | When `true`, sync deletes target objects that are missing from source. |
| `STORAGE_OPS_CONTINUE_ON_ERROR` | No | `false` | When `true`, bulk ops keep going and report failed items instead of stopping on first error. |

Provider auth/config comes from normal `AST.Storage` resolution rules.

### GCS

Use either:

- `GCS_SERVICE_ACCOUNT_JSON`
- or an Apps Script runtime with OAuth access to the bucket

Example:

```text
STORAGE_OPS_SOURCE_URI=gcs://my-bucket/cookbooks/storage_ops/source/
STORAGE_OPS_TARGET_URI=gcs://my-bucket/cookbooks/storage_ops/target/
GCS_SERVICE_ACCOUNT_JSON={...}
```

`gs://` aliases are also accepted and normalized.

### S3

Required:

- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_REGION`

Optional:

- `S3_SESSION_TOKEN`
- `S3_ENDPOINT` for S3-compatible storage

Example:

```text
STORAGE_OPS_SOURCE_URI=s3://raw-bucket/cookbooks/storage_ops/source/
STORAGE_OPS_TARGET_URI=s3://curated-bucket/cookbooks/storage_ops/target/
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=eu-west-1
```

### DBFS

Required:

- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`

Example:

```text
STORAGE_OPS_SOURCE_URI=dbfs:/tmp/cookbooks/storage_ops/source/
STORAGE_OPS_TARGET_URI=dbfs:/tmp/cookbooks/storage_ops/target/
DATABRICKS_HOST=https://<workspace>.cloud.databricks.com
DATABRICKS_TOKEN=dapi...
```

## Entrypoints

- `seedCookbookConfig()`: seeds cookbook script properties with placeholders/defaults.
- `validateCookbookConfig()`: validates required keys, URI safety, and resolved config.
- `runCookbookSmoke()`: deterministic bulk smoke flow with `walk`, `copyPrefix`, `sync`, and `deletePrefix`.
- `runCookbookDemo()`: richer object + prefix workflow using `list`, `head`, `read`, `write`, `delete`, `walk`, `transfer`, and cleanup.
- `runCookbookAll()`: runs smoke + demo and returns one structured payload.

## Safety notes

- This cookbook mutates and deletes objects under the configured prefixes.
- Use dedicated scratch prefixes only. Do not point it at shared production paths.
- The code rejects root-like prefixes and requires trailing `/`.
- The smoke flow cleans up the scratch prefixes it creates after execution.
- Set `STORAGE_OPS_EXECUTE_WRITES=false` if you want plan-only output while validating auth and path resolution.

## OAuth scopes

This cookbook relies on `AST.Storage`, so the main scope requirement is:

- `https://www.googleapis.com/auth/script.external_request`

Keep the manifest least-privilege. Add more scopes only if your script combines this cookbook with other Apps Script services outside `AST.Storage`.

## Expected output shape

`runCookbookSmoke()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "dryRun": {
    "copy": { "processed": 2, "copied": 0, "skipped": 2, "failed": 0 },
    "sync": { "processed": 2, "copied": 0, "deleted": 0, "skipped": 3, "failed": 0 }
  },
  "executed": {
    "copy": { "processed": 2, "copied": 2, "failed": 0 },
    "sync": { "processed": 2, "copied": 2, "deleted": 1, "failed": 0 }
  }
}
```

`runCookbookDemo()` returns a payload like:

```json
{
  "status": "ok",
  "operations": {
    "list": { "count": 2 },
    "head": { "mimeType": "application/json" },
    "read": { "hasJson": true },
    "transfer": { "mode": "object", "copied": 1 },
    "deletePrefix": { "deleted": 2 }
  }
}
```

## Troubleshooting

`Cookbook config is invalid`

- Run `seedCookbookConfig()` again.
- Replace the placeholder `example-bucket` URIs with real scratch prefixes.
- Ensure both URIs end with `/` and are not the same prefix.

`Storage operation failed with auth errors`

- Confirm the provider-specific credentials are set in Script Properties.
- Re-authorize the script after changing scopes or library versions.

`The smoke flow skipped execution`

- Set `STORAGE_OPS_EXECUTE_WRITES=true` to run the real copy/sync/delete steps.

`Delete or sync touched the wrong objects`

- Raise the safety bar: use deeper scratch prefixes, for example `.../cookbooks/storage_ops/source/`.
- Review the dry-run summaries before turning writes on.
