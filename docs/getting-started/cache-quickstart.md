# Cache Quick Start

## Import alias

```javascript
const ASTX = ASTLib.AST || ASTLib;
```

## Configure runtime defaults

```javascript
function configureCacheRuntime() {
  const ASTX = ASTLib.AST || ASTLib;
  ASTX.Cache.configure({
    CACHE_BACKEND: 'memory',
    CACHE_NAMESPACE: 'app_cache',
    CACHE_TTL_SEC: 300
  });
}
```

Common script property keys:

- `CACHE_BACKEND`
- `CACHE_NAMESPACE`
- `CACHE_TTL_SEC`
- `CACHE_STORAGE_URI` (for `storage_json` backend)

## Basic set/get/delete

```javascript
function cacheBasicExample() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Cache.set('dashboard:summary', { ok: true }, { tags: ['dashboard'] });

  const cached = ASTX.Cache.get('dashboard:summary');
  Logger.log(JSON.stringify(cached));

  ASTX.Cache.delete('dashboard:summary');
}
```

## Batch read/write/fetch

```javascript
function cacheBatchExample() {
  const ASTX = ASTLib.AST || ASTLib;

  ASTX.Cache.setMany([
    { key: 'summary:1', value: { ok: true } },
    { key: 'summary:2', value: { ok: true } }
  ], {
    ttlSec: 120,
    tags: ['summary']
  });

  const out = ASTX.Cache.getMany(['summary:1', 'summary:2', 'summary:3']);
  Logger.log(JSON.stringify(out.stats));

  const fetched = ASTX.Cache.fetchMany(['summary:3', 'summary:4'], payload => {
    return { generatedFor: payload.requestedKey };
  }, {
    ttlSec: 120,
    staleTtlSec: 600
  });

  Logger.log(JSON.stringify(fetched.items));
}
```

## Stale-while-revalidate fetch

```javascript
function cacheFetchExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Cache.fetch('daily:totals', () => {
    return { generatedAt: new Date().toISOString(), value: 42 };
  }, {
    ttlSec: 60,
    staleTtlSec: 300,
    tags: ['daily']
  });

  Logger.log(JSON.stringify(out.value));
}
```

## Invalidate by tag

```javascript
function cacheInvalidateExample() {
  const ASTX = ASTLib.AST || ASTLib;
  const removed = ASTX.Cache.invalidateByTag('daily');
  Logger.log(removed);
}
```

## Notes

- Backends: `memory`, `drive_json`, `script_properties`, `storage_json`.
- For multi-instance durability, prefer `storage_json` with `CACHE_STORAGE_URI`.
- `stats()` returns backend hit/miss counters and eviction metadata.
