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

  const listResult = context.astRunStorageRequest({
    uri: 'gcs://my-bucket/folder/',
    operation: 'list'
  });

  assert.equal(listResult.provider, 'gcs');
  assert.equal(listResult.output.items.length, 1);
  assert.equal(listResult.page.nextPageToken, 'token-2');

  const readResult = context.astRunStorageRequest({
    uri: 'gcs://my-bucket/folder/a.txt',
    operation: 'read'
  });

  assert.equal(readResult.output.data.mimeType, 'text/plain');
  assert.equal(readResult.output.data.text, 'hi');

  const delResult = context.astRunStorageRequest({
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
    () => context.astRunStorageRequest({
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

  const result = context.astRunStorageRequest({
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

  const out = context.astRunStorageRequest({
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

  const out = context.astRunStorageRequest({
    uri: 'gcs://my-bucket/folder/',
    operation: 'list',
    options: {
      maxItems: 1
    }
  });

  assert.equal(out.output.items.length, 1);
  assert.equal(out.page.truncated, true);
});

test('GCS exists returns false instead of throwing for missing objects', () => {
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

  const out = context.astRunStorageRequest({
    uri: 'gcs://my-bucket/missing.txt',
    operation: 'exists'
  });

  assert.equal(out.output.exists.exists, false);
  assert.equal(out.output.exists.uri, 'gcs://my-bucket/missing.txt');
});

test('GCS copy/move/signed_url/multipart_write operations return normalized output', () => {
  const calls = [];
  const baseContext = createGasContext();
  const context = createGasContext({
    Utilities: {
      ...baseContext.Utilities,
      computeRsaSha256Signature: () => [1, 2, 3, 4]
    },
    ScriptApp: {
      getOAuthToken: () => 'oauth-token'
    },
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url.includes('/rewriteTo/')) {
          return createResponse({
            status: 200,
            body: JSON.stringify({
              done: true,
              resource: {
                id: 'copied-object',
                size: '5',
                etag: 'etag-copy',
                generation: '11',
                contentType: 'text/plain'
              }
            })
          });
        }

        if (url.includes('/upload/storage/v1/') && url.includes('uploadType=resumable')) {
          return createResponse({
            status: 200,
            headers: {
              location: 'https://upload.test/session-1'
            },
            body: ''
          });
        }

        if (url === 'https://upload.test/session-1') {
          return createResponse({
            status: 200,
            body: JSON.stringify({
              id: 'multipart-object',
              size: '5',
              etag: 'etag-multi',
              generation: '17',
              contentType: 'text/plain'
            })
          });
        }

        if (options.method === 'delete') {
          return createResponse({ status: 204, body: '' });
        }

        if (options.method === 'get') {
          return createResponse({ status: 404, body: '{}' });
        }

        return createResponse({ status: 200, body: '{}' });
      }
    }
  });

  loadStorageScripts(context);

  const copied = context.astRunStorageRequest({
    operation: 'copy',
    fromUri: 'gcs://source-bucket/path/a.txt',
    toUri: 'gcs://target-bucket/path/b.txt'
  });
  assert.equal(copied.output.copied.fromUri, 'gcs://source-bucket/path/a.txt');
  assert.equal(copied.output.copied.toUri, 'gcs://target-bucket/path/b.txt');

  const moved = context.astRunStorageRequest({
    operation: 'move',
    fromUri: 'gcs://source-bucket/path/a.txt',
    toUri: 'gcs://target-bucket/path/c.txt'
  });
  assert.equal(moved.output.moved.deletedSource, true);

  const signed = context.astRunStorageRequest({
    operation: 'signed_url',
    uri: 'gcs://target-bucket/path/b.txt',
    options: {
      method: 'PUT',
      expiresInSec: 600
    },
    providerOptions: {
      requestDate: '2026-02-21T00:00:00.000Z'
    },
    auth: {
      authMode: 'service_account',
      serviceAccountJson: JSON.stringify({
        client_email: 'svc@example.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n'
      })
    }
  });
  assert.equal(signed.output.signedUrl.method, 'PUT');
  assert.match(signed.output.signedUrl.url, /X-Goog-Signature=/);

  const multipart = context.astRunStorageRequest({
    operation: 'multipart_write',
    uri: 'gcs://target-bucket/path/upload.txt',
    payload: {
      text: 'hello'
    }
  });
  assert.equal(multipart.output.multipartWritten.size, 5);

  assert.equal(calls.some(call => call.url.includes('/rewriteTo/')), true);
  assert.equal(calls.some(call => call.url.includes('uploadType=resumable')), true);
});

test('GCS write maps ifNoneMatch="*" to create-only generation precondition', () => {
  const calls = [];
  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token'
    },
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });
        return createResponse({
          status: 200,
          body: JSON.stringify({
            id: 'obj-1',
            size: '5',
            etag: 'etag-write',
            generation: '17',
            contentType: 'text/plain'
          })
        });
      }
    }
  });

  loadStorageScripts(context);

  const out = context.astRunStorageRequest({
    uri: 'gcs://my-bucket/path/new.txt',
    operation: 'write',
    payload: { text: 'hello' },
    options: {
      ifNoneMatch: true
    }
  });

  assert.equal(out.output.written.generation, '17');
  const writeCall = calls.find(call => String(call.url || '').includes('uploadType=media'));
  assert.equal(Boolean(writeCall), true);
  assert.match(writeCall.url, /ifGenerationMatch=0/);
});
