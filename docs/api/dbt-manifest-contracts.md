# dbt Manifest Contracts

## Namespace

```javascript
ASTX.DBT.run(request)
ASTX.DBT.loadManifest(request)
ASTX.DBT.inspectManifest(request)
ASTX.DBT.listEntities(request)
ASTX.DBT.search(request)
ASTX.DBT.getEntity(request)
ASTX.DBT.getColumn(request)
ASTX.DBT.lineage(request)
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
  source: {
    provider,
    uri,
    location
  },
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

`bundle` is the reusable object for downstream calls (`search`, `getEntity`, `getColumn`, `lineage`).

## `inspectManifest(...)`

Returns manifest-level summary from any input (`bundle`, `manifest`, or source input).

## `listEntities(...)`

Equivalent to `search` with `target='entities'` and structured filters.

## `getEntity(...)`

```javascript
{
  bundle,
  uniqueId: 'model.pkg.name',
  include: {
    meta: true,
    columns: 'none|summary|full'
  }
}
```

## `getColumn(...)`

```javascript
{
  bundle,
  uniqueId: 'model.pkg.name',
  columnName: 'column_name'
}
```

## `lineage(...)`

```javascript
{
  bundle,
  uniqueId: 'model.pkg.name',
  direction: 'upstream|downstream|both',
  depth: 2,
  includeDisabled: false
}
```

Lineage uses `parent_map`/`child_map` when present and falls back to `depends_on.nodes` when needed.

## `validateManifest(...)`

```javascript
{
  bundle | manifest | source,
  options: {
    validate: 'strict|basic|off',
    schemaVersion: 'v12'
  },
  throwOnInvalid: false
}
```

## Typed errors

- `AstDbtError`
- `AstDbtValidationError`
- `AstDbtLoadError`
- `AstDbtParseError`
- `AstDbtSchemaError`
- `AstDbtNotFoundError`
- `AstDbtCapabilityError`
