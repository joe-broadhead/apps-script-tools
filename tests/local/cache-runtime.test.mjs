import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadCacheScripts } from './cache-helpers.mjs';

function createDriveMock() {
  const files = {};

  function createFileHandle(name, content = '') {
    const state = {
      name,
      content: String(content || ''),
      writeCount: 0
    };

    return {
      getName: () => state.name,
      getBlob: () => ({
        getDataAsString: () => state.content
      }),
      __getWriteCount: () => state.writeCount,
      setContent: value => {
        state.content = String(value || '');
        state.writeCount += 1;
      }
    };
  }

  const folder = {
    getFilesByName: name => {
      const key = String(name || '');
      const list = files[key] ? [files[key]] : [];
      let index = 0;
      return {
        hasNext: () => index < list.length,
        next: () => list[index++]
      };
    },
    createFile: (name, content) => {
      const key = String(name || '');
      const handle = createFileHandle(key, content);
      files[key] = handle;
      return handle;
    }
  };

  return {
    files,
    DriveApp: {
      getRootFolder: () => folder,
      getFolderById: () => folder
    }
  };
}

function createPropertiesService(seed = {}) {
  const store = { ...seed };
  const handle = {
    getProperty: key => {
      const normalized = String(key || '');
      return Object.prototype.hasOwnProperty.call(store, normalized) ? store[normalized] : null;
    },
    getProperties: () => ({ ...store }),
    setProperty: (key, value) => {
      store[String(key)] = String(value);
    },
    setProperties: (entries = {}, deleteAllOthers = false) => {
      if (deleteAllOthers) {
        Object.keys(store).forEach(key => delete store[key]);
      }

      const keys = Object.keys(entries || {});
      for (let idx = 0; idx < keys.length; idx += 1) {
        const key = keys[idx];
        store[String(key)] = String(entries[key]);
      }
    }
  };

  return {
    store,
    service: {
      getScriptProperties: () => handle
    }
  };
}

function createStorageRunnerMock() {
  const objects = {};
  const requests = [];

  function normalizeUri(uri) {
    return String(uri || '');
  }

  function buildNotFoundError() {
    const error = new Error('not found');
    error.name = 'AstStorageNotFoundError';
    return error;
  }

  function detectProvider(uri) {
    if (uri.startsWith('s3://')) return 's3';
    if (uri.startsWith('gcs://')) return 'gcs';
    return 'dbfs';
  }

  return {
    objects,
    requests,
    astRunStorageRequest: request => {
      requests.push(
        JSON.parse(
          JSON.stringify(request || {})
        )
      );
      const operation = String(request && request.operation || '').toLowerCase();
      const uri = normalizeUri(request && request.uri);
      const options = request && request.options ? request.options : {};

      if (!uri) {
        throw new Error('uri is required');
      }

      if (operation === 'list') {
        const keys = Object.keys(objects)
          .filter(key => key.startsWith(uri))
          .sort();
        const pageSize = Number.isInteger(options.pageSize) && options.pageSize > 0
          ? options.pageSize
          : keys.length || 1;
        const pageToken = Number.isInteger(Number(options.pageToken))
          ? Number(options.pageToken)
          : 0;
        const start = pageToken >= 0 ? pageToken : 0;
        const pageKeys = keys.slice(start, start + pageSize);
        const nextPageToken = start + pageSize < keys.length
          ? String(start + pageSize)
          : null;

        return {
          provider: detectProvider(uri),
          operation: 'list',
          uri,
          output: {
            items: pageKeys.map(key => ({
              uri: key,
              key
            }))
          },
          page: {
            nextPageToken,
            truncated: Boolean(nextPageToken)
          },
          usage: {
            requestCount: 1,
            bytesIn: 0,
            bytesOut: 0
          }
        };
      }

      if (operation === 'read') {
        if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
          throw buildNotFoundError();
        }

        return {
          provider: detectProvider(uri),
          operation: 'read',
          uri,
          output: {
            data: {
              text: objects[uri],
              mimeType: 'application/json'
            }
          },
          usage: {
            requestCount: 1,
            bytesIn: 0,
            bytesOut: String(objects[uri]).length
          }
        };
      }

      if (operation === 'write') {
        const payload = request && request.payload ? request.payload : {};

        if (typeof payload.text === 'string') {
          objects[uri] = payload.text;
        } else if (typeof payload.base64 === 'string') {
          objects[uri] = Buffer.from(payload.base64, 'base64').toString('utf8');
        } else if (typeof payload.json !== 'undefined') {
          objects[uri] = JSON.stringify(payload.json);
        } else {
          throw new Error('unsupported payload');
        }

        return {
          provider: detectProvider(uri),
          operation: 'write',
          uri,
          output: {
            written: {
              uri
            }
          },
          usage: {
            requestCount: 1,
            bytesIn: String(objects[uri]).length,
            bytesOut: 0
          }
        };
      }

      if (operation === 'delete') {
        if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
          throw buildNotFoundError();
        }

        delete objects[uri];
        return {
          provider: detectProvider(uri),
          operation: 'delete',
          uri,
          output: {
            deleted: {
              uri,
              deleted: true
            }
          },
          usage: {
            requestCount: 1,
            bytesIn: 0,
            bytesOut: 0
          }
        };
      }

      if (operation === 'head') {
        if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
          throw buildNotFoundError();
        }

        return {
          provider: detectProvider(uri),
          operation: 'head',
          uri,
          output: {
            object: {
              uri,
              size: String(objects[uri]).length
            }
          },
          usage: {
            requestCount: 1,
            bytesIn: 0,
            bytesOut: 0
          }
        };
      }

      throw new Error(`unsupported operation: ${operation}`);
    }
  };
}

