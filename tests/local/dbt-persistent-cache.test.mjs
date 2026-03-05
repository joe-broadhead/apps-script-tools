import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

function createJsonBlobPayload(payload) {
  const text = JSON.stringify(payload);
  const bytes = Array.from(Buffer.from(text, 'utf8').values()).map(value => (value > 127 ? value - 256 : value));
  return {
    getDataAsString: () => text,
    getBytes: () => bytes,
    getContentType: () => 'application/json'
  };
}

function buildInMemoryStorage(context, existingStore = null) {
  const store = existingStore || new Map();

  context.astStorageRead = request => {
    const uri = request && request.uri;
    if (!store.has(uri)) {
      const error = new Error('not found');
      error.name = 'AstStorageNotFoundError';
      throw error;
    }

    const payload = store.get(uri);
    const data = {
      mimeType: payload.mimeType || null
    };

    if (typeof payload.text === 'string') {
      data.text = payload.text;
    }

    if (typeof payload.base64 === 'string') {
      data.base64 = payload.base64;
    }

    return {
      output: { data },
      usage: { bytesOut: (payload.text || payload.base64 || '').length }
    };
  };

  context.astStorageWrite = request => {
    const uri = request && request.uri;
    const payload = request && request.payload ? request.payload : {};
    store.set(uri, payload);
    return {
      output: {
        written: {
          uri,
          size: Number((payload.text || payload.base64 || '').length || 0)
        }
      }
    };
  };

  return {
    store,
    hasUri: uri => store.has(uri)
  };
}

test('loadManifest persistent cache reuses cached bundle for drive source', () => {
  const fixture = createManifestFixture();
  let blobReadCount = 0;

  const context = createGasContext({
    DriveApp: {
      getFileById: fileId => ({
        getId: () => fileId,
        getName: () => 'manifest.json',
        getLastUpdated: () => new Date('2026-02-25T00:00:00.000Z'),
        getSize: () => 1024,
        getBlob: () => {
          blobReadCount += 1;
          return createJsonBlobPayload(fixture);
        }
      })
    }
  });

  const storage = buildInMemoryStorage(context);

  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const request = {
    fileId: 'drive-file-1',
    options: {
      validate: 'strict',
      schemaVersion: 'v12',
      buildIndex: true,
      persistentCacheEnabled: true,
      persistentCacheUri: 'gcs://bucket/cache/dbt-manifest-cache.json',
      persistentCacheCompression: 'none',
      persistentCacheIncludeManifest: true
    }
  };

  const first = context.AST.DBT.loadManifest(request);
  assert.equal(first.status, 'ok');
  assert.equal(first.cache.hit, false);
  assert.equal(blobReadCount, 1);

  const wroteIndex = Array.from(storage.store.keys()).some(uri => uri.indexOf('.index.json') !== -1);
  assert.equal(wroteIndex, true);

  const second = context.AST.DBT.loadManifest(request);
  assert.equal(second.status, 'ok');
  assert.equal(second.cache.hit, true);
  assert.equal(blobReadCount, 1);
  assert.equal(second.counts.entityCount, first.counts.entityCount);
});

test('persistent cache supports includeManifest=false with gzip compression', () => {
  const fixture = createManifestFixture();
  let blobReadCount = 0;

  const context = createGasContext({
    DriveApp: {
      getFileById: fileId => ({
        getId: () => fileId,
        getName: () => 'manifest.json',
        getLastUpdated: () => new Date('2026-02-25T00:00:00.000Z'),
        getSize: () => 1024,
        getBlob: () => {
          blobReadCount += 1;
          return createJsonBlobPayload(fixture);
        }
      })
    }
  });

  buildInMemoryStorage(context);
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const request = {
    fileId: 'drive-file-1',
    options: {
      validate: 'strict',
      schemaVersion: 'v12',
      buildIndex: true,
      persistentCacheEnabled: true,
      persistentCacheUri: 'gcs://bucket/cache/dbt-manifest-cache.json',
      persistentCacheCompression: 'gzip',
      persistentCacheIncludeManifest: false
    }
  };

  const first = context.AST.DBT.loadManifest(request);
  assert.equal(first.status, 'ok');
  assert.equal(first.cache.hit, false);
  assert.equal(blobReadCount, 1);

  const second = context.AST.DBT.loadManifest(request);
  assert.equal(second.status, 'ok');
  assert.equal(second.cache.hit, true);
  assert.equal(blobReadCount, 1);
  assert.equal(second.bundle.manifest, null);

  const search = context.AST.DBT.search({
    bundle: second.bundle,
    target: 'entities',
    query: 'orders',
    page: { limit: 5, offset: 0 },
    include: { meta: true, columns: 'summary', stats: true }
  });

  assert.equal(search.status, 'ok');
  assert.equal(search.page.returned > 0, true);

  const validation = context.AST.DBT.validateManifest({
    bundle: second.bundle,
    options: {
      validate: 'strict',
      schemaVersion: 'v12'
    }
  });

  assert.equal(validation.valid, true);
});

