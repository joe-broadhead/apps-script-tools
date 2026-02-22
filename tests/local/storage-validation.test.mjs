import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

test('validateStorageRequest rejects unknown providers', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  assert.throws(
    () => context.validateStorageRequest({
      provider: 'azure',
      operation: 'list',
      location: { bucket: 'x' }
    }),
    /provider must be one of: gcs, s3, dbfs/
  );
});

test('validateStorageRequest normalizes URI provider and location', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  const request = context.validateStorageRequest({
    uri: 'gcs://bucket-a/path/to/file.json',
    operation: 'head'
  });

  assert.equal(request.provider, 'gcs');
  assert.equal(request.location.bucket, 'bucket-a');
  assert.equal(request.location.key, 'path/to/file.json');
  assert.equal(request.uri, 'gcs://bucket-a/path/to/file.json');
});

test('validateStorageRequest normalizes write payload from text/json to base64', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  const textRequest = context.validateStorageRequest({
    uri: 's3://my-bucket/path.txt',
    operation: 'write',
    payload: {
      text: 'hello world'
    }
  });

  assert.equal(textRequest.payload.kind, 'text');
  assert.equal(typeof textRequest.payload.base64, 'string');
  assert.equal(textRequest.payload.mimeType, 'text/plain');

  const jsonRequest = context.validateStorageRequest({
    uri: 'dbfs:/mnt/data.json',
    operation: 'write',
    payload: {
      json: { ok: true }
    }
  });

  assert.equal(jsonRequest.payload.kind, 'json');
  assert.equal(jsonRequest.payload.mimeType, 'application/json');
});

test('validateStorageRequest enforces single payload mode for write', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  assert.throws(
    () => context.validateStorageRequest({
      uri: 'gcs://bucket/path.txt',
      operation: 'write',
      payload: {
        text: 'a',
        base64: 'YQ=='
      }
    }),
    /must include only one of: base64, text, json/
  );
});

test('validateStorageRequest applies option defaults and validates operation', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  const request = context.validateStorageRequest({
    uri: 's3://my-bucket',
    operation: 'list'
  });

  assert.equal(request.options.pageSize, 1000);
  assert.equal(request.options.retries, 2);

  assert.throws(
    () => context.validateStorageRequest({
      uri: 's3://my-bucket/key',
      operation: 'copy'
    }),
    /operation must be one of/
  );
});
