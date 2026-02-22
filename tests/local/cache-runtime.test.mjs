import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadCacheScripts } from './cache-helpers.mjs';

function createDriveMock() {
  const files = {};

  function createFileHandle(name, content = '') {
    const state = {
      name,
      content: String(content || '')
    };

    return {
      getName: () => state.name,
      getBlob: () => ({
        getDataAsString: () => state.content
      }),
      setContent: value => {
        state.content = String(value || '');
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

test('AST exposes Cache surface and backend helpers', () => {
  const context = createGasContext();
  loadCacheScripts(context, { includeAst: true });

  const methods = [
    'get',
    'set',
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
    JSON.stringify(['memory', 'drive_json', 'script_properties'])
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
  assert.ok(drive.files['cache-drive-test.json']);
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