test('AST exposes Cache surface and backend helpers', () => {
  const context = createGasContext();
  loadCacheScripts(context, { includeAst: true });

  const methods = [
    'get',
    'set',
    'fetch',
    'delete',
    'invalidateByTag',
    'stats',
    'backends',
    'capabilities',
    'configure',
    'getConfig',
    'clearConfig',
    'clear'
  ];

  methods.forEach(method => {
    assert.equal(typeof context.AST.Cache[method], 'function');
  });

  assert.equal(
    JSON.stringify(context.AST.Cache.backends()),
    JSON.stringify(['memory', 'drive_json', 'script_properties', 'storage_json'])
  );
});

test('memory backend supports set/get/delete/tag invalidation and stats', () => {
  const context = createGasContext();
  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    CACHE_BACKEND: 'memory',
    CACHE_NAMESPACE: `cache_mem_${Date.now()}`
  });

  const setResult = context.AST.Cache.set('k1', { value: 1 }, { tags: ['rag', 'ai'] });
  assert.equal(setResult.backend, 'memory');
  assert.equal(setResult.namespace.startsWith('cache_mem_'), true);

  assert.equal(
    JSON.stringify(context.AST.Cache.get('k1')),
    JSON.stringify({ value: 1 })
  );
  assert.equal(context.AST.Cache.get('missing'), null);

  context.AST.Cache.set('k2', { value: 2 }, { tags: ['rag'] });
  context.AST.Cache.set('k3', { value: 3 }, { tags: ['other'] });
  assert.equal(context.AST.Cache.invalidateByTag('rag'), 2);

  assert.equal(context.AST.Cache.get('k1'), null);
  assert.equal(context.AST.Cache.get('k2'), null);
  assert.equal(
    JSON.stringify(context.AST.Cache.get('k3')),
    JSON.stringify({ value: 3 })
  );

  assert.equal(context.AST.Cache.delete('k3'), true);
  assert.equal(context.AST.Cache.delete('k3'), false);

  const stats = context.AST.Cache.stats();
  assert.equal(stats.backend, 'memory');
  assert.equal(typeof stats.stats.hits, 'number');
  assert.equal(typeof stats.stats.misses, 'number');
});

