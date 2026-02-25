import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

function createResponse({ status = 200, body = '{}' } = {}) {
  return {
    getResponseCode: () => status,
    getContentText: () => body,
    getAllHeaders: () => ({})
  };
}

test('DBFS list/head/read/write/delete operations return normalized output', () => {
  const calls = [];

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url.includes('/dbfs/list?')) {
          return createResponse({
            body: JSON.stringify({
              files: [
                {
                  path: 'dbfs:/mnt/data/file-1.txt',
                  is_dir: false,
                  file_size: 3,
                  modification_time: 1730000000000
                }
              ]
            })
          });
        }

        if (url.includes('/dbfs/get-status?')) {
          return createResponse({
            body: JSON.stringify({
              path: 'dbfs:/mnt/data/file-1.txt',
              is_dir: false,
              file_size: 3,
              modification_time: 1730000000000
            })
          });
        }

        if (url.includes('/dbfs/read?')) {
          const query = url.split('?')[1] || '';
          const params = Object.fromEntries(query.split('&').map(part => part.split('=').map(decodeURIComponent)));
          const offset = Number(params.offset || 0);
          if (offset === 0) {
            return createResponse({
              body: JSON.stringify({
                bytes_read: 2,
                data: 'aGk='
              })
            });
          }

          return createResponse({
            body: JSON.stringify({
              bytes_read: 0,
              data: ''
            })
          });
        }

        if (url.includes('/dbfs/put')) {
          return createResponse({ body: '{}' });
        }

        if (url.includes('/dbfs/delete')) {
          return createResponse({ body: '{}' });
        }

        return createResponse({ body: '{}' });
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  const listResult = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/data',
    operation: 'list'
  });
  assert.equal(listResult.output.items.length, 1);

  const headResult = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/data/file-1.txt',
    operation: 'head'
  });
  assert.equal(headResult.output.object.size, 3);

  const readResult = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/data/file-1.txt',
    operation: 'read'
  });
  assert.equal(readResult.output.data.base64, 'aGk=');

  const writeResult = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/data/new.txt',
    operation: 'write',
    payload: { text: 'hello' }
  });
  assert.equal(writeResult.output.written.size, 5);

  const deleteResult = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/data/new.txt',
    operation: 'delete'
  });
  assert.equal(deleteResult.output.deleted.deleted, true);

  assert.equal(calls.length >= 5, true);
});

test('DBFS chunked write uses create/add-block/close for large payloads', () => {
  const calls = [];

  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url.includes('/dbfs/create')) {
          return createResponse({ body: JSON.stringify({ handle: 11 }) });
        }

        if (url.includes('/dbfs/add-block')) {
          return createResponse({ body: '{}' });
        }

        if (url.includes('/dbfs/close')) {
          return createResponse({ body: '{}' });
        }

        return createResponse({ body: '{}' });
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  const largeText = 'x'.repeat(2 * 1024 * 1024);
  const out = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/data/large.txt',
    operation: 'write',
    payload: {
      text: largeText
    }
  });

  assert.equal(out.output.written.size, largeText.length);
  assert.equal(calls.some(call => call.url.includes('/dbfs/create')), true);
  assert.equal(calls.some(call => call.url.includes('/dbfs/add-block')), true);
  assert.equal(calls.some(call => call.url.includes('/dbfs/close')), true);
});

test('DBFS maps missing resources to AstStorageNotFoundError', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => createResponse({
        status: 404,
        body: JSON.stringify({
          error_code: 'RESOURCE_DOES_NOT_EXIST',
          message: 'missing'
        })
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  assert.throws(
    () => context.astRunStorageRequest({
      uri: 'dbfs:/mnt/missing.txt',
      operation: 'head'
    }),
    error => {
      assert.equal(error.name, 'AstStorageNotFoundError');
      return true;
    }
  );
});

test('DBFS list marks truncated when maxItems caps file list', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: url => {
        if (url.includes('/dbfs/list?')) {
          return createResponse({
            body: JSON.stringify({
              files: [
                { path: 'dbfs:/mnt/data/a.txt', is_dir: false, file_size: 1, modification_time: 1 },
                { path: 'dbfs:/mnt/data/b.txt', is_dir: false, file_size: 1, modification_time: 1 }
              ]
            })
          });
        }

        return createResponse({ body: '{}' });
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  const out = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/data',
    operation: 'list',
    options: {
      maxItems: 1
    }
  });

  assert.equal(out.output.items.length, 1);
  assert.equal(out.page.truncated, true);
});

