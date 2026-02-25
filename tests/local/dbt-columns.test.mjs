import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

test('AST.DBT.getEntity returns deep entity details and full column payload', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.getEntity({
    manifest: createManifestFixture(),
    uniqueId: 'model.demo.orders',
    include: {
      meta: true,
      columns: 'full'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.item.uniqueId, 'model.demo.orders');
  assert.equal(out.item.meta.owner.team, 'revops');
  assert.equal(typeof out.item.columns.order_id, 'object');
  assert.equal(out.item.columns.order_id.meta.pii, false);
});

test('AST.DBT.getColumn returns deep column metadata', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.getColumn({
    manifest: createManifestFixture(),
    uniqueId: 'model.demo.customers',
    columnName: 'customer_id'
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.item.uniqueId, 'model.demo.customers');
  assert.equal(out.item.name, 'customer_id');
  assert.equal(out.item.meta.pii, true);
});