test('cache fetch supports stale-while-revalidate and stale fallback on resolver errors', () => {
  let nowMs = 1_000;
  class FakeDate extends Date {
    static now() {
      return nowMs;
    }
  }

  const context = createGasContext({
    Date: FakeDate
  });
  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'memory',
    namespace: 'cache_fetch_swr'
  });

  let resolverRuns = 0;
  const first = context.AST.Cache.fetch('swr:key', () => {
    resolverRuns += 1;
    return { version: 1 };
  }, {
    ttlSec: 2,
    staleTtlSec: 10,
    tags: ['rag']
  });

  assert.equal(first.cacheHit, false);
  assert.equal(first.source, 'resolver');
  assert.equal(first.stale, false);
  assert.equal(JSON.stringify(first.value), JSON.stringify({ version: 1 }));
  assert.equal(resolverRuns, 1);

  const freshHit = context.AST.Cache.fetch('swr:key', () => {
    resolverRuns += 1;
    return { version: 2 };
  }, {
    ttlSec: 2,
    staleTtlSec: 10
  });
  assert.equal(freshHit.cacheHit, true);
  assert.equal(freshHit.source, 'fresh');
  assert.equal(resolverRuns, 1);

  nowMs = 3_500;
  const staleFallback = context.AST.Cache.fetch('swr:key', () => {
    resolverRuns += 1;
    throw new Error('resolver failed');
  }, {
    ttlSec: 2,
    staleTtlSec: 10,
    serveStaleOnError: true
  });

  assert.equal(staleFallback.cacheHit, true);
  assert.equal(staleFallback.stale, true);
  assert.equal(staleFallback.source, 'stale');
  assert.equal(JSON.stringify(staleFallback.value), JSON.stringify({ version: 1 }));
  assert.equal(resolverRuns, 2);

  const stats = context.AST.Cache.stats();
  assert.equal(typeof stats.fetch, 'object');
  assert.equal(stats.fetch.freshHits >= 1, true);
  assert.equal(stats.fetch.staleHits >= 1, true);
  assert.equal(stats.fetch.resolverRuns, 2);
  assert.equal(stats.fetch.resolverErrors, 1);
  assert.equal(stats.fetch.staleServedOnError, 1);
});

test('cache fetch coalesces follower reads to stale when a refresh lease is active', () => {
  const context = createGasContext();
  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'memory',
    namespace: 'cache_fetch_coalesce'
  });

  const normalizedKey = context.astCacheNormalizeKey('coalesce:key');
  const staleInternalKey = context.astCacheBuildInternalKey(normalizedKey, 'stale');
  const leaseInternalKey = context.astCacheBuildInternalKey(normalizedKey, 'lease');

  context.AST.Cache.set(staleInternalKey, { source: 'stale' }, { ttlSec: 60 });
  context.AST.Cache.set(leaseInternalKey, { ownerId: 'leader' }, { ttlSec: 60 });

  let resolverRuns = 0;
  const result = context.AST.Cache.fetch('coalesce:key', () => {
    resolverRuns += 1;
    return { source: 'resolver' };
  }, {
    ttlSec: 30,
    staleTtlSec: 60,
    coalesce: true,
    coalesceWaitMs: 0
  });

  assert.equal(resolverRuns, 0);
  assert.equal(result.cacheHit, true);
  assert.equal(result.stale, true);
  assert.equal(result.coalesced, true);
  assert.equal(result.source, 'stale');
  assert.equal(JSON.stringify(result.value), JSON.stringify({ source: 'stale' }));

  const stats = context.AST.Cache.stats();
  assert.equal(stats.fetch.coalescedFollowers >= 1, true);
});

test('memory backend enforces deterministic ttl expiration', () => {
  let nowMs = 1_000;
  class FakeDate extends Date {
    static now() {
      return nowMs;
    }
  }

  const context = createGasContext({
    Date: FakeDate
  });
  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'memory',
    namespace: 'cache_ttl_test'
  });

  context.AST.Cache.set('ttl:key', { ok: true }, { ttlSec: 5 });
  assert.equal(
    JSON.stringify(context.AST.Cache.get('ttl:key')),
    JSON.stringify({ ok: true })
  );

  nowMs = 6_000;
  assert.equal(context.AST.Cache.get('ttl:key'), null);
});

