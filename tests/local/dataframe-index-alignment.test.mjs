import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadCoreDataContext } from './helpers.mjs';

function createDataContext() {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });
  loadCoreDataContext(context);
  return context;
}

function assertJsonEqual(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

test('Series.sortIndex sorts by index labels and keeps duplicate-label order stable', () => {
  const context = createDataContext();
  const series = new context.Series([20, 10, 30, 15], 'scores', null, ['b', 'a', 'c', 'a']);

  const asc = series.sortIndex();
  assertJsonEqual(asc.index, ['a', 'a', 'b', 'c']);
  assertJsonEqual(asc.array, [10, 15, 20, 30]);

  const desc = series.sortIndex(false);
  assertJsonEqual(desc.index, ['c', 'b', 'a', 'a']);
  assertJsonEqual(desc.array, [30, 20, 10, 15]);

  assertJsonEqual(series.index, ['b', 'a', 'c', 'a']);
  assertJsonEqual(series.array, [20, 10, 30, 15]);
  assert.throws(() => series.sortIndex('asc'), /ascending must be boolean/);
});

test('Series.reindex validates unknown labels and supports deterministic fill behavior', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2], 'values', null, ['x', 'y']);

  assert.throws(() => series.reindex(['x', 'z']), /unknown index labels/);

  const reindexed = series.reindex(['y', 'z', 'x'], {
    allowMissingLabels: true,
    fillValue: 0
  });
  assertJsonEqual(reindexed.index, ['y', 'z', 'x']);
  assertJsonEqual(reindexed.array, [2, 0, 1]);

  const duplicateReindex = new context.Series([10, 20], 'dup-values', null, ['dup', 'dup']);
  const duplicateReindexed = duplicateReindex.reindex(['dup', 'dup'], {
    allowMissingLabels: true,
    fillValue: null
  });
  assertJsonEqual(duplicateReindexed.array, [10, 20]);

  const duplicateIndex = new context.Series([10, 20], 'dup', null, ['same', 'same']);
  assert.throws(
    () => duplicateIndex.reindex(['same'], { verifyIntegrity: true }),
    /duplicate index label/
  );
});

test('Series.align supports inner/outer/left/right joins with disjoint labels', () => {
  const context = createDataContext();
  const left = new context.Series([1, 2], 'left', null, ['a', 'b']);
  const right = new context.Series([10, 30], 'right', null, ['b', 'c']);

  const outer = left.align(right, { join: 'outer', fillValue: null });
  assertJsonEqual(outer.index, ['a', 'b', 'c']);
  assertJsonEqual(outer.left.array, [1, 2, null]);
  assertJsonEqual(outer.right.array, [null, 10, 30]);

  const inner = left.align(right, { join: 'inner' });
  assertJsonEqual(inner.index, ['b']);
  assertJsonEqual(inner.left.array, [2]);
  assertJsonEqual(inner.right.array, [10]);

  const leftJoin = left.align(right, { join: 'left', fillValue: -1 });
  assertJsonEqual(leftJoin.index, ['a', 'b']);
  assertJsonEqual(leftJoin.left.array, [1, 2]);
  assertJsonEqual(leftJoin.right.array, [-1, 10]);

  const rightJoin = left.align(right, { join: 'right', fillValue: -1 });
  assertJsonEqual(rightJoin.index, ['b', 'c']);
  assertJsonEqual(rightJoin.left.array, [2, -1]);
  assertJsonEqual(rightJoin.right.array, [10, 30]);

  assert.throws(() => left.align(right, { join: 'cross' }), /join must be one of inner\|outer\|left\|right/);

  const dupLeft = new context.Series([1, 2], 'dup-left', null, ['dup', 'dup']);
  const dupRight = new context.Series([10, 20], 'dup-right', null, ['dup', 'dup']);
  const dupAligned = dupLeft.align(dupRight, { join: 'left', fillValue: null });
  assertJsonEqual(dupAligned.left.array, [1, 2]);
  assertJsonEqual(dupAligned.right.array, [10, 20]);

  const uniqueRight = new context.Series([99], 'unique-right', null, ['dup']);
  const dupAgainstUnique = dupLeft.align(uniqueRight, { join: 'left', fillValue: null });
  assertJsonEqual(dupAgainstUnique.right.array, [99, 99]);
});

