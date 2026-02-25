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

function buildInMemoryStorage(context) {
  const store = new Map();

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
