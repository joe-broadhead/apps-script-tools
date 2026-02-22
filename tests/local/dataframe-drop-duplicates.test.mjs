import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.dropDuplicates uses all columns by default', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, name: 'Alice', age: null },
    { id: 2, name: 'Bob', age: 25 },
    { id: 3, name: null, age: 30 },
    { id: 4, name: null, age: 30 },
    { id: 5, name: 'Alice', age: null }
  ]);

  const result = df.dropDuplicates();
  assert.equal(result.len(), 5);

  const resultSubset = df.dropDuplicates(['name', 'age']);
  assert.equal(resultSubset.len(), 3);
});

test('DataFrame.dropDuplicates compares Date/object values by content for subset keys', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, date: new Date('2023-01-15T00:00:00.000Z'), nested: { key: 'value' } },
    { id: 2, date: new Date('2023-02-20T00:00:00.000Z'), nested: { key: 'other' } },
    { id: 3, date: new Date('2023-01-15T00:00:00.000Z'), nested: { key: 'value' } }
  ]);

  const result = df.dropDuplicates();
  assert.equal(result.len(), 3);

  const subsetResult = df.dropDuplicates(['date', 'nested']);
  assert.equal(subsetResult.len(), 2);
});

test('DataFrame.dropDuplicates preserves schema for typed empty DataFrames', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const emptyTyped = context.DataFrame.fromColumns({
    id: new context.Series([], 'id', 'string', [], { allowComplexValues: true, skipTypeCoercion: true }),
    amount: new context.Series([], 'amount', 'float', [], { allowComplexValues: true, skipTypeCoercion: true })
  }, {
    copy: false,
    index: []
  });

  const deduped = emptyTyped.dropDuplicates();

  assert.equal(deduped.len(), 0);
  assert.equal(JSON.stringify(deduped.columns), JSON.stringify(['id', 'amount']));
  assert.equal(JSON.stringify(deduped.schema()), JSON.stringify({ id: 'string', amount: 'float' }));
  assert.notEqual(deduped, emptyTyped);
});