test('DataFrame.setIndex supports single and multi-column keys with integrity checks', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { country: 'NL', city: 'AMS', value: 10 },
    { country: 'US', city: 'NYC', value: 20 }
  ]);

  const withSingleKey = df.setIndex('country', { drop: false });
  assertJsonEqual(withSingleKey.index, ['NL', 'US']);
  assertJsonEqual(withSingleKey.columns, ['country', 'city', 'value']);
  assertJsonEqual(df.index, [0, 1]);

  const withMultiKey = df.setIndex(['country', 'city']);
  assertJsonEqual(withMultiKey.columns, ['value']);
  assertJsonEqual(withMultiKey.index, [
    JSON.stringify(['string:NL', 'string:AMS']),
    JSON.stringify(['string:US', 'string:NYC'])
  ]);
  assertJsonEqual(withMultiKey.toRecords(), [{ value: 10 }, { value: 20 }]);

  const specialKeys = context.DataFrame.fromColumns({
    k1: [null, NaN, Infinity, -Infinity],
    k2: ['x', 'x', 'x', 'x'],
    v: [1, 2, 3, 4]
  });
  const specialIndexed = specialKeys.setIndex(['k1', 'k2'], { drop: false, verifyIntegrity: true });
  assert.equal(new Set(specialIndexed.index).size, 4);

  const duplicate = context.DataFrame.fromRecords([
    { k1: 'A', k2: 1, v: 10 },
    { k1: 'A', k2: 1, v: 20 }
  ]);
  assert.throws(
    () => duplicate.setIndex(['k1', 'k2'], { verifyIntegrity: true }),
    /duplicate index label/
  );

  assert.throws(() => df.setIndex([]), /requires at least one key column/);

  const singleColumn = context.DataFrame.fromRecords([{ only: 1 }, { only: 2 }]);
  assert.throws(
    () => singleColumn.setIndex('only'),
    /cannot drop all columns/
  );
});

test('DataFrame.sortIndex sorts by index labels and preserves stable order for duplicates', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { id: 1, label: 'row1' },
    { id: 2, label: 'row2' },
    { id: 3, label: 'row3' },
    { id: 4, label: 'row4' }
  ]);
  df.index = ['b', 'a', 'a', 'c'];

  const asc = df.sortIndex();
  assertJsonEqual(asc.index, ['a', 'a', 'b', 'c']);
  assertJsonEqual(asc.toRecords().map(row => row.id), [2, 3, 1, 4]);

  const desc = df.sortIndex({ ascending: false });
  assertJsonEqual(desc.index, ['c', 'b', 'a', 'a']);
  assertJsonEqual(desc.toRecords().map(row => row.id), [4, 1, 2, 3]);

  assert.throws(() => df.sortIndex({ ascending: 'false' }), /ascending must be boolean/);
});

test('DataFrame.reindex enforces strict unknown-label handling and supports fill values', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);
  df.index = ['r1', 'r2'];

  assert.throws(
    () => df.reindex({ index: ['r2', 'r3'] }),
    /unknown index labels/
  );
  assert.throws(
    () => df.reindex({ columns: ['a', 'missing'] }),
    /unknown column labels/
  );
  assert.throws(
    () => df.reindex({ columns: [] }),
    /columns must contain at least one column/
  );

  const reindexed = df.reindex({
    index: ['r2', 'r3', 'r1'],
    columns: ['b', 'c', 'a'],
    allowMissingLabels: true,
    fillValue: 0
  });

  assertJsonEqual(reindexed.index, ['r2', 'r3', 'r1']);
  assertJsonEqual(reindexed.columns, ['b', 'c', 'a']);
  assertJsonEqual(reindexed.toRecords(), [
    { b: 20, c: 0, a: 2 },
    { b: 0, c: 0, a: 0 },
    { b: 10, c: 0, a: 1 }
  ]);

  const duplicateFrame = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);
  duplicateFrame.index = ['dup', 'dup'];
  const duplicateReindexed = duplicateFrame.reindex({
    index: ['dup', 'dup'],
    allowMissingLabels: true,
    fillValue: null
  });
  assertJsonEqual(duplicateReindexed.toRecords(), [
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);

  const uniqueFrame = context.DataFrame.fromRecords([{ a: 7, b: 70 }]);
  uniqueFrame.index = ['row'];
  const uniqueReindexed = uniqueFrame.reindex({
    index: ['row', 'row'],
    allowMissingLabels: true,
    fillValue: null
  });
  assertJsonEqual(uniqueReindexed.toRecords(), [
    { a: 7, b: 70 },
    { a: 7, b: 70 }
  ]);

  const duplicateIndex = context.DataFrame.fromRecords([
    { a: 1 },
    { a: 2 }
  ]);
  duplicateIndex.index = ['dup', 'dup'];
  assert.throws(
    () => duplicateIndex.reindex({ index: ['dup'], verifyIntegrity: true, allowMissingLabels: true }),
    /duplicate index label/
  );

  const cloned = df.reindex();
  assert.notEqual(cloned, df);
  assertJsonEqual(cloned.index, ['r1', 'r2']);
  assertJsonEqual(cloned.toRecords(), [
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);

  assert.throws(() => df.reindex({ allowMissingLabels: 'true' }), /allowMissingLabels must be boolean/);
  assert.throws(() => df.reindex({ verifyIntegrity: 'true' }), /verifyIntegrity must be boolean/);
});
