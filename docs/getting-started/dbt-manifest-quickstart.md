# dbt Manifest Quick Start

Use `ASTX.DBT` to load a dbt `manifest.json`, preindex it once, then run fast metadata/search/lineage queries.

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## 1) Load a manifest

### Drive URI (file ID)

```javascript
const loaded = ASTX.DBT.loadManifest({
  uri: 'drive://file/1AbCdEfGhIjKlMnOpQrStUvWxYz',
  options: {
    validate: 'strict',
    schemaVersion: 'v12',
    buildIndex: true
  }
});
```

### Drive URI (folder + filename)

```javascript
const loaded = ASTX.DBT.loadManifest({
  uri: 'drive://path/1FolderIdHere/manifest.json',
  options: {
    validate: 'strict',
    schemaVersion: 'v12',
    buildIndex: true
  }
});
```

### Cloud storage URI

```javascript
const loaded = ASTX.DBT.loadManifest({
  uri: 'gcs://my-bucket/dbt/manifest.json',
  options: {
    validate: 'strict',
    schemaVersion: 'v12',
    buildIndex: true
  }
});
```

## 2) Search entities and columns

```javascript
const result = ASTX.DBT.search({
  bundle: loaded.bundle,
  target: 'all',
  query: 'orders',
  filters: {
    resourceTypes: ['model'],
    tagsAny: ['finance'],
    column: {
      namesAny: ['order_id']
    }
  },
  include: {
    meta: true,
    columns: 'summary'
  },
  page: {
    limit: 20,
    offset: 0
  }
});

Logger.log(result.items);
```

## 3) Read deep metadata

```javascript
const entity = ASTX.DBT.getEntity({
  bundle: loaded.bundle,
  uniqueId: 'model.analytics.orders',
  include: {
    meta: true,
    columns: 'full'
  }
});

const column = ASTX.DBT.getColumn({
  bundle: loaded.bundle,
  uniqueId: 'model.analytics.orders',
  columnName: 'order_id'
});
```

## 4) Traverse lineage

```javascript
const lineage = ASTX.DBT.lineage({
  bundle: loaded.bundle,
  uniqueId: 'model.analytics.orders',
  direction: 'both',
  depth: 2,
  includeDisabled: false
});

Logger.log(lineage.nodes);
Logger.log(lineage.edges);
```

## 5) Validate only

```javascript
const validation = ASTX.DBT.validateManifest({
  bundle: loaded.bundle,
  options: {
    validate: 'strict',
    schemaVersion: 'v12'
  }
});

if (!validation.valid) {
  Logger.log(validation.errors);
}
```

## 6) Load artifacts and compute impact

```javascript
const runResults = ASTX.DBT.loadArtifact({
  artifactType: 'run_results',
  uri: 'gcs://my-bucket/dbt/run_results.json',
  options: { validate: 'strict' }
});

const impact = ASTX.DBT.impact({
  bundle: loaded.bundle,
  uniqueId: 'model.analytics.orders',
  direction: 'downstream',
  depth: 2,
  artifacts: {
    run_results: { bundle: runResults.bundle }
  }
});

Logger.log(impact.nodes);
```

## Runtime defaults via Script Properties

Supported keys:

- `DBT_MANIFEST_URI`
- `DBT_MANIFEST_DRIVE_FILE_ID`
- `DBT_MANIFEST_VALIDATE`
- `DBT_MANIFEST_SCHEMA_VERSION`
- `DBT_MANIFEST_MAX_BYTES`

Precedence is deterministic: request > `ASTX.DBT.configure(...)` > Script Properties.
