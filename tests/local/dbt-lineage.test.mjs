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

test('AST.DBT.columnLineage returns inferred upstream column edges with confidence metadata', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const manifest = createManifestFixture();
  manifest.nodes['model.demo.orders'].columns.customer_id = {
    name: 'customer_id',
    description: 'Customer id from dimension',
    data_type: 'string',
    meta: { pii: true },
    tags: ['id']
  };

  const out = context.AST.DBT.columnLineage({
    manifest,
    uniqueId: 'model.demo.orders',
    columnName: 'customer_id',
    direction: 'upstream',
    depth: 2
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.direction, 'upstream');
  assert.equal(out.columnName, 'customer_id');
  assert.equal(Array.isArray(out.nodes), true);
  assert.equal(Array.isArray(out.edges), true);
  assert.equal(out.nodes.length >= 2, true);

  const edge = out.edges.find(item => (
    item.from.uniqueId === 'model.demo.orders'
      && item.from.columnName === 'customer_id'
      && item.to.uniqueId === 'model.demo.customers'
      && item.to.columnName === 'customer_id'
      && item.direction === 'upstream'
  ));

  assert.ok(edge, 'Expected upstream edge between customer_id columns');
  assert.equal(edge.confidence >= 0.95, true);
  assert.equal(typeof edge.confidenceLabel, 'string');
});

test('AST.DBT.columnLineage applies confidenceThreshold and keeps deterministic origin node', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.columnLineage({
    manifest: createManifestFixture(),
    uniqueId: 'model.demo.orders',
    columnName: 'order_id',
    direction: 'upstream',
    depth: 2,
    confidenceThreshold: 0.95
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.edges.length, 0);
  assert.equal(out.nodes.length, 1);
  assert.equal(out.nodes[0].origin, true);
  assert.equal(out.nodes[0].uniqueId, 'model.demo.orders');
  assert.equal(out.nodes[0].columnName, 'order_id');
});

test('AST.DBT.run supports column_lineage operation', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const manifest = createManifestFixture();
  manifest.nodes['model.demo.orders'].columns.customer_id = {
    name: 'customer_id',
    description: 'Customer id from dimension',
    data_type: 'string',
    meta: { pii: true },
    tags: ['id']
  };

  const out = context.AST.DBT.run({
    operation: 'column_lineage',
    manifest,
    uniqueId: 'model.demo.orders',
    columnName: 'customer_id',
    direction: 'upstream'
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.direction, 'upstream');
  assert.equal(out.columnName, 'customer_id');
  assert.equal(out.edges.length > 0, true);
});
