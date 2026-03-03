import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadSecretsScripts } from './secrets-helpers.mjs';

function createScriptPropertiesStore(seed = {}) {
  const values = { ...seed };
  return {
    values,
    handle: {
      getProperty: key => (Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null),
      getProperties: () => ({ ...values }),
      setProperty: (key, value) => {
        values[key] = String(value);
      },
      setProperties: map => {
        Object.keys(map || {}).forEach(key => {
          values[key] = String(map[key]);
        });
      },
      deleteProperty: key => {
        delete values[key];
      }
    }
  };
}

function createSecretManagerSuccessResponse(secretText) {
  const body = JSON.stringify({
    name: 'projects/p/secrets/s/versions/latest',
    payload: {
      data: Buffer.from(secretText, 'utf8').toString('base64')
    },
    createTime: '2026-01-01T00:00:00.000Z'
  });

  return {
    getResponseCode: () => 200,
    getContentText: () => body
  };
}

test('AST.Secrets script_properties provider supports get/set/delete', () => {
  const store = createScriptPropertiesStore({
    OPENAI_API_KEY: 'key-in-props'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  const get = context.AST.Secrets.get({ key: 'OPENAI_API_KEY' });
  assert.equal(get.value, 'key-in-props');
  assert.equal(get.provider, 'script_properties');

  const set = context.AST.Secrets.set({ key: 'RUNTIME_SECRET', value: 'abc123' });
  assert.equal(set.written, true);
  assert.equal(store.values.RUNTIME_SECRET, 'abc123');

  const del = context.AST.Secrets.delete({ key: 'RUNTIME_SECRET' });
  assert.equal(del.deleted, true);
  assert.equal(store.values.RUNTIME_SECRET, undefined);
});

test('AST.Secrets.get supports required=false and defaultValue fallback', () => {
  const store = createScriptPropertiesStore({});
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });
  loadSecretsScripts(context, { includeAst: true });

  const nullable = context.AST.Secrets.get({
    key: 'MISSING_ONE',
    options: { required: false }
  });
  assert.equal(nullable.value, null);
  assert.equal(nullable.found, false);

  const withDefault = context.AST.Secrets.get({
    key: 'MISSING_TWO',
    options: {
      defaultValue: 'fallback'
    }
  });
  assert.equal(withDefault.value, 'fallback');
});

test('AST.Secrets secret_manager provider resolves value and maps auth precedence', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (_url, options) => {
        assert.equal(options.headers.Authorization, 'Bearer explicit-token');
        return createSecretManagerSuccessResponse('secret-from-gsm');
      }
    },
    ScriptApp: {
      getOAuthToken: () => 'oauth-token'
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  context.AST.Secrets.clearConfig();
  context.AST.Secrets.configure({
    AST_SECRETS_PROVIDER: 'secret_manager',
    SECRET_MANAGER_PROJECT_ID: 'project-from-config'
  });

  const output = context.AST.Secrets.get({
    key: 'openai-key',
    auth: {
      oauthToken: 'explicit-token',
      projectId: 'project-from-request'
    }
  });

  assert.equal(output.provider, 'secret_manager');
  assert.equal(output.value, 'secret-from-gsm');
});

test('AST.Secrets secret_manager not found maps to typed error', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 404,
        getContentText: () => JSON.stringify({
          error: {
            message: 'not found'
          }
        })
      })
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Secrets.get({
      provider: 'secret_manager',
      key: 'missing-key',
      auth: {
        projectId: 'project-a',
        oauthToken: 'token-a'
      }
    }),
    error => {
      assert.equal(error.name, 'AstSecretsNotFoundError');
      return true;
    }
  );
});

test('AST.Secrets provider resolution follows request > runtime > script properties', () => {
  const store = createScriptPropertiesStore({
    AST_SECRETS_PROVIDER: 'script_properties',
    SECRET_MANAGER_PROJECT_ID: 'project-from-script',
    API_KEY_RAW: 'script-props-key'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    },
    UrlFetchApp: {
      fetch: () => createSecretManagerSuccessResponse('gsm-value')
    }
  });

  loadSecretsScripts(context, { includeAst: true });
  context.AST.Secrets.clearConfig();
  context.AST.Secrets.configure({
    AST_SECRETS_PROVIDER: 'secret_manager',
    SECRET_MANAGER_PROJECT_ID: 'project-from-runtime'
  });

  const runtimeDefault = context.AST.Secrets.get({
    key: 'api-key',
    auth: {
      oauthToken: 'token-a'
    }
  });
  assert.equal(runtimeDefault.provider, 'secret_manager');
  assert.equal(runtimeDefault.value, 'gsm-value');

  const requestOverride = context.AST.Secrets.get({
    provider: 'script_properties',
    key: 'API_KEY_RAW'
  });
  assert.equal(requestOverride.provider, 'script_properties');
  assert.equal(requestOverride.value, 'script-props-key');
});