test('DBFS exists returns false instead of throwing for missing paths', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => createResponse({
        status: 404,
        body: JSON.stringify({
          error_code: 'RESOURCE_DOES_NOT_EXIST',
          message: 'missing'
        })
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  const out = context.astRunStorageRequest({
    uri: 'dbfs:/mnt/missing.txt',
    operation: 'exists'
  });

  assert.equal(out.output.exists.exists, false);
  assert.equal(out.output.exists.uri, 'dbfs:/mnt/missing.txt');
});

test('DBFS copy/move/multipart_write operations return normalized output', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (url.includes('/dbfs/read?')) {
          return createResponse({
            body: JSON.stringify({
              bytes_read: 2,
              data: 'aGk='
            })
          });
        }

        if (url.includes('/dbfs/put') || url.includes('/dbfs/create') || url.includes('/dbfs/add-block') || url.includes('/dbfs/close')) {
          return createResponse({ body: '{}' });
        }

        if (url.includes('/dbfs/delete')) {
          return createResponse({ body: '{}' });
        }

        if (url.includes('/dbfs/get-status?')) {
          return createResponse({
            status: 404,
            body: JSON.stringify({
              error_code: 'RESOURCE_DOES_NOT_EXIST',
              message: 'missing'
            })
          });
        }

        return createResponse({ body: '{}' });
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  const copied = context.astRunStorageRequest({
    operation: 'copy',
    fromUri: 'dbfs:/mnt/data/source.txt',
    toUri: 'dbfs:/mnt/data/copied.txt'
  });
  assert.equal(copied.output.copied.fromUri, 'dbfs:/mnt/data/source.txt');
  assert.equal(copied.output.copied.toUri, 'dbfs:/mnt/data/copied.txt');

  const moved = context.astRunStorageRequest({
    operation: 'move',
    fromUri: 'dbfs:/mnt/data/source.txt',
    toUri: 'dbfs:/mnt/data/moved.txt'
  });
  assert.equal(moved.output.moved.deletedSource, true);

  const multipart = context.astRunStorageRequest({
    operation: 'multipart_write',
    uri: 'dbfs:/mnt/data/multipart.txt',
    payload: {
      text: 'hello'
    }
  });
  assert.equal(multipart.output.multipartWritten.size, 5);

  assert.equal(calls.some(call => call.url.includes('/dbfs/read?')), true);
  assert.equal(calls.some(call => call.url.includes('/dbfs/put')), true);
});

test('DBFS signed_url is rejected as unsupported capability', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  assert.throws(
    () => context.astRunStorageRequest({
      uri: 'dbfs:/mnt/data/file.txt',
      operation: 'signed_url'
    }),
    error => {
      assert.equal(error.name, 'AstStorageCapabilityError');
      return true;
    }
  );
});

test('DBFS write rejects conditional preconditions as unsupported capability', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          DATABRICKS_HOST: 'dbc.example.com',
          DATABRICKS_TOKEN: 'test-token'
        })
      })
    }
  });

  loadStorageScripts(context);

  assert.throws(
    () => context.astRunStorageRequest({
      uri: 'dbfs:/mnt/data/file.txt',
      operation: 'write',
      options: {
        ifMatch: '"etag-1"'
      },
      payload: {
        text: 'hello'
      }
    }),
    error => {
      assert.equal(error.name, 'AstStorageCapabilityError');
      return true;
    }
  );
});
