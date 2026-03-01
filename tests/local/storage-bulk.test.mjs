import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

function buildStorageRuntime(context, seed = {}) {
  const objects = {};
  Object.keys(seed).forEach(uri => {
    objects[uri] = {
      text: String(seed[uri].text || ''),
      mimeType: seed[uri].mimeType || 'text/plain'
    };
  });

  function sortedObjectUris() {
    return Object.keys(objects).sort();
  }

  function parse(uri) {
    return context.astParseStorageUri(uri);
  }

  function buildGcsOrS3List(provider, location, options = {}) {
    const prefix = location.key || '';
    const uris = sortedObjectUris().filter(uri => {
      const parsed = parse(uri);
      if (!parsed || parsed.provider !== provider) {
        return false;
      }
      if (parsed.location.bucket !== location.bucket) {
        return false;
      }
      const key = parsed.location.key || '';
      if (!prefix) {
        return true;
      }
      return key === prefix || key.startsWith(`${prefix.replace(/\/+$/, '')}/`);
    });

    const pageSize = Number.isInteger(options.pageSize) && options.pageSize > 0 ? options.pageSize : 1000;
    const pageToken = Number.isInteger(Number(options.pageToken)) ? Number(options.pageToken) : 0;
    const start = Math.max(0, pageToken);
    const pageUris = uris.slice(start, start + pageSize);
    const nextPageToken = start + pageSize < uris.length ? String(start + pageSize) : null;
    const truncatedByMax = Number.isInteger(options.maxItems) ? pageUris.length > options.maxItems : false;
    const cappedUris = Number.isInteger(options.maxItems) ? pageUris.slice(0, options.maxItems) : pageUris;

    return {
      output: {
        items: cappedUris.map(uri => {
          const parsed = parse(uri);
          const object = objects[uri];
          return {
            uri,
            key: parsed.location.key,
            size: object.text.length,
            etag: `etag-${parsed.location.key}`
          };
        })
      },
      page: {
        nextPageToken,
        truncated: truncatedByMax || Boolean(nextPageToken)
      }
    };
  }

  function buildDbfsList(path, options = {}) {
    const normalizedRoot = path.endsWith('/') ? path.slice(0, -1) : path;
    const childMap = {};

    sortedObjectUris()
      .filter(uri => uri.startsWith('dbfs:/'))
      .forEach(uri => {
        if (!uri.startsWith(`${normalizedRoot}/`) && uri !== normalizedRoot) {
          return;
        }
        const remainder = uri === normalizedRoot
          ? ''
          : uri.slice((`${normalizedRoot}/`).length);
        if (!remainder) {
          return;
        }
        const firstSegment = remainder.split('/')[0];
        const childPath = `${normalizedRoot}/${firstSegment}`;
        const isDir = remainder.includes('/');
        if (!childMap[childPath]) {
          childMap[childPath] = {
            path: childPath,
            isDir,
            size: 0
          };
        } else if (isDir) {
          childMap[childPath].isDir = true;
        }
        if (!isDir) {
          childMap[childPath].size = objects[uri].text.length;
        }
      });

    const allChildren = Object.values(childMap).sort((left, right) => left.path.localeCompare(right.path));
    const maxItems = Number.isInteger(options.maxItems) && options.maxItems > 0 ? options.maxItems : allChildren.length;
    const items = allChildren.slice(0, maxItems);

    return {
      output: {
        items: items.map(item => ({
          uri: item.path,
          path: item.path,
          isDir: item.isDir,
          size: item.size
        }))
      },
      page: {
        nextPageToken: null,
        truncated: allChildren.length > items.length
      }
    };
  }

  context.astRunStorageRequest = request => {
    const operation = String(request.operation || '').toLowerCase();

    if (operation === 'list') {
      if (request.provider === 'dbfs') {
        const listed = buildDbfsList(request.location.path, request.options || {});
        return Object.assign({
          provider: 'dbfs',
          operation: 'list',
          uri: request.uri || request.location.path,
          usage: { requestCount: 1, bytesIn: 0, bytesOut: 0 }
        }, listed);
      }

      const listed = buildGcsOrS3List(request.provider, request.location, request.options || {});
      return Object.assign({
        provider: request.provider,
        operation: 'list',
        uri: request.uri || context.astStorageBuildUri(request.provider, request.location),
        usage: { requestCount: 1, bytesIn: 0, bytesOut: 0 }
      }, listed);
    }

    if (operation === 'read') {
      const uri = request.uri || context.astStorageBuildUri(request.provider, request.location);
      if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
        const error = new Error(`missing object: ${uri}`);
        error.name = 'AstStorageNotFoundError';
        throw error;
      }
      const object = objects[uri];
      return {
        provider: request.provider || parse(uri).provider,
        operation: 'read',
        uri,
        output: {
          data: {
            base64: Buffer.from(object.text, 'utf8').toString('base64'),
            text: object.text,
            mimeType: object.mimeType
          }
        },
        page: { nextPageToken: null, truncated: false },
        usage: { requestCount: 1, bytesIn: 0, bytesOut: object.text.length }
      };
    }

    if (operation === 'write') {
      const uri = request.uri || context.astStorageBuildUri(request.provider, request.location);
      const payload = request.payload || {};
      let text = '';
      if (typeof payload.text === 'string') {
        text = payload.text;
      } else if (typeof payload.base64 === 'string') {
        text = Buffer.from(payload.base64, 'base64').toString('utf8');
      } else if (payload.json) {
        text = JSON.stringify(payload.json);
      }
      objects[uri] = {
        text,
        mimeType: payload.mimeType || 'application/octet-stream'
      };

      return {
        provider: request.provider || parse(uri).provider,
        operation: 'write',
        uri,
        output: { written: { uri } },
        page: { nextPageToken: null, truncated: false },
        usage: { requestCount: 1, bytesIn: text.length, bytesOut: 0 }
      };
    }

    if (operation === 'delete') {
      const uri = request.uri || context.astStorageBuildUri(request.provider, request.location);
      if (!Object.prototype.hasOwnProperty.call(objects, uri)) {
        const error = new Error(`missing object: ${uri}`);
        error.name = 'AstStorageNotFoundError';
        throw error;
      }
      delete objects[uri];
      return {
        provider: request.provider || parse(uri).provider,
        operation: 'delete',
        uri,
        output: { deleted: { uri, deleted: true } },
        page: { nextPageToken: null, truncated: false },
        usage: { requestCount: 1, bytesIn: 0, bytesOut: 0 }
      };
    }

    if (operation === 'copy') {
      const sourceUri = request.fromUri;
      const targetUri = request.toUri;
      if (!Object.prototype.hasOwnProperty.call(objects, sourceUri)) {
        const error = new Error(`missing object: ${sourceUri}`);
        error.name = 'AstStorageNotFoundError';
        throw error;
      }
      objects[targetUri] = { ...objects[sourceUri] };
      return {
        provider: request.provider || parse(targetUri).provider,
        operation: 'copy',
        uri: targetUri,
        output: { copied: { sourceUri, targetUri } },
        page: { nextPageToken: null, truncated: false },
        usage: { requestCount: 1, bytesIn: 0, bytesOut: 0 }
      };
    }

    throw new Error(`Unsupported test operation: ${operation}`);
  };

  return {
    objects
  };
}