test('AST.Secrets.resolveValue resolves secret:// references and detects cycles', () => {
  const store = createScriptPropertiesStore({
    OPENAI_API_KEY_REF: 'secret://script_properties/OPENAI_API_KEY_VALUE',
    OPENAI_API_KEY_VALUE: 'real-secret',
    LOOP_A: 'secret://script_properties/LOOP_B',
    LOOP_B: 'secret://script_properties/LOOP_A'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  const resolved = context.AST.Secrets.resolveValue('secret://script_properties/OPENAI_API_KEY_REF');
  assert.equal(resolved, 'real-secret');

  assert.throws(
    () => context.AST.Secrets.resolveValue('secret://script_properties/LOOP_A'),
    error => {
      assert.equal(error.name, 'AstSecretsValidationError');
      return true;
    }
  );
});

test('AST.Secrets.get parseJson option returns parsed object', () => {
  const store = createScriptPropertiesStore({
    STRUCTURED_SECRET: '{"ok":true,"source":"props"}'
  });

  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  const output = context.AST.Secrets.get({
    key: 'STRUCTURED_SECRET',
    options: { parseJson: true }
  });

  assert.equal(output.value.ok, true);
  assert.equal(output.value.source, 'props');
});

test('AST.Secrets.get honors configured required=false when request omits options.required', () => {
  const store = createScriptPropertiesStore({});
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadSecretsScripts(context, { includeAst: true });
  context.AST.Secrets.clearConfig();
  context.AST.Secrets.configure({
    AST_SECRETS_REQUIRED: false
  });

  const output = context.AST.Secrets.get({
    key: 'MISSING_KEY_WITH_CONFIG_DEFAULT'
  });
  assert.equal(output.value, null);
  assert.equal(output.found, false);
});

test('AST.Secrets rejects unsupported operations instead of coercing to get', () => {
  const store = createScriptPropertiesStore({});
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Secrets.run({
      operation: 'bogus',
      key: 'ANY_KEY'
    }),
    error => {
      assert.equal(error.name, 'AstSecretsValidationError');
      assert.match(error.message, /Unsupported secrets operation/);
      return true;
    }
  );
});

test('AST.Secrets capabilities include rotate and version metadata support', () => {
  const context = createGasContext();
  loadSecretsScripts(context, { includeAst: true });

  const scriptPropsCaps = context.AST.Secrets.capabilities('script_properties');
  assert.equal(scriptPropsCaps.rotate, true);
  assert.equal(scriptPropsCaps.list_versions, false);
  assert.equal(scriptPropsCaps.get_version_metadata, false);

  const secretManagerCaps = context.AST.Secrets.capabilities('secret_manager');
  assert.equal(secretManagerCaps.rotate, true);
  assert.equal(secretManagerCaps.list_versions, true);
  assert.equal(secretManagerCaps.get_version_metadata, true);
});

test('AST.Secrets.rotate works for script_properties provider', () => {
  const store = createScriptPropertiesStore({
    RUNTIME_SECRET: 'old-value'
  });
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });

  loadSecretsScripts(context, { includeAst: true });
  const out = context.AST.Secrets.rotate({
    provider: 'script_properties',
    key: 'RUNTIME_SECRET',
    value: 'new-value'
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.operation, 'rotate');
  assert.equal(out.rotated, true);
  assert.equal(out.metadata.provider, 'script_properties');
  assert.equal(out.metadata.previousExists, true);
  assert.equal(store.values.RUNTIME_SECRET, 'new-value');
});

test('AST.Secrets secret_manager supports rotate/listVersions/getVersionMetadata', () => {
  const requests = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        requests.push({ url, options });
        if (url.includes(':addVersion')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              name: 'projects/p/secrets/s/versions/8',
              createTime: '2026-03-03T00:00:00.000Z',
              etag: 'etag-8',
              state: 'ENABLED'
            })
          };
        }
        if (url.includes('/versions?')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              versions: [
                {
                  name: 'projects/p/secrets/s/versions/8',
                  state: 'ENABLED',
                  createTime: '2026-03-03T00:00:00.000Z',
                  etag: 'etag-8'
                }
              ],
              nextPageToken: 'next-token'
            })
          };
        }
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            name: 'projects/p/secrets/s/versions/8',
            state: 'ENABLED',
            createTime: '2026-03-03T00:00:00.000Z',
            etag: 'etag-8'
          })
        };
      }
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  const rotate = context.AST.Secrets.rotate({
    provider: 'secret_manager',
    key: 'my-secret',
    value: 'rotated-value',
    auth: {
      projectId: 'p',
      oauthToken: 'token'
    }
  });
  assert.equal(rotate.operation, 'rotate');
  assert.equal(rotate.metadata.versionName, 'projects/p/secrets/s/versions/8');

  const listed = context.AST.Secrets.listVersions({
    provider: 'secret_manager',
    key: 'my-secret',
    auth: {
      projectId: 'p',
      oauthToken: 'token'
    },
    options: {
      pageSize: 25
    }
  });
  assert.equal(listed.operation, 'list_versions');
  assert.equal(listed.items.length, 1);
  assert.equal(listed.page.nextPageToken, 'next-token');

  const metadata = context.AST.Secrets.getVersionMetadata({
    provider: 'secret_manager',
    key: 'my-secret',
    version: '8',
    auth: {
      projectId: 'p',
      oauthToken: 'token'
    }
  });
  assert.equal(metadata.operation, 'get_version_metadata');
  assert.equal(metadata.metadata.versionName, 'projects/p/secrets/s/versions/8');

  assert.ok(requests.some(entry => entry.url.endsWith('/projects/p/secrets/my-secret:addVersion')));
  assert.ok(requests.some(entry => entry.url.includes('/projects/p/secrets/my-secret/versions?pageSize=25')));
  assert.ok(requests.some(entry => entry.url.endsWith('/projects/p/secrets/my-secret/versions/8')));
});

