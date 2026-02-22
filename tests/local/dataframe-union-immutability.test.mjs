import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.union returns a clone when the right DataFrame is empty', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const left = context.DataFrame
    .fromRecords([{ id: 1, amount: 10.5 }])
    .asType({ id: 'string', amount: 'float' });

  const right = context.DataFrame.fromRecords([]);
  const result = left.union(right);

  assert.notEqual(result, left);
  assert.equal(JSON.stringify(result.schema()), JSON.stringify(left.schema()));
  assert.equal(result.data.id.array[0], '1');

  result.data.id.array[0] = '999';
  assert.equal(left.data.id.array[0], '1');
});