test('cache config precedence is request override > runtime config > script properties', () => {
  const properties = createPropertiesService({
    CACHE_BACKEND: 'memory',
    CACHE_NAMESPACE: 'script_ns',
    CACHE_DEFAULT_TTL_SEC: '111'
  });

  const context = createGasContext({
    PropertiesService: properties.service
  });
  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    CACHE_BACKEND: 'memory',
    CACHE_NAMESPACE: 'runtime_ns',
    CACHE_DEFAULT_TTL_SEC: 222
  });

  context.AST.Cache.set('a', { source: 'runtime' });
  const runtimeStats = context.AST.Cache.stats();
  assert.equal(runtimeStats.namespace, 'runtime_ns');

  context.AST.Cache.set('b', { source: 'request' }, { namespace: 'request_ns', ttlSec: 1 });
  const requestStats = context.AST.Cache.stats({ namespace: 'request_ns' });
  assert.equal(requestStats.namespace, 'request_ns');
  assert.equal(requestStats.entries, 1);
});

test('cache config resolution memoizes script properties snapshots and invalidates on clearConfig', () => {
  let getPropertiesCalls = 0;
  const scriptState = {
    CACHE_BACKEND: 'memory',
    CACHE_NAMESPACE: 'script_ns_v1',
    CACHE_DEFAULT_TTL_SEC: '120'
  };

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => {
          getPropertiesCalls += 1;
          return { ...scriptState };
        },
        getProperty: key => (Object.prototype.hasOwnProperty.call(scriptState, key) ? scriptState[key] : null)
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();

  const first = context.astCacheResolveConfig({});
  const second = context.astCacheResolveConfig({});
  assert.equal(first.namespace, 'script_ns_v1');
  assert.equal(second.namespace, 'script_ns_v1');
  assert.equal(getPropertiesCalls, 1);

  scriptState.CACHE_NAMESPACE = 'script_ns_v2';
  const stillCached = context.astCacheResolveConfig({});
  assert.equal(stillCached.namespace, 'script_ns_v1');
  assert.equal(getPropertiesCalls, 1);

  context.AST.Cache.clearConfig();
  const refreshed = context.astCacheResolveConfig({});
  assert.equal(refreshed.namespace, 'script_ns_v2');
  assert.equal(getPropertiesCalls, 2);
});

test('cache numeric config resolution ignores malformed earlier candidates and falls back safely', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          CACHE_BACKEND: 'memory',
          CACHE_DEFAULT_TTL_SEC: 'not-a-number',
          CACHE_MAX_MEMORY_ENTRIES: 'also-bad'
        }),
        getProperty: key => {
          if (key === 'CACHE_BACKEND') return 'memory';
          if (key === 'CACHE_DEFAULT_TTL_SEC') return 'not-a-number';
          if (key === 'CACHE_MAX_MEMORY_ENTRIES') return 'also-bad';
          return null;
        }
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();

  const resolved = context.astCacheResolveConfig({});
  assert.equal(resolved.defaultTtlSec, 300);
  assert.equal(resolved.maxMemoryEntries, 2000);
});

test('cache backend defaults tune lock scope and read stats behavior for concurrency', () => {
  const context = createGasContext();
  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();

  const memoryDefaults = context.astCacheResolveConfig({ backend: 'memory' });
  assert.equal(memoryDefaults.lockScope, 'none');
  assert.equal(memoryDefaults.updateStatsOnGet, true);

  const driveDefaults = context.astCacheResolveConfig({ backend: 'drive_json' });
  assert.equal(driveDefaults.lockScope, 'script');
  assert.equal(driveDefaults.updateStatsOnGet, false);

  const scriptDefaults = context.astCacheResolveConfig({ backend: 'script_properties' });
  assert.equal(scriptDefaults.lockScope, 'script');
  assert.equal(scriptDefaults.updateStatsOnGet, false);

  const storageDefaults = context.astCacheResolveConfig({
    backend: 'storage_json',
    storageUri: 's3://cache-bucket/defaults/cache.json'
  });
  assert.equal(storageDefaults.lockScope, 'none');
  assert.equal(storageDefaults.updateStatsOnGet, false);
});

