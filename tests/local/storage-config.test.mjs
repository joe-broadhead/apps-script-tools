import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

test('resolveStorageConfig uses request auth first, then runtime config, then script properties', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          S3_ACCESS_KEY_ID: 'script-ak',
          S3_SECRET_ACCESS_KEY: 'script-sk',
          S3_REGION: 'eu-west-1'
        })
      })
    }
  });

  loadStorageScripts(context, { includeAst: true });

  context.AST.Storage.clearConfig();
  context.AST.Storage.configure({
    S3_ACCESS_KEY_ID: 'runtime-ak',
    S3_SECRET_ACCESS_KEY: 'runtime-sk',
    S3_REGION: 'us-east-1'
  });

  const normalized = context.validateStorageRequest({
    uri: 's3://bucket/key',
    operation: 'head',
    auth: {
      accessKeyId: 'request-ak',
      secretAccessKey: 'request-sk',
      region: 'ap-south-1'
    }
  });

  const resolved = context.resolveStorageConfig(normalized);

  assert.equal(resolved.accessKeyId, 'request-ak');
  assert.equal(resolved.secretAccessKey, 'request-sk');
  assert.equal(resolved.region, 'ap-south-1');

  const fallbackNormalized = context.validateStorageRequest({
    uri: 's3://bucket/key',
    operation: 'head'
  });
  const runtimeResolved = context.resolveStorageConfig(fallbackNormalized);
  assert.equal(runtimeResolved.accessKeyId, 'runtime-ak');
  assert.equal(runtimeResolved.region, 'us-east-1');
});

test('resolveStorageConfig supports GCS auto auth fallback using oauth token', () => {
  const context = createGasContext({
    ScriptApp: {
      getOAuthToken: () => 'oauth-token-from-scriptapp'
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({})
      })
    }
  });

  loadStorageScripts(context);

  const normalized = context.validateStorageRequest({
    uri: 'gcs://bucket/key',
    operation: 'read'
  });

  const resolved = context.resolveStorageConfig(normalized);
  assert.equal(resolved.authMode, 'auto');
  assert.equal(resolved.oauthToken, 'oauth-token-from-scriptapp');
});

test('AST exposes Storage surface and runtime config methods', () => {
  const context = createGasContext();
  loadStorageScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.Storage.run, 'function');
  assert.equal(typeof context.AST.Storage.list, 'function');
  assert.equal(typeof context.AST.Storage.head, 'function');
  assert.equal(typeof context.AST.Storage.read, 'function');
  assert.equal(typeof context.AST.Storage.write, 'function');
  assert.equal(typeof context.AST.Storage.delete, 'function');
  assert.equal(typeof context.AST.Storage.providers, 'function');
  assert.equal(typeof context.AST.Storage.capabilities, 'function');
  assert.equal(typeof context.AST.Storage.configure, 'function');
  assert.equal(typeof context.AST.Storage.getConfig, 'function');
  assert.equal(typeof context.AST.Storage.clearConfig, 'function');

  assert.equal(
    JSON.stringify(context.AST.Storage.providers()),
    JSON.stringify(['gcs', 's3', 'dbfs'])
  );
});

test('resolveStorageConfig requires dbfs host and token', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({})
      })
    }
  });

  loadStorageScripts(context);

  const normalized = context.validateStorageRequest({
    uri: 'dbfs:/mnt/path.txt',
    operation: 'head'
  });

  assert.throws(
    () => context.resolveStorageConfig(normalized),
    /Missing required storage configuration field 'host'/
  );
});
