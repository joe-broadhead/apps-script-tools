import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

function createResponse({ status = 200, body = '', headers = {}, blobBytes = null } = {}) {
  return {
    getResponseCode: () => status,
    getContentText: () => body,
    getAllHeaders: () => headers,
    getBlob: () => ({
      getBytes: () => Array.isArray(blobBytes) ? blobBytes : []
    })
  };
}

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

test('astStorageBuildReadWarnings flags payloads above soft cap', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  const softLimit = context.astStorageGetSoftLimitBytes();
  assert.equal(context.astStorageBuildReadWarnings(softLimit - 1).length, 0);

  const warnings = context.astStorageBuildReadWarnings(softLimit + 1);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /read payload exceeds soft cap/);
});

test('astStorageHttpRequest enforces timeoutMs as a retry budget', () => {
  let nowMs = 0;
  class FakeDate extends Date {
    static now() {
      nowMs += 50;
      return nowMs;
    }
  }

  const base = createGasContext();
  const context = createGasContext({
    Date: FakeDate,
    Utilities: {
      ...base.Utilities,
      sleep: ms => {
        nowMs += Number(ms || 0);
      }
    },
    UrlFetchApp: {
      fetch: () => createResponse({
        status: 503,
        body: JSON.stringify({ error: { message: 'transient' } })
      })
    }
  });

  loadStorageScripts(context);

  assert.throws(
    () => context.astStorageHttpRequest({
      provider: 'gcs',
      operation: 'list',
      url: 'https://storage.googleapis.com/storage/v1/b/x/o',
      method: 'get',
      retries: 5,
      timeoutMs: 120
    }),
    error => {
      assert.equal(error.name, 'AstStorageProviderError');
      assert.match(error.message, /timeout budget/);
      assert.equal(error.details.timeoutMs, 120);
      return true;
    }
  );
});
