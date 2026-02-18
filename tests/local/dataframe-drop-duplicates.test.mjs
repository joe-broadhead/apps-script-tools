import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.dropDuplicates ignores id by default when other columns exist', () => {
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
  assert.equal(result.len(), 3);

  const resultSubset = df.dropDuplicates(['name', 'age']);
  assert.equal(resultSubset.len(), 3);
});

test('DataFrame.dropDuplicates compares Date/object values by content', () => {
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
  assert.equal(result.len(), 2);
});
