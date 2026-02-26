import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

test('AST.DBT.loadManifest rejects unsupported providers and invalid URIs', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  assert.throws(
    () => context.AST.DBT.loadManifest({
      uri: 'azure://bucket/manifest.json'
    }),
    /uri must use one of/
  );

  assert.throws(
    () => context.AST.DBT.loadManifest({
      provider: 'azure',
      location: { bucket: 'x', key: 'y' }
    }),
    /provider must be one of/
  );
});

test('AST.DBT.loadArtifact rejects unsupported artifactType', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  assert.throws(
    () => context.AST.DBT.loadArtifact({
      artifactType: 'manifest',
      artifact: {}
    }),
    /artifactType must be one of/
  );
});

test('AST.DBT.getEntity/getColumn throws typed not-found errors', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  assert.throws(
    () => context.AST.DBT.getEntity({
      manifest: createManifestFixture(),
      uniqueId: 'model.demo.missing'
    }),
    error => {
      assert.equal(error.name, 'AstDbtNotFoundError');
      return true;
    }
  );

  assert.throws(
    () => context.AST.DBT.getColumn({
      manifest: createManifestFixture(),
      uniqueId: 'model.demo.orders',
      columnName: 'missing_col'
    }),
    error => {
      assert.equal(error.name, 'AstDbtNotFoundError');
      return true;
    }
  );
});

test('AST.DBT.loadManifest throws capability error when storage runtime is unavailable', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  assert.throws(
    () => context.AST.DBT.loadManifest({
      uri: 'gcs://bucket/path/manifest.json'
    }),
    error => {
      assert.equal(error.name, 'AstDbtCapabilityError');
      return true;
    }
  );
});

test('AST.DBT.validateManifest returns invalid status without throw by default', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const invalid = createManifestFixture();
  delete invalid.sources;

  const out = context.AST.DBT.validateManifest({
    manifest: invalid,
    options: {
      validate: 'strict'
    }
  });

  assert.equal(out.valid, false);
  assert.equal(out.status, 'invalid');
  assert.equal(out.errors.length > 0, true);
});

test('AST.DBT.validateManifest respects throwOnInvalid=false for prebuilt bundle requests', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.validateManifest({
    bundle: {
      manifest: {}
    },
    options: {
      validate: 'strict'
    },
    throwOnInvalid: false
  });

  assert.equal(out.status, 'invalid');
  assert.equal(out.valid, false);
  assert.equal(Array.isArray(out.errors), true);
  assert.equal(out.errors.length > 0, true);
});

test('AST.DBT.loadManifest ignores source defaults when inline manifest is supplied', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => (key === 'DBT_MANIFEST_URI' ? 'azure://invalid/manifest.json' : null),
        getProperties: () => ({
          DBT_MANIFEST_URI: 'azure://invalid/manifest.json'
        }),
        setProperties: () => {}
      })
    }
  });

  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.loadManifest({
    manifest: createManifestFixture(),
    options: {
      validate: 'basic'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.metadata.projectName, 'demo_project');
});