test('AST.Storage exposes bulk helper methods and capabilities', () => {
  const context = createGasContext();
  loadStorageScripts(context, { includeAst: true });

  ['walk', 'copyPrefix', 'deletePrefix', 'sync'].forEach(method => {
    assert.equal(typeof context.AST.Storage[method], 'function');
  });

  const capabilities = context.AST.Storage.capabilities('gcs');
  assert.equal(capabilities.walk, true);
  assert.equal(capabilities.copy_prefix, true);
  assert.equal(capabilities.delete_prefix, true);
  assert.equal(capabilities.sync, true);
});

test('AST.Storage.walk returns deterministic filtered results', () => {
  const context = createGasContext();
  loadStorageScripts(context, { includeAst: true });
  buildStorageRuntime(context, {
    'gcs://bucket/src/a.txt': { text: 'A' },
    'gcs://bucket/src/nested/b.txt': { text: 'B' },
    'gcs://bucket/src/keep/c.txt': { text: 'C' }
  });

  const out = context.AST.Storage.walk({
    uri: 'gcs://bucket/src/',
    options: {
      recursive: true,
      includePrefixes: ['keep/', 'nested/'],
      excludePrefixes: ['nested/'],
      maxObjects: 50
    }
  });

  assert.equal(out.operation, 'walk');
  assert.equal(out.output.items.length, 1);
  assert.equal(out.output.items[0].relativePath, 'keep/c.txt');
});