test('persistent cache compact mode retains full DBT operation support on cached bundle', () => {
  const fixture = createManifestFixture();
  let blobReadCount = 0;

  const context = createGasContext({
    DriveApp: {
      getFileById: fileId => ({
        getId: () => fileId,
        getName: () => 'manifest.json',
        getLastUpdated: () => new Date('2026-02-25T00:00:00.000Z'),
        getSize: () => 1024,
        getBlob: () => {
          blobReadCount += 1;
          return createJsonBlobPayload(fixture);
        }
      })
    }
  });

  buildInMemoryStorage(context);
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const request = {
    fileId: 'drive-file-1',
    options: {
      validate: 'strict',
      schemaVersion: 'v12',
      buildIndex: true,
      persistentCacheEnabled: true,
      persistentCacheUri: 'gcs://bucket/cache/dbt-manifest-cache.json',
      persistentCacheCompression: 'gzip',
      persistentCacheIncludeManifest: false,
      persistentCacheMode: 'compact'
    }
  };

  const first = context.AST.DBT.loadManifest(request);
  assert.equal(first.status, 'ok');
  assert.equal(first.cache.hit, false);
  assert.equal(blobReadCount, 1);

  const second = context.AST.DBT.loadManifest(request);
  assert.equal(second.status, 'ok');
  assert.equal(second.cache.hit, true);
  assert.equal(blobReadCount, 1);
  assert.equal(second.bundle.manifest, null);
  assert.equal(second.bundle.index.format, 'compact_v1');
  assert.equal(typeof second.bundle.index.byUniqueId, 'object');

  const search = context.AST.DBT.search({
    bundle: second.bundle,
    target: 'entities',
    query: 'orders',
    page: { limit: 5, offset: 0 },
    include: { meta: true, columns: 'summary', stats: true }
  });

  assert.equal(search.status, 'ok');
  assert.equal(search.page.returned > 0, true);

  const entity = context.AST.DBT.getEntity({
    bundle: second.bundle,
    uniqueId: 'model.demo.orders',
    include: { meta: true, columns: 'full' }
  });
  assert.equal(entity.status, 'ok');
  assert.equal(entity.item.uniqueId, 'model.demo.orders');
  assert.equal(typeof entity.item.columns.order_id, 'object');

  const column = context.AST.DBT.getColumn({
    bundle: second.bundle,
    uniqueId: 'model.demo.orders',
    columnName: 'order_id'
  });
  assert.equal(column.status, 'ok');
  assert.equal(column.item.name, 'order_id');
});

test('persistent compact cache hit seeds runtime index cache for later incremental source updates', () => {
  let manifest = createManifestFixture();
  let updatedAt = new Date('2026-02-25T00:00:00.000Z');

  const sharedStore = new Map();
  const baseRequest = {
    fileId: 'drive-file-compact-seed',
    options: {
      validate: 'strict',
      schemaVersion: 'v12',
      buildIndex: true,
      incrementalIndex: true,
      persistentCacheEnabled: true,
      persistentCacheUri: 'gcs://bucket/cache/dbt-manifest-cache.json',
      persistentCacheCompression: 'gzip',
      persistentCacheIncludeManifest: false,
      persistentCacheMode: 'compact'
    }
  };

  const warmContext = createGasContext({
    DriveApp: {
      getFileById: fileId => ({
        getId: () => fileId,
        getName: () => 'manifest.json',
        getLastUpdated: () => updatedAt,
        getSize: () => 4096,
        getBlob: () => createJsonBlobPayload(manifest)
      })
    }
  });
  buildInMemoryStorage(warmContext, sharedStore);
  loadDbtScripts(warmContext, { includeStorage: false, includeAst: true });
  const warm = warmContext.AST.DBT.loadManifest(baseRequest);
  assert.equal(warm.cache.hit, false);

  const coldContext = createGasContext({
    DriveApp: {
      getFileById: fileId => ({
        getId: () => fileId,
        getName: () => 'manifest.json',
        getLastUpdated: () => updatedAt,
        getSize: () => 4096,
        getBlob: () => createJsonBlobPayload(manifest)
      })
    }
  });
  buildInMemoryStorage(coldContext, sharedStore);
  loadDbtScripts(coldContext, { includeStorage: false, includeAst: true });

  const cached = coldContext.AST.DBT.loadManifest(baseRequest);
  assert.equal(cached.cache.hit, true);
  assert.equal(cached.bundle.manifest, null);
  assert.equal(typeof cached.bundle.index.entitySignatures, 'object');

  manifest = JSON.parse(JSON.stringify(manifest));
  manifest.nodes['model.demo.orders'].description = 'Orders changed from compact cache seed';
  updatedAt = new Date('2026-02-25T00:05:00.000Z');

  const refreshed = coldContext.AST.DBT.loadManifest(baseRequest);
  assert.equal(refreshed.cache.hit, false);
  assert.equal(refreshed.indexBuild.applied, true);
  assert.equal(refreshed.indexBuild.changedCount, 1);
});
