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

test('GCS list/read/delete operations return normalized output', () => {
  const calls = [];

  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token'
    },
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url.includes('/storage/v1/b/my-bucket/o?')) {
          return createResponse({
            status: 200,
            body: JSON.stringify({
              items: [
                { name: 'folder/a.txt', size: '12', etag: 'etag-1', updated: '2026-01-01T00:00:00Z', contentType: 'text/plain' }
              ],
              nextPageToken: 'token-2'
            })
          });
        }

        if (url.includes('alt=media')) {
          return createResponse({
            status: 200,
            body: 'hello',
            headers: { 'content-type': 'text/plain' },
            blobBytes: [104, 105],
            blobMimeType: 'text/plain'
          });
        }

        if (options.method === 'delete') {
          return createResponse({ status: 204, body: '' });
        }

        return createResponse({
          status: 200,
          body: JSON.stringify({
            id: 'obj-1',
            size: '2',
            etag: 'etag-head',
            contentType: 'text/plain'
          })
        });
      }
    }
  });

  loadStorageScripts(context);

  const listResult = context.runStorageRequest({
    uri: 'gcs://my-bucket/folder/',
    operation: 'list'
  });

  assert.equal(listResult.provider, 'gcs');
  assert.equal(listResult.output.items.length, 1);
  assert.equal(listResult.page.nextPageToken, 'token-2');

  const readResult = context.runStorageRequest({
    uri: 'gcs://my-bucket/folder/a.txt',
    operation: 'read'
  });

  assert.equal(readResult.output.data.mimeType, 'text/plain');
  assert.equal(readResult.output.data.text, 'hi');

  const delResult = context.runStorageRequest({
    uri: 'gcs://my-bucket/folder/a.txt',
    operation: 'delete'
  });

  assert.equal(delResult.output.deleted.deleted, true);
  assert.equal(calls.length >= 3, true);
});

test('GCS maps 404 to AstStorageNotFoundError', () => {
  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token'
    },
    UrlFetchApp: {
      fetch: () => createResponse({
        status: 404,
        body: JSON.stringify({ error: { message: 'not found' } })
      })
    }
  });

  loadStorageScripts(context);

  assert.throws(
    () => context.runStorageRequest({
      uri: 'gcs://my-bucket/missing.txt',
      operation: 'head'
    }),
    error => {
      assert.equal(error.name, 'AstStorageNotFoundError');
      return true;
    }
  );
});

test('GCS service-account mode exchanges JWT assertion token', () => {
  const calls = [];

  const fakeServiceAccount = {
    client_email: 'svc@test-project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\\nFAKEKEY\\n-----END PRIVATE KEY-----\\n',
    token_uri: 'https://oauth2.googleapis.com/token'
  };

  const context = createGasContext({
    ScriptApp: {},
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          GCS_SERVICE_ACCOUNT_JSON: JSON.stringify(fakeServiceAccount)
        })
      })
    },
    Utilities: {
      ...createGasContext().Utilities,
      computeRsaSha256Signature: () => [1, 2, 3]
    },
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url === 'https://oauth2.googleapis.com/token') {
          return createResponse({
            status: 200,
            body: JSON.stringify({
              access_token: 'service-account-token',
              expires_in: 3600
            })
          });
        }

        return createResponse({
          status: 200,
          body: JSON.stringify({ items: [] })
        });
      }
    }
  });

  loadStorageScripts(context);

  const result = context.runStorageRequest({
    uri: 'gcs://my-bucket/',
    operation: 'list',
    auth: {
      authMode: 'service_account'
    }
  });

  assert.equal(result.provider, 'gcs');
  assert.equal(result.output.items.length, 0);
  assert.equal(calls.some(call => call.url === 'https://oauth2.googleapis.com/token'), true);
});

test('GCS read returns soft-cap warnings when payload exceeds configured limit', () => {
  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token'
    },
    UrlFetchApp: {
      fetch: url => {
        if (url.includes('alt=media')) {
          return createResponse({
            status: 200,
            body: 'hello',
            headers: { 'content-type': 'text/plain' },
            blobBytes: [104, 101, 108, 108, 111],
            blobMimeType: 'text/plain'
          });
        }

        return createResponse({ status: 500, body: '{}' });
      }
    }
  });

  loadStorageScripts(context);
  context.astStorageGetSoftLimitBytes = () => 1;

  const out = context.runStorageRequest({
    uri: 'gcs://bucket/path.txt',
    operation: 'read'
  });

  assert.equal(Array.isArray(out.warnings), true);
  assert.equal(out.warnings.length, 1);
  assert.match(out.warnings[0], /read payload exceeds soft cap/);
});

test('GCS list marks truncated when maxItems caps merged results', () => {
  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token'
    },
    UrlFetchApp: {
      fetch: url => {
        if (url.includes('/storage/v1/b/my-bucket/o?')) {
          return createResponse({
            status: 200,
            body: JSON.stringify({
              items: [
                { name: 'folder/a.txt', size: '1' },
                { name: 'folder/b.txt', size: '1' }
              ]
            })
          });
        }

        return createResponse({ status: 500, body: '{}' });
      }
    }
  });

  loadStorageScripts(context);

  const out = context.runStorageRequest({
    uri: 'gcs://my-bucket/folder/',
    operation: 'list',
    options: {
      maxItems: 1
    }
  });

  assert.equal(out.output.items.length, 1);
  assert.equal(out.page.truncated, true);
});
