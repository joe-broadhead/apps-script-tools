import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

test('AST.DBT.lineage returns upstream graph from parent_map', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.lineage({
    manifest: createManifestFixture(),
    uniqueId: 'model.demo.orders',
    direction: 'upstream',
    depth: 2
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.direction, 'upstream');

  const nodeIds = out.nodes.map(node => node.uniqueId);
  assert.equal(nodeIds.includes('model.demo.orders'), true);
  assert.equal(nodeIds.includes('model.demo.customers'), true);

  const hasEdge = out.edges.some(edge => edge.from === 'model.demo.orders' && edge.to === 'model.demo.customers');
  assert.equal(hasEdge, true);
});

test('AST.DBT.lineage respects includeDisabled=false by default', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.lineage({
    manifest: createManifestFixture({
      child_map: {
        'model.demo.orders': ['model.demo.old_orders']
      }
    }),
    uniqueId: 'model.demo.orders',
    direction: 'downstream',
    depth: 2,
    includeDisabled: false
  });

  const nodeIds = out.nodes.map(node => node.uniqueId);
  assert.equal(nodeIds.includes('model.demo.old_orders'), false);
});