test('drive_json backend supports persistence and invalidation', () => {
  const drive = createDriveMock();
  const context = createGasContext({
    DriveApp: drive.DriveApp,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'drive_json',
    namespace: 'drive_ns',
    driveFileName: 'cache-drive-test.json'
  });

  context.AST.Cache.set('drive:a', { id: 'a' }, { tags: ['rag'] });
  context.AST.Cache.set('drive:b', { id: 'b' }, { tags: ['other'] });
  assert.equal(
    JSON.stringify(context.AST.Cache.get('drive:a')),
    JSON.stringify({ id: 'a' })
  );

  const removed = context.AST.Cache.invalidateByTag('rag');
  assert.equal(removed, 1);
  assert.equal(context.AST.Cache.get('drive:a'), null);
  assert.equal(
    JSON.stringify(context.AST.Cache.get('drive:b')),
    JSON.stringify({ id: 'b' })
  );

  const stats = context.AST.Cache.stats();
  assert.equal(stats.backend, 'drive_json');
  const driveFileNames = Object.keys(drive.files);
  assert.equal(driveFileNames.length, 1);
  assert.equal(driveFileNames[0].startsWith('cache-drive-test--'), true);
  assert.equal(driveFileNames[0].endsWith('.json'), true);
});

test('drive_json backend isolates namespaces for equivalent sanitized names', () => {
  const drive = createDriveMock();
  const context = createGasContext({
    DriveApp: drive.DriveApp,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'drive_json',
    driveFileName: 'cache-drive-shared.json'
  });

  context.AST.Cache.set('shared-key', { namespace: 'team-a' }, { namespace: 'team-a' });
  context.AST.Cache.set('shared-key', { namespace: 'team_a' }, { namespace: 'team_a' });

  assert.equal(
    JSON.stringify(context.AST.Cache.get('shared-key', { namespace: 'team-a' })),
    JSON.stringify({ namespace: 'team-a' })
  );
  assert.equal(
    JSON.stringify(context.AST.Cache.get('shared-key', { namespace: 'team_a' })),
    JSON.stringify({ namespace: 'team_a' })
  );

  const driveFileNames = Object.keys(drive.files).filter(name => name.startsWith('cache-drive-shared--'));
  assert.equal(driveFileNames.length, 2);
});

test('script_properties backend supports set/get/delete/clear', () => {
  const properties = createPropertiesService();
  const context = createGasContext({
    PropertiesService: properties.service,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'script_properties',
    namespace: 'props_ns'
  });

  context.AST.Cache.set('props:a', { id: 'a' }, { tags: ['tag1'] });
  assert.equal(
    JSON.stringify(context.AST.Cache.get('props:a')),
    JSON.stringify({ id: 'a' })
  );

  assert.equal(context.AST.Cache.delete('props:a'), true);
  assert.equal(context.AST.Cache.get('props:a'), null);

  context.AST.Cache.set('props:b', { id: 'b' }, { tags: ['tag2'] });
  context.AST.Cache.set('props:c', { id: 'c' }, { tags: ['tag2'] });
  assert.equal(context.AST.Cache.clear(), 2);
  assert.equal(context.AST.Cache.get('props:b'), null);
  assert.equal(context.AST.Cache.get('props:c'), null);
});

test('script_properties backend isolates collision-prone namespace names', () => {
  const properties = createPropertiesService();
  const context = createGasContext({
    PropertiesService: properties.service,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'script_properties'
  });

  context.AST.Cache.set('shared-key', { namespace: 'team-a' }, { namespace: 'team-a' });
  context.AST.Cache.set('shared-key', { namespace: 'team_a' }, { namespace: 'team_a' });

  assert.equal(
    JSON.stringify(context.AST.Cache.get('shared-key', { namespace: 'team-a' })),
    JSON.stringify({ namespace: 'team-a' })
  );
  assert.equal(
    JSON.stringify(context.AST.Cache.get('shared-key', { namespace: 'team_a' })),
    JSON.stringify({ namespace: 'team_a' })
  );

  const namespaceKeys = Object.keys(properties.store).filter(key => key.startsWith('AST_CACHE_NS_'));
  assert.equal(namespaceKeys.length, 2);
});

