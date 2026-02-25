import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadDbtScripts } from './dbt-helpers.mjs';
import { createManifestFixture } from './dbt-fixture.mjs';

test('AST.DBT.search returns deterministic entity matches with filters/pagination', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.search({
    manifest: createManifestFixture(),
    target: 'entities',
    query: 'orders',
    filters: {
      resourceTypes: ['model'],
      packageNames: ['demo'],
      pathPrefix: 'models/marts',
      tagsAny: ['finance'],
      meta: [{ path: 'owner.team', op: 'eq', value: 'revops' }]
    },
    sort: {
      by: 'score',
      direction: 'desc'
    },
    page: {
      limit: 10,
      offset: 0
    },
    include: {
      meta: true,
      columns: 'summary'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.page.returned >= 1, true);
  assert.equal(out.items[0].itemType, 'entity');
  assert.equal(out.items[0].uniqueId, 'model.demo.orders');
  assert.equal(out.items[0].entity.columns.count >= 1, true);
  assert.equal(typeof out.stats.elapsedMs, 'number');
});

test('AST.DBT.search supports target=columns and column-level filters', () => {
  const context = createGasContext();
  loadDbtScripts(context, { includeStorage: false, includeAst: true });

  const out = context.AST.DBT.search({
    manifest: createManifestFixture(),
    target: 'columns',
    query: 'id',
    filters: {
      column: {
        namesAny: ['order_id'],
        dataTypesAny: ['string'],
        meta: [{ path: 'pii', op: 'eq', value: false }]
      }
    },
    include: {
      meta: true,
      columns: 'none'
    }
  });

  assert.equal(out.status, 'ok');
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].itemType, 'column');
  assert.equal(out.items[0].column.name, 'order_id');
});
