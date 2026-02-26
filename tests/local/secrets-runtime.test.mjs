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