test('storage_json backend supports persistence through AST.Storage providers', () => {
  const storage = createStorageRunnerMock();
  const context = createGasContext({
    astRunStorageRequest: storage.astRunStorageRequest,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'storage_json',
    namespace: 'storage_ns',
    storageUri: 's3://cache-bucket/app/cache.json'
  });

  context.AST.Cache.set('storage:a', { id: 'a' }, { tags: ['rag'] });
  context.AST.Cache.set('storage:b', { id: 'b' }, { tags: ['other'] });

  assert.equal(
    JSON.stringify(context.AST.Cache.get('storage:a')),
    JSON.stringify({ id: 'a' })
  );

  const removed = context.AST.Cache.invalidateByTag('rag');
  assert.equal(removed, 1);
  assert.equal(context.AST.Cache.get('storage:a'), null);
  assert.equal(
    JSON.stringify(context.AST.Cache.get('storage:b')),
    JSON.stringify({ id: 'b' })
  );

  const stats = context.AST.Cache.stats();
  assert.equal(stats.backend, 'storage_json');
  assert.equal(stats.stats.sets >= 2, true);
  assert.equal(stats.stats.invalidations >= 1, true);

  const persistedUris = Object.keys(storage.objects);
  assert.equal(persistedUris.some(uri => uri.startsWith('s3://cache-bucket/app/cache--')), true);
  assert.equal(persistedUris.some(uri => /\/entries\/[^/]+\.json$/.test(uri)), true);
  assert.equal(persistedUris.some(uri => /\/tags\/[^/]+\.json$/.test(uri)), true);
  assert.equal(persistedUris.some(uri => /\/meta\/stats\.json$/.test(uri)), true);
  assert.equal(persistedUris.some(uri => /cache--[^/]+\.json$/.test(uri)), false);
});

test('storage_json backend isolates collision-prone namespace names', () => {
  const storage = createStorageRunnerMock();
  const context = createGasContext({
    astRunStorageRequest: storage.astRunStorageRequest,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'storage_json',
    storageUri: 'gcs://cache-bucket/shared/cache.json'
  });

  context.AST.Cache.set('shared-key', { namespace: 'team-a' }, { namespace: 'team-a' });
  context.AST.Cache.set('shared-key', { namespace: 'team_a' }, { namespace: 'team_a' });

  assert.equal(
    JSON.stringify(context.AST.Cache.get('shared-key', { namespace: 'team-a' })),
    JSON.stringify({ namespace: 'team-a' })
  );
  assert.equal(
    JSON.stringify(context.AST.Cache.get('shared-key', { namespace: 'team_a' })),
    JSON.stringify({ namespace: 'team_a' })
  );

  const entryUris = Object.keys(storage.objects).filter(uri =>
    uri.startsWith('gcs://cache-bucket/shared/cache--')
    && /\/entries\/[^/]+\.json$/.test(uri)
  );
  const namespaceRoots = new Set(entryUris.map(uri => uri.split('/entries/')[0]));
  assert.equal(namespaceRoots.size, 2);
});

test('storage_json trim probe is not capped at 50k and uses tag mutation lock path', () => {
  const storage = createStorageRunnerMock();
  let scriptLockCalls = 0;
  const context = createGasContext({
    astRunStorageRequest: storage.astRunStorageRequest,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          scriptLockCalls += 1;
          return true;
        },
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });

  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'storage_json',
    namespace: 'storage_probe_ns',
    storageUri: 'gcs://cache-bucket/probe/cache.json',
    maxMemoryEntries: 60000
  });

  context.AST.Cache.set('probe:key', { ok: true }, { tags: ['probe'] });

  const entryListRequests = storage.requests.filter(request =>
    String(request && request.operation || '').toLowerCase() === 'list'
    && /\/entries\/$/.test(String(request && request.uri || ''))
  );
  assert.equal(entryListRequests.length > 0, true);
  assert.equal(
    entryListRequests.some(request => Number(request.options && request.options.maxItems || 0) > 50000),
    true
  );
  assert.equal(scriptLockCalls > 0, true);
});

