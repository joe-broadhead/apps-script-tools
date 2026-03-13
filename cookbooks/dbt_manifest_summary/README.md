# DBT Artifact Explorer Cookbook

This cookbook upgrades the original `dbt_manifest_summary` example into a template-v2 project that demonstrates production-style `AST.DBT` workflows.

It uses only public `AST` APIs:

- `ASTX.DBT.loadManifest(...)`
- `ASTX.DBT.loadArtifact(...)`
- `ASTX.DBT.inspectManifest(...)`
- `ASTX.DBT.inspectArtifact(...)`
- `ASTX.DBT.search(...)`
- `ASTX.DBT.getEntity(...)`
- `ASTX.DBT.getColumn(...)`
- `ASTX.DBT.lineage(...)`
- `ASTX.DBT.columnLineage(...)`
- `ASTX.DBT.impact(...)`
- `ASTX.DBT.diffEntities(...)`
- `ASTX.DBT.compareArtifacts(...)`
- `ASTX.DBT.owners(...)`
- `ASTX.DBT.searchOwners(...)`
- `ASTX.DBT.ownerCoverage(...)`

## What it covers

Smoke flow:

1. load a real dbt `manifest.json` from Drive or any DBT source URI
2. optionally use persistent compact/full cache for large manifests
3. inspect manifest metadata and counts
4. load and inspect an additional inline `run_results` artifact
5. run `search`, `getEntity`, `getColumn`, and `lineage` against the live manifest bundle

Demo flow:

1. run governance helpers (`owners`, `searchOwners`, `ownerCoverage`) on the live manifest
2. execute deterministic inline fixture demos for `columnLineage`, `diffEntities`, `compareArtifacts`, and `impact`
3. optionally load external `catalog`, `run_results`, and `sources` artifacts from Drive, GCS, S3, or DBFS and inspect them

## Folder contract

```text
cookbooks/dbt_manifest_summary/
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
5. Set either a Drive file id or manifest URI in Script Properties.
6. Run `seedCookbookConfig()`.
7. Run `runCookbookAll()`.

## Cookbook script properties

| Key | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DBT_ARTIFACT_EXPLORER_APP_NAME` | Yes | `AST DBT Artifact Explorer` | Display name included in outputs. |
| `DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID` | No | `''` | Drive file id for `manifest.json`. |
| `DBT_ARTIFACT_EXPLORER_MANIFEST_URI` | No | `''` | Optional source URI for the manifest (`drive://`, `gcs://`, `s3://`, `dbfs:/`). |
| `DBT_ARTIFACT_EXPLORER_VALIDATE_MODE` | No | `strict` | Validation mode for manifest and inline artifact loads. |
| `DBT_ARTIFACT_EXPLORER_SCHEMA_VERSION` | No | `v12` | Manifest schema version for this cookbook. |
| `DBT_ARTIFACT_EXPLORER_MAX_BYTES` | No | `52428800` | Max artifact bytes to read before parse. |
| `DBT_ARTIFACT_EXPLORER_CACHE_URI` | No | `''` | Optional persistent DBT bundle cache URI. |
| `DBT_ARTIFACT_EXPLORER_CACHE_MODE` | No | `compact` | Persistent cache mode (`compact` or `full`). |
| `DBT_ARTIFACT_EXPLORER_CACHE_INCLUDE_MANIFEST` | No | `false` | Include raw manifest in persistent cache payload. |
| `DBT_ARTIFACT_EXPLORER_OWNER_PATHS` | No | `owner.team,owner` | Comma-separated owner meta paths used by governance helpers. |
| `DBT_ARTIFACT_EXPLORER_CATALOG_URI` | No | `''` | Optional external `catalog.json` URI. |
| `DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI` | No | `''` | Optional external `run_results.json` URI. |
| `DBT_ARTIFACT_EXPLORER_SOURCES_URI` | No | `''` | Optional external `sources.json` URI. |

You must set at least one of:

- `DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID`
- `DBT_ARTIFACT_EXPLORER_MANIFEST_URI`

## Cache strategy guidance

For large manifests, enable persistent compact cache:

```text
DBT_ARTIFACT_EXPLORER_CACHE_URI=gcs://my-bucket/dbt/cache/manifest-cache.json
DBT_ARTIFACT_EXPLORER_CACHE_MODE=compact
DBT_ARTIFACT_EXPLORER_CACHE_INCLUDE_MANIFEST=false
```

Recommended defaults:

- `compact` for fast search/getEntity/lineage without storing the full manifest body in cache
- `full` only when you need raw manifest reuse without rereading the source file
- `gcs://...` or `gs://...` for shared GCP deployments
- `s3://...` or `dbfs:/...` for cross-cloud/shared execution scenarios

## Source examples

Manifest from Drive file id:

```text
DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID=1abc...
```

Manifest from Drive URI:

```text
DBT_ARTIFACT_EXPLORER_MANIFEST_URI=drive://file/1abc...
```

Manifest from GCS:

```text
DBT_ARTIFACT_EXPLORER_MANIFEST_URI=gcs://my-bucket/dbt/manifest.json
```

Optional external artifact examples:

```text
DBT_ARTIFACT_EXPLORER_CATALOG_URI=s3://my-bucket/dbt/catalog.json
DBT_ARTIFACT_EXPLORER_RUN_RESULTS_URI=gcs://my-bucket/dbt/run_results.json
DBT_ARTIFACT_EXPLORER_SOURCES_URI=dbfs:/mnt/dbt/sources.json
```

## Entrypoints

Required template entrypoints:

- `seedCookbookConfig()`
- `validateCookbookConfig()`
- `runCookbookSmoke()`
- `runCookbookDemo()`
- `runCookbookAll()`

Additional helper entrypoints:

- `runCookbookFixtureLab()`
- `showCookbookSources()`

## Expected output shape

`runCookbookSmoke()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookSmoke",
  "manifest": {
    "projectName": "analytics",
    "entityCount": 3500,
    "cacheHit": true
  },
  "artifact": {
    "artifactType": "run_results",
    "resultCount": 2
  },
  "sampleEntity": {
    "uniqueId": "model.pkg.orders",
    "columnName": "customer_id"
  }
}
```

`runCookbookDemo()` returns a payload like:

```json
{
  "status": "ok",
  "entrypoint": "runCookbookDemo",
  "governance": {
    "ownerCount": 4,
    "ownershipPct": 82
  },
  "fixtureLab": {
    "diff": {
      "modified": 1,
      "added": 1
    },
    "impact": {
      "nodeCount": 3,
      "edgeCount": 2
    }
  }
}
```

## OAuth scopes

Recommended baseline scopes:

- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/script.external_request`

If you only load from GCS/S3/DBFS and never from Drive, you can remove the Drive scope.

## Troubleshooting

`Cookbook config is invalid`

- Set either `DBT_ARTIFACT_EXPLORER_MANIFEST_FILE_ID` or `DBT_ARTIFACT_EXPLORER_MANIFEST_URI`.
- If cache is enabled, provide a supported `gcs://`, `gs://`, `s3://`, or `dbfs:/` URI.

`Manifest loads but cache never hits`

- Keep the manifest source stable.
- Reuse the same `DBT_ARTIFACT_EXPLORER_CACHE_URI` and `DBT_ARTIFACT_EXPLORER_CACHE_MODE`.
- Avoid forcing refresh unless you are intentionally invalidating cache contents.

`External artifact URI fails`

- Confirm the URI matches the artifact type (`catalog`, `run_results`, `sources`).
- Confirm provider auth is configured for GCS/S3/DBFS.
