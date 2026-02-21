import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

function createResponse({ status = 200, body = '', headers = {}, blobBytes = null, blobMimeType = 'application/octet-stream' } = {}) {
  return {
    getResponseCode: () => status,
    getContentText: () => body,
    getAllHeaders: () => headers,
    getBlob: () => ({
      getBytes: () => Array.isArray(blobBytes) ? blobBytes : [],
      getContentType: () => blobMimeType
    })
  };
}

test('S3 signer builds authorization header deterministically', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  const signed = context.astS3SignRequest({
    method: 'get',
    location: { bucket: 'bucket-1', key: 'path/file.txt' },
    query: { 'list-type': 2, prefix: 'path/' },
    payload: '',
    headers: {},
    config: {
      accessKeyId: 'AKIA_TEST',
      secretAccessKey: 'SECRET_TEST',
      region: 'us-east-1'
    },
    requestDate: new Date('2026-02-21T00:00:00.000Z')
  });

  assert.equal(typeof signed.url, 'string');
  assert.equal(typeof signed.headers.Authorization, 'string');
  assert.match(signed.headers.Authorization, /AWS4-HMAC-SHA256 Credential=AKIA_TEST\//);
  assert.match(signed.headers.Authorization, /Signature=[0-9a-f]{64}$/);
  assert.equal(typeof signed.canonicalRequest, 'string');
});

test('S3 list/read/write/delete operations return normalized output', () => {
  const calls = [];

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url.includes('list-type=2')) {
          return createResponse({
            status: 200,
            body: [
              '<ListBucketResult>',
              '<IsTruncated>false</IsTruncated>',
              '<Contents><Key>folder/a.txt</Key><Size>5</Size><ETag>"etag-1"</ETag><LastModified>2026-02-21T00:00:00.000Z</LastModified></Contents>',
              '</ListBucketResult>'
            ].join('')
          });
        }

        if (options.method === 'get') {
          return createResponse({
            status: 200,
            body: 'hello',
            headers: {
              'content-type': 'text/plain',
              etag: 'etag-2'
            },
            blobBytes: [104, 105],
            blobMimeType: 'text/plain'
          });
        }

        if (options.method === 'put') {
          return createResponse({
            status: 200,
            headers: {
              etag: 'etag-write'
            }
          });
        }

        if (options.method === 'delete') {
          return createResponse({
            status: 204,
            body: ''
          });
        }

        if (options.method === 'head') {
          return createResponse({
            status: 200,
            headers: {
              etag: 'etag-head',
              'content-length': '2',
              'content-type': 'text/plain'
            }
          });
        }

        return createResponse({ status: 500, body: '{}' });
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          S3_ACCESS_KEY_ID: 'AKIA_TEST',
          S3_SECRET_ACCESS_KEY: 'SECRET_TEST',
          S3_REGION: 'us-east-1'
        })
      })
    }
  });

  loadStorageScripts(context);

  const listResult = context.runStorageRequest({
    uri: 's3://bucket-1/folder/',
    operation: 'list'
  });

  assert.equal(listResult.output.items.length, 1);
  assert.equal(listResult.output.items[0].key, 'folder/a.txt');

  const readResult = context.runStorageRequest({
    uri: 's3://bucket-1/folder/a.txt',
    operation: 'read'
  });
  assert.equal(readResult.output.data.text, 'hi');

  const writeResult = context.runStorageRequest({
    uri: 's3://bucket-1/folder/new.txt',
    operation: 'write',
    payload: { text: 'hello' }
  });
  assert.equal(writeResult.output.written.etag, 'etag-write');

  const deleteResult = context.runStorageRequest({
    uri: 's3://bucket-1/folder/new.txt',
    operation: 'delete'
  });
  assert.equal(deleteResult.output.deleted.deleted, true);

  assert.equal(calls.some(call => call.options && call.options.headers && call.options.headers.Authorization), true);
});

test('S3 maps 404 to AstStorageNotFoundError', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => createResponse({ status: 404, body: 'Not Found' })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          S3_ACCESS_KEY_ID: 'AKIA_TEST',
          S3_SECRET_ACCESS_KEY: 'SECRET_TEST',
          S3_REGION: 'us-east-1'
        })
      })
    }
  });

  loadStorageScripts(context);

  assert.throws(
    () => context.runStorageRequest({
      uri: 's3://bucket/missing.txt',
      operation: 'head'
    }),
    error => {
      assert.equal(error.name, 'AstStorageNotFoundError');
      return true;
    }
  );
});
