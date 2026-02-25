import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';

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

test('loadManifest reads manifest from drive://file/<id>', () => {
  const fixture = createManifestFixture();

  const context = createGasContext({
    DriveApp: {
      getFileById: fileId => ({
        getId: () => fileId,
        getName: () => 'manifest.json',
        getBlob: () => createJsonBlobPayload(fixture)
      })
    }
  });

  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.loadManifest({
    uri: 'drive://file/abc123',
    options: { validate: 'strict' }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.source.provider, 'drive');
  assert.equal(out.counts.entityCount >= 3, true);
});

test('loadManifest reads manifest from drive://path/<folderId>/<fileName>', () => {
  const fixture = createManifestFixture();

  const files = [{
    getId: () => 'file-1',
    getName: () => 'manifest.json',
    getBlob: () => createJsonBlobPayload(fixture)
  }];

  const context = createGasContext({
    DriveApp: {
      getFolderById: folderId => ({
        getFilesByName: fileName => {
          assert.equal(folderId, 'folder-1');
          assert.equal(fileName, 'manifest.json');
          let idx = 0;
          return {
            hasNext: () => idx < files.length,
            next: () => files[idx++]
          };
        }
      })
    }
  });

  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.loadManifest({
    uri: 'drive://path/folder-1/manifest.json',
    options: { validate: 'basic' }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.source.location.folderId, 'folder-1');
});

test('loadManifest reads manifest via AST.Storage contract for gcs/s3/dbfs', () => {
  const fixture = createManifestFixture();

  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  context.astStorageRead = request => {
    assert.equal(request.provider, 'gcs');
    return {
      output: {
        data: {
          json: fixture,
          mimeType: 'application/json'
        }
      },
      usage: {
        bytesOut: 1024
      }
    };
  };

  const out = context.AST.DBT.loadManifest({
    uri: 'gcs://bucket/path/manifest.json'
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.source.provider, 'gcs');
});

test('loadManifest supports gzip payloads when allowGzip=true', () => {
  const fixture = createManifestFixture();
  const json = JSON.stringify(fixture);
  const gzipped = zlib.gzipSync(Buffer.from(json, 'utf8'));
  const signedBytes = Array.from(gzipped.values()).map(value => (value > 127 ? value - 256 : value));

  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  context.astStorageRead = () => ({
    output: {
      data: {
        base64: context.Utilities.base64Encode(signedBytes),
        mimeType: 'application/gzip'
      }
    },
    usage: {
      bytesOut: gzipped.length
    }
  });

  const out = context.AST.DBT.loadManifest({
    uri: 's3://bucket/manifest.json.gz',
    options: {
      allowGzip: true,
      validate: 'strict'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.metadata.projectName, 'demo_project');
});

test('loadManifest enforces maxBytes', () => {
  const fixture = createManifestFixture();
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  context.astStorageRead = () => ({
    output: {
      data: {
        json: fixture,
        mimeType: 'application/json'
      }
    },
    usage: {
      bytesOut: 2_000_000
    }
  });

  assert.throws(
    () => context.AST.DBT.loadManifest({
      uri: 'dbfs:/mnt/manifest.json',
      options: { maxBytes: 10_000 }
    }),
    error => {
      assert.equal(error.name, 'AstDbtLoadError');
      assert.match(error.message, /exceeds maxBytes/);
      return true;
    }
  );
});
