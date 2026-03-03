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

## Invalidate by prefix and predicate

```javascript
function cacheAdvancedInvalidationExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const byPrefix = ASTX.Cache.invalidateByPrefix('daily:', {
    maxScan: 5000
  });
  Logger.log(JSON.stringify(byPrefix));

  const byPredicate = ASTX.Cache.invalidateByPredicate(entry => {
    return Array.isArray(entry.tags) && entry.tags.indexOf('stale') !== -1;
  }, {
    maxScan: 5000
  });
  Logger.log(JSON.stringify(byPredicate));
}
```

## Scoped lock helper

```javascript
function cacheLockExample() {
  const ASTX = ASTLib.AST || ASTLib;

  const out = ASTX.Cache.lock('report:daily:lock', () => {
    const current = ASTX.Cache.get('report:daily') || { runs: 0 };
    current.runs += 1;
    ASTX.Cache.set('report:daily', current, { ttlSec: 300 });
    return current;
  }, {
    timeoutMs: 10000,
    leaseMs: 30000
  });

  Logger.log(JSON.stringify(out));
}
```

## Notes

- Backends: `memory`, `drive_json`, `script_properties`, `storage_json`.
- For multi-instance durability, prefer `storage_json` with `CACHE_STORAGE_URI`.
- `stats()` returns backend hit/miss counters and eviction metadata.
- `invalidateByPrefix`/`invalidateByPredicate` are bounded scans (`maxScan` default `10000`).
- `lock` ensures single-writer execution with timeout/lease controls.
