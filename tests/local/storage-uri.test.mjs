import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

test('astParseStorageUri parses gcs, s3, and dbfs URIs', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  const gcs = context.astParseStorageUri('gcs://my-bucket/path/to/file.txt');
  assert.equal(gcs.provider, 'gcs');
  assert.equal(gcs.location.bucket, 'my-bucket');
  assert.equal(gcs.location.key, 'path/to/file.txt');

  const s3 = context.astParseStorageUri('s3://bucket-a/data.csv');
  assert.equal(s3.provider, 's3');
  assert.equal(s3.location.bucket, 'bucket-a');
  assert.equal(s3.location.key, 'data.csv');

  const dbfs = context.astParseStorageUri('dbfs:/mnt/project/file.parquet');
  assert.equal(dbfs.provider, 'dbfs');
  assert.equal(dbfs.location.path, 'dbfs:/mnt/project/file.parquet');
});

test('astParseStorageUri rejects unsupported URI schemes', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  assert.throws(
    () => context.astParseStorageUri('azure://x/y'),
    /must use one of: gcs:\/\/, s3:\/\/, dbfs:\//
  );
});

test('astParseStorageUri rejects malformed dbfs URIs without a path', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  assert.throws(
    () => context.astParseStorageUri('dbfs:'),
    /must include a non-empty path segment/
  );

  assert.throws(
    () => context.astParseStorageUri('dbfs://'),
    /must include a non-empty path segment/
  );
});

test('astStorageBuildUri normalizes canonical output', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  assert.equal(
    context.astStorageBuildUri('gcs', { bucket: 'b', key: 'folder/a.txt' }),
    'gcs://b/folder/a.txt'
  );

  assert.equal(
    context.astStorageBuildUri('s3', { bucket: 'b2', key: '' }),
    's3://b2'
  );

  assert.equal(
    context.astStorageBuildUri('dbfs', { path: '/mnt/z.txt' }),
    'dbfs:/mnt/z.txt'
  );
});
