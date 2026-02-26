# dbt Artifacts, Diff, and Impact

Use `ASTX.DBT` artifact APIs to combine `manifest.json` lineage with `catalog.json`, `run_results.json`, and `sources.json` operational metadata.

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Load artifacts

```javascript
const runResults = ASTX.DBT.loadArtifact({
  artifactType: 'run_results',
  uri: 'gcs://my-bucket/dbt/run_results.json',
  options: { validate: 'strict' }
});

const catalog = ASTX.DBT.loadArtifact({
  artifactType: 'catalog',
  uri: 'gcs://my-bucket/dbt/catalog.json',
  options: { validate: 'strict' }
});

const freshness = ASTX.DBT.loadArtifact({
  artifactType: 'sources',
  uri: 'gcs://my-bucket/dbt/sources.json',
  options: { validate: 'strict' }
});
```

## Diff two manifest snapshots

```javascript
const diff = ASTX.DBT.diffEntities({
  leftBundle: prevManifest.bundle,
  rightBundle: nextManifest.bundle,
  includeUnchanged: false,
  changeTypes: ['added', 'removed', 'modified'],
  page: { limit: 100, offset: 0 }
});

Logger.log(diff.summary);
Logger.log(diff.items.slice(0, 5));
```

## Build impact view with artifact overlays

```javascript
const impact = ASTX.DBT.impact({
  bundle: nextManifest.bundle,
  uniqueId: 'model.analytics.orders',
  direction: 'downstream',
  depth: 2,
  artifacts: {
    run_results: { bundle: runResults.bundle },
    catalog: { bundle: catalog.bundle },
    sources: { bundle: freshness.bundle }
  }
});

Logger.log(impact.nodes);
Logger.log(impact.edges);
```

## Notes

- `diffEntities` is deterministic: stable sorting + pagination-safe output.
- `impact` does not require all artifact types; pass only what you have.
- Providers follow existing DBT source contracts: Drive, GCS, S3, DBFS.
