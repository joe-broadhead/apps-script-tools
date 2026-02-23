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

test('S3 presign helper builds deterministic query signature', () => {
  const context = createGasContext();
  loadStorageScripts(context);

  const presigned = context.astS3PresignUrl({
    method: 'GET',
    location: { bucket: 'bucket-1', key: 'path/file.txt' },
    config: {
      accessKeyId: 'AKIA_TEST',
      secretAccessKey: 'SECRET_TEST',
      region: 'us-east-1'
    },
    expiresInSec: 900,
    requestDate: new Date('2026-02-21T00:00:00.000Z')
  });

  assert.match(presigned.url, /X-Amz-Algorithm=AWS4-HMAC-SHA256/);
  assert.match(presigned.url, /X-Amz-Signature=[0-9a-f]{64}/);
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

test('S3 list marks truncated when maxItems caps provider results', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        if (url.includes('list-type=2')) {
          return createResponse({
            status: 200,
            body: [
              '<ListBucketResult>',
              '<IsTruncated>false</IsTruncated>',
              '<Contents><Key>folder/a.txt</Key><Size>1</Size></Contents>',
              '<Contents><Key>folder/b.txt</Key><Size>1</Size></Contents>',
              '</ListBucketResult>'
            ].join('')
          });
        }

        if (options.method === 'head') {
          return createResponse({ status: 200 });
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

  const out = context.runStorageRequest({
    uri: 's3://bucket-1/folder/',
    operation: 'list',
    options: {
      maxItems: 1
    }
  });

  assert.equal(out.output.items.length, 1);
  assert.equal(out.page.truncated, true);
});

test('S3 exists returns false instead of throwing for missing objects', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options = {}) => {
        if (options.method === 'head') {
          return createResponse({ status: 404, body: 'Not Found' });
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

  const out = context.runStorageRequest({
    uri: 's3://bucket/missing.txt',
    operation: 'exists'
  });

  assert.equal(out.output.exists.exists, false);
  assert.equal(out.output.exists.uri, 's3://bucket/missing.txt');
});

test('S3 copy/move/signed_url/multipart_write operations return normalized output', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url.includes('uploads=')) {
          return createResponse({
            status: 200,
            body: '<InitiateMultipartUploadResult><UploadId>upload-123</UploadId></InitiateMultipartUploadResult>'
          });
        }

        if (url.includes('partNumber=')) {
          return createResponse({
            status: 200,
            headers: {
              etag: '"etag-part-1"'
            }
          });
        }

        if (url.includes('uploadId=') && options.method === 'post') {
          return createResponse({
            status: 200,
            body: '<CompleteMultipartUploadResult><ETag>"etag-complete"</ETag></CompleteMultipartUploadResult>'
          });
        }

        if (options.method === 'put' && options.headers['x-amz-copy-source']) {
          return createResponse({
            status: 200,
            headers: {
              etag: '"etag-copy"'
            }
          });
        }

        if (options.method === 'delete') {
          return createResponse({
            status: 204,
            body: ''
          });
        }

        return createResponse({
          status: 200,
          body: ''
        });
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

  const copied = context.runStorageRequest({
    operation: 'copy',
    fromUri: 's3://bucket-a/path/source.txt',
    toUri: 's3://bucket-a/path/copied.txt'
  });
  assert.equal(copied.output.copied.fromUri, 's3://bucket-a/path/source.txt');
  assert.equal(copied.output.copied.toUri, 's3://bucket-a/path/copied.txt');

  const moved = context.runStorageRequest({
    operation: 'move',
    fromUri: 's3://bucket-a/path/source.txt',
    toUri: 's3://bucket-a/path/moved.txt'
  });
  assert.equal(moved.output.moved.deletedSource, true);

  const signed = context.runStorageRequest({
    operation: 'signed_url',
    uri: 's3://bucket-a/path/moved.txt',
    options: {
      method: 'GET',
      expiresInSec: 300
    },
    providerOptions: {
      requestDate: '2026-02-21T00:00:00.000Z'
    }
  });
  assert.match(signed.output.signedUrl.url, /X-Amz-Signature=/);
  assert.equal(signed.output.signedUrl.expiresInSec, 300);

  const multipart = context.runStorageRequest({
    operation: 'multipart_write',
    uri: 's3://bucket-a/path/large.txt',
    payload: {
      text: 'hello world'
    },
    options: {
      partSizeBytes: 5
    }
  });
  assert.equal(multipart.output.multipartWritten.uploadId, 'upload-123');
  assert.equal(multipart.output.multipartWritten.partCount >= 2, true);

  assert.equal(calls.some(call => call.url.includes('uploads=')), true);
  assert.equal(calls.some(call => call.url.includes('partNumber=')), true);
});

test('S3 multipart_write handles zero-byte payloads without multipart completion', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (options.method === 'put') {
          return createResponse({
            status: 200,
            headers: {
              etag: '"etag-empty"'
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

  const out = context.runStorageRequest({
    operation: 'multipart_write',
    uri: 's3://bucket-a/path/empty.txt',
    payload: {
      text: ''
    },
    options: {
      partSizeBytes: 5
    }
  });

  assert.equal(out.output.multipartWritten.uploadId, null);
  assert.equal(out.output.multipartWritten.partCount, 0);
  assert.equal(out.output.multipartWritten.size, 0);
  assert.equal(out.output.multipartWritten.etag, '"etag-empty"');

  assert.equal(calls.some(call => call.url.includes('uploads=')), false);
  assert.equal(calls.some(call => call.url.includes('partNumber=')), false);
});
