import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.schema returns inferred and casted types in local context', () => {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const inferred = context.DataFrame.fromRecords([
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false }
  ]);

  assert.equal(
    JSON.stringify(inferred.schema()),
    JSON.stringify({ id: 'number', name: 'string', active: 'boolean' })
  );

  const casted = context.DataFrame.fromRecords([
    { id: 1, amount: '10.5' }
  ]).asType({
    id: 'string',
    amount: 'float'
  });

  assert.equal(
    JSON.stringify(casted.schema()),
    JSON.stringify({ id: 'string', amount: 'number' })
  );
});