test('drive_json backend supports user lock scope', () => {
  const drive = createDriveMock();
  const lockCalls = {
    script: 0,
    user: 0
  };
  const context = createGasContext({
    DriveApp: drive.DriveApp,
    LockService: {
      getScriptLock: () => {
        lockCalls.script += 1;
        return {
          tryLock: () => true,
          releaseLock: () => {}
        };
      },
      getUserLock: () => {
        lockCalls.user += 1;
        return {
          tryLock: () => true,
          releaseLock: () => {}
        };
      }
    }
  });

  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'drive_json',
    namespace: 'drive_lock_scope_user',
    driveFileName: 'cache-drive-lock-scope.json',
    lockScope: 'user'
  });

  context.AST.Cache.set('k', { ok: true });
  assert.equal(lockCalls.user > 0, true);
  assert.equal(lockCalls.script, 0);
});

test('drive_json backend defaults to script lock scope and emits lock diagnostics context', () => {
  const drive = createDriveMock();
  const traces = [];
  const lockCalls = {
    script: 0,
    user: 0
  };

  const context = createGasContext({
    DriveApp: drive.DriveApp,
    LockService: {
      getScriptLock: () => {
        lockCalls.script += 1;
        return {
          tryLock: () => true,
          releaseLock: () => {}
        };
      },
      getUserLock: () => {
        lockCalls.user += 1;
        return {
          tryLock: () => true,
          releaseLock: () => {}
        };
      }
    }
  });

  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'drive_json',
    namespace: 'drive_default_script_lock',
    driveFileName: 'cache-drive-default-script-lock.json'
  });

  context.AST.Cache.set('k', { ok: true }, {
    traceCollector: payload => traces.push(payload)
  });

  assert.equal(lockCalls.script > 0, true);
  assert.equal(lockCalls.user, 0);

  const lockAcquire = traces.find(payload => payload && payload.event === 'lock_acquire');
  assert.equal(Boolean(lockAcquire), true);
  assert.equal(lockAcquire.backend, 'drive_json');
  assert.equal(lockAcquire.namespace, 'drive_default_script_lock');
  assert.equal(lockAcquire.operation, 'set');
  assert.equal(lockAcquire.lockScope, 'script');
});

test('drive_json get avoids write-on-read when updateStatsOnGet=false', () => {
  const drive = createDriveMock();
  const context = createGasContext({
    DriveApp: drive.DriveApp,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'drive_json',
    namespace: 'drive_no_write_on_read',
    driveFileName: 'cache-drive-no-write-on-read.json',
    updateStatsOnGet: false
  });

  context.AST.Cache.set('k', { ok: true });

  const driveFile = Object.values(drive.files)[0];
  assert.equal(Boolean(driveFile), true);
  const writesBeforeGet = driveFile.__getWriteCount();
  assert.equal(
    JSON.stringify(context.AST.Cache.get('k')),
    JSON.stringify({ ok: true })
  );
  const writesAfterGet = driveFile.__getWriteCount();
  assert.equal(writesAfterGet, writesBeforeGet);
});

test('drive_json cold get miss does not create file when updateStatsOnGet=false', () => {
  const drive = createDriveMock();
  const context = createGasContext({
    DriveApp: drive.DriveApp,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    }
  });

  loadCacheScripts(context, { includeAst: true });
  context.AST.Cache.clearConfig();
  context.AST.Cache.configure({
    backend: 'drive_json',
    namespace: 'drive_cold_read_no_create',
    driveFileName: 'cache-drive-cold-read.json',
    updateStatsOnGet: false
  });

  assert.equal(context.AST.Cache.get('missing-key'), null);
  assert.equal(Object.keys(drive.files).length, 0);
});