test('AST.Secrets.listVersions throws capability error for script_properties', () => {
  const store = createScriptPropertiesStore({});
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => store.handle
    }
  });
  loadSecretsScripts(context, { includeAst: true });

  assert.throws(
    () => context.AST.Secrets.listVersions({
      provider: 'script_properties',
      key: 'ANY'
    }),
    error => {
      assert.equal(error.name, 'AstSecretsCapabilityError');
      return true;
    }
  );
});

test('AST.Secrets.rotate uses UTF-8-safe base64 fallback when Utilities is unavailable', () => {
  const requests = [];
  const btoaLatin1Only = value => {
    const input = String(value || '');
    for (let idx = 0; idx < input.length; idx += 1) {
      if (input.charCodeAt(idx) > 255) {
        throw new Error('InvalidCharacterError');
      }
    }
    return Buffer.from(input, 'binary').toString('base64');
  };

  const context = createGasContext({
    Utilities: undefined,
    Buffer,
    btoa: btoaLatin1Only,
    UrlFetchApp: {
      fetch: (url, options) => {
        requests.push({ url, options });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            name: 'projects/p/secrets/s/versions/9',
            createTime: '2026-03-03T00:00:00.000Z',
            etag: 'etag-9',
            state: 'ENABLED'
          })
        };
      }
    }
  });

  loadSecretsScripts(context, { includeAst: true });

  const value = 'emoji 🚴 and café';
  const out = context.AST.Secrets.rotate({
    provider: 'secret_manager',
    key: 'utf8-secret',
    value,
    auth: {
      projectId: 'p',
      oauthToken: 'token'
    }
  });

  assert.equal(out.operation, 'rotate');
  assert.equal(out.metadata.versionName, 'projects/p/secrets/s/versions/9');

  const requestPayload = JSON.parse(requests[0].options.payload);
  const decoded = Buffer.from(requestPayload.payload.data, 'base64').toString('utf8');
  assert.equal(decoded, value);
});

test('AST.Secrets accepts regional full resource keys for rotate/list/version metadata', () => {
  const requests = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options) => {
        requests.push({ url, options });
        if (url.includes(':addVersion')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              name: 'projects/p/locations/eu/secrets/s/versions/10',
              createTime: '2026-03-03T00:00:00.000Z',
              state: 'ENABLED'
            })
          };
        }
        if (url.includes('/versions?')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({
              versions: [
                {
                  name: 'projects/p/locations/eu/secrets/s/versions/10',
                  state: 'ENABLED'
                }
              ]
            })
          };
        }
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({
            name: 'projects/p/locations/eu/secrets/s/versions/10',
            state: 'ENABLED'
          })
        };
      }
    }
  });
  loadSecretsScripts(context, { includeAst: true });

  const fullVersionKey = 'projects/p/locations/eu/secrets/s/versions/10';

  context.AST.Secrets.rotate({
    provider: 'secret_manager',
    key: fullVersionKey,
    value: 'rotated',
    auth: { oauthToken: 'token' }
  });

  context.AST.Secrets.listVersions({
    provider: 'secret_manager',
    key: fullVersionKey,
    auth: { oauthToken: 'token' }
  });

  context.AST.Secrets.getVersionMetadata({
    provider: 'secret_manager',
    key: fullVersionKey,
    auth: { oauthToken: 'token' }
  });

  assert.ok(
    requests.some(entry => entry.url.endsWith('/projects/p/locations/eu/secrets/s:addVersion'))
  );
  assert.ok(
    requests.some(entry => entry.url.includes('/projects/p/locations/eu/secrets/s/versions?'))
  );
  assert.ok(
    requests.some(entry => entry.url.endsWith('/projects/p/locations/eu/secrets/s/versions/10'))
  );
});
