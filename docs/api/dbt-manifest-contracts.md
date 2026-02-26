# dbt Manifest Contracts

## Namespace

```javascript
ASTX.DBT.run(request)
ASTX.DBT.loadManifest(request)
ASTX.DBT.loadArtifact(request)
ASTX.DBT.inspectManifest(request)
ASTX.DBT.inspectArtifact(request)
ASTX.DBT.listEntities(request)
ASTX.DBT.search(request)
ASTX.DBT.getEntity(request)
ASTX.DBT.getColumn(request)
ASTX.DBT.lineage(request)
ASTX.DBT.diffEntities(request)
ASTX.DBT.impact(request)
ASTX.DBT.providers()
ASTX.DBT.capabilities(provider)
ASTX.DBT.validateManifest(request)
ASTX.DBT.configure(config, options)
ASTX.DBT.getConfig()
ASTX.DBT.clearConfig()
```

## Source request contract

```javascript
{
  uri: 'drive://file/<FILE_ID>' |
       'drive://path/<FOLDER_ID>/<FILE_NAME>' |
       'gcs://bucket/path/manifest.json' |
       's3://bucket/path/manifest.json' |
       'dbfs:/path/manifest.json',
  fileId: 'DRIVE_FILE_ID',
  provider: 'drive|gcs|s3|dbfs',
  location: { ... },
  auth: { ... },
  providerOptions: { ... },
  options: {
    validate: 'strict|basic|off',
    schemaVersion: 'v12',
    maxBytes: 52428800,
    allowGzip: true,
    buildIndex: true,
    includeRaw: false
  }
}
```

## `loadManifest(...)` response

```javascript
{
  status: 'ok',
  source: { provider, uri, location },
  metadata: {
    dbtSchemaVersion,
    dbtVersion,
    generatedAt,
    projectName,
    projectId
  },
  counts: {
    entityCount,
    columnCount,
    sectionCounts
  },
  validation: {
    valid,
    mode,
    schemaVersion,
    errors,
    warnings,
    stats
  },
  bundle,
  warnings
}
```

`bundle` is reusable for `search`, `getEntity`, `getColumn`, `lineage`, `diffEntities`, and `impact`.

## `loadArtifact(...)` request

```javascript
{
  artifactType: 'catalog|run_results|sources',
  artifact: { ... }, // optional inline payload
  // OR source locator contract (uri/fileId/provider/location)
  options: {
    validate: 'strict|basic|off',
    maxBytes: 52428800,
    allowGzip: true,
    includeRaw: false
  }
}
```

## `loadArtifact(...)` response

```javascript
{
  status: 'ok|invalid',
  artifactType,
  source,
  metadata,
  summary,
  validation,
  bundle,
  warnings
}
```

## `inspectManifest(...)` and `inspectArtifact(...)`

Both return summary metadata from either a preloaded bundle or a source/input payload.

## `diffEntities(...)`

```javascript
{
  leftBundle | leftManifest | leftSource,
  rightBundle | rightManifest | rightSource,
  includeUnchanged: false,
  changeTypes: ['added', 'removed', 'modified'],
  include: {
    columns: true,
    meta: true,
    stats: true
  },
  page: {
    limit: 50,
    offset: 0
  }
}
```

Response is deterministic and pagination-safe:

```javascript
{
  status: 'ok',
  summary: {
    leftEntityCount,
    rightEntityCount,
    added,
    removed,
    modified,
    unchanged
  },
  page: { limit, offset, returned, total, hasMore },
  items: [
    {
      uniqueId,
      changeType: 'added|removed|modified|unchanged',
      left,
      right,
      diff // present for modified
    }
  ],
  stats
}
```

## `impact(...)`

```javascript
{
  bundle | manifest | source,
  uniqueId: 'model.pkg.name',
  direction: 'upstream|downstream|both',
  depth: 2,
  includeDisabled: false,
  artifacts: {
    run_results: { bundle | artifact | uri | provider+location },
    catalog: { bundle | artifact | uri | provider+location },
    sources: { bundle | artifact | uri | provider+location }
  }
}
```

`impact(...)` returns lineage plus optional artifact overlays per node (`runResults`, `catalog`, `sources`).

## Typed errors

- `AstDbtError`
- `AstDbtValidationError`
- `AstDbtLoadError`
- `AstDbtParseError`
- `AstDbtSchemaError`
- `AstDbtNotFoundError`
- `AstDbtCapabilityError`
