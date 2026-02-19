import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('dropDuplicates treats null/undefined/missing equivalently for key comparisons', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, group: 'a', marker: null },
    { id: 2, group: 'a', marker: undefined },
    { id: 3, group: 'a' }
  ]);

  const deduped = df.dropDuplicates(['group', 'marker']);
  assert.equal(deduped.len(), 1);
});

test('dropDuplicates canonicalizes object keys for deterministic comparison', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, payload: { a: 1, b: 2 } },
    { id: 2, payload: { b: 2, a: 1 } }
  ]);

  const deduped = df.dropDuplicates(['payload']);
  assert.equal(deduped.len(), 1);
});

test('merge aligns null and undefined join keys', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const left = context.DataFrame.fromRecords([
    { id: 'L1', key: null },
    { id: 'L2', key: undefined }
  ]);

  const right = context.DataFrame.fromRecords([
    { key: undefined, value: 'U' },
    { key: null, value: 'N' }
  ]);

  const joined = left.merge(right, 'inner', { on: 'key' }).toRecords();
  assert.equal(joined.length, 4);
  assert.equal(JSON.stringify(joined.map(row => row.id)), JSON.stringify(['L1', 'L1', 'L2', 'L2']));
});