test('AST.Storage.copyPrefix and deletePrefix support dryRun and execution modes', () => {
  const context = createGasContext();
  loadStorageScripts(context, { includeAst: true });
  const runtime = buildStorageRuntime(context, {
    'gcs://bucket/src/a.txt': { text: 'A' },
    'gcs://bucket/src/b.txt': { text: 'B' }
  });

  const planned = context.AST.Storage.copyPrefix({
    fromUri: 'gcs://bucket/src/',
    toUri: 'gcs://bucket/dst/',
    options: { dryRun: true }
  });
  assert.equal(planned.operation, 'copy_prefix');
  assert.equal(planned.output.summary.copied, 0);
  assert.equal(planned.output.summary.skipped, 2);
  assert.equal(runtime.objects['gcs://bucket/dst/a.txt'], undefined);

  const copied = context.AST.Storage.copyPrefix({
    fromUri: 'gcs://bucket/src/',
    toUri: 'gcs://bucket/dst/',
    options: { dryRun: false }
  });
  assert.equal(copied.output.summary.copied, 2);
  assert.equal(runtime.objects['gcs://bucket/dst/a.txt'].text, 'A');
  assert.equal(runtime.objects['gcs://bucket/dst/b.txt'].text, 'B');

  const deleted = context.AST.Storage.deletePrefix({
    uri: 'gcs://bucket/dst/',
    options: { dryRun: false }
  });
  assert.equal(deleted.operation, 'delete_prefix');
  assert.equal(deleted.output.summary.deleted, 2);
  assert.equal(runtime.objects['gcs://bucket/dst/a.txt'], undefined);
});

test('AST.Storage.sync copies missing files and optionally deletes extras', () => {
  const context = createGasContext();
  loadStorageScripts(context, { includeAst: true });
  const runtime = buildStorageRuntime(context, {
    'gcs://bucket/source/a.txt': { text: 'A' },
    'gcs://bucket/source/b.txt': { text: 'B' },
    'gcs://bucket/target/a.txt': { text: 'OLD' },
    'gcs://bucket/target/old.txt': { text: 'OLD' }
  });

  const out = context.AST.Storage.sync({
    fromUri: 'gcs://bucket/source/',
    toUri: 'gcs://bucket/target/',
    options: {
      overwrite: false,
      deleteExtra: true
    }
  });

  assert.equal(out.operation, 'sync');
  assert.equal(out.output.summary.copied, 1);
  assert.equal(out.output.summary.deleted, 1);
  assert.equal(out.output.summary.skipped, 1);
  assert.equal(runtime.objects['gcs://bucket/target/a.txt'].text, 'OLD');
  assert.equal(runtime.objects['gcs://bucket/target/b.txt'].text, 'B');
  assert.equal(runtime.objects['gcs://bucket/target/old.txt'], undefined);
});

test('AST.Storage.run routes bulk operation aliases', () => {
  const context = createGasContext();
  loadStorageScripts(context, { includeAst: true });
  buildStorageRuntime(context, {
    'gcs://bucket/src/a.txt': { text: 'A' }
  });

  const out = context.AST.Storage.run({
    operation: 'copyPrefix',
    fromUri: 'gcs://bucket/src/',
    toUri: 'gcs://bucket/dst/'
  });

  assert.equal(out.operation, 'copy_prefix');
  assert.equal(out.output.summary.copied, 1);
});
