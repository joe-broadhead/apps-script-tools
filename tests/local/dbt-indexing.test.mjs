import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

test('astDbtBuildManifestIndexes builds fast lookup maps and token indexes', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false });

  const index = context.astDbtBuildManifestIndexes(createManifestFixture());

  assert.equal(index.entityCount >= 3, true);
  assert.equal(index.columnCount >= 3, true);

  assert.equal(Array.isArray(index.byUniqueId['model.demo.orders']), true);
  assert.equal(Array.isArray(index.bySection.nodes), true);
  assert.equal(Array.isArray(index.byResourceType.model), true);
  assert.equal(Array.isArray(index.byTag.finance), true);

  assert.equal(Array.isArray(index.columnsByUniqueId['model.demo.orders'].order), true);
  assert.equal(typeof index.columnsByUniqueId['model.demo.orders'].byName.order_id, 'object');

  assert.equal(Array.isArray(index.tokens.entities.orders), true);
  assert.equal(Array.isArray(index.tokens.columns.order_id), true);
});

test('loadManifest builds index when options.buildIndex=true', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.loadManifest({
    manifest: createManifestFixture(),
    options: {
      buildIndex: true,
      validate: 'strict'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(typeof out.bundle.index, 'object');
  assert.equal(out.bundle.index.entityCount >= 3, true);
});
