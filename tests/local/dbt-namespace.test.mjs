import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';

test('AST exposes DBT namespace and helper methods', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeAst: true, includeStorage: false });

  assert.equal(typeof context.AST.DBT.run, 'function');
  assert.equal(typeof context.AST.DBT.loadManifest, 'function');
  assert.equal(typeof context.AST.DBT.loadArtifact, 'function');
  assert.equal(typeof context.AST.DBT.inspectManifest, 'function');
  assert.equal(typeof context.AST.DBT.inspectArtifact, 'function');
  assert.equal(typeof context.AST.DBT.listEntities, 'function');
  assert.equal(typeof context.AST.DBT.search, 'function');
  assert.equal(typeof context.AST.DBT.getEntity, 'function');
  assert.equal(typeof context.AST.DBT.getColumn, 'function');
  assert.equal(typeof context.AST.DBT.lineage, 'function');
  assert.equal(typeof context.AST.DBT.diffEntities, 'function');
  assert.equal(typeof context.AST.DBT.impact, 'function');
  assert.equal(typeof context.AST.DBT.providers, 'function');
  assert.equal(typeof context.AST.DBT.capabilities, 'function');
  assert.equal(typeof context.AST.DBT.validateManifest, 'function');

  assert.equal(
    JSON.stringify(context.AST.DBT.providers()),
    JSON.stringify(['drive', 'gcs', 's3', 'dbfs'])
  );
});
