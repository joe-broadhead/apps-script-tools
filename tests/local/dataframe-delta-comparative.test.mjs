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

test('Series.shift supports positive, negative, and large periods with fill values', () => {
  const context = createDataContext();
  const series = new context.Series([10, 20, 30], 'values', null, ['a', 'b', 'c']);

  assert.equal(JSON.stringify(series.shift(1).array), JSON.stringify([null, 10, 20]));
  assert.equal(JSON.stringify(series.shift(1).index), JSON.stringify(['a', 'b', 'c']));
  assert.equal(JSON.stringify(series.shift(-1, 0).array), JSON.stringify([20, 30, 0]));
  assert.equal(JSON.stringify(series.shift(10, 'x').array), JSON.stringify(['x', 'x', 'x']));
  assert.equal(JSON.stringify(series.shift(0).array), JSON.stringify([10, 20, 30]));
  assert.throws(() => series.shift(1.5), /periods must be an integer/);
});

test('Series.diff and Series.pctChange cover periods, mixed values, and zero division controls', () => {
  const context = createDataContext();
  const series = new context.Series([10, 20, 10, 0], 'values');

  assert.equal(JSON.stringify(series.diff(1).array), JSON.stringify([null, 10, -10, -10]));
  assert.equal(JSON.stringify(series.diff(-1).array), JSON.stringify([-10, 10, 10, null]));
  assert.equal(JSON.stringify(series.diff(0).array), JSON.stringify([0, 0, 0, 0]));
  assert.equal(JSON.stringify(series.diff(99).array), JSON.stringify([null, null, null, null]));

  assert.equal(JSON.stringify(series.pctChange(1).array), JSON.stringify([null, 1, -0.5, -1]));
  assert.equal(JSON.stringify(series.pctChange(1, { zeroDivision: 'null' }).array), JSON.stringify([null, 1, -0.5, -1]));

  const zeroBase = new context.Series([0, 5, 10], 'zero');
  assert.equal(JSON.stringify(zeroBase.pctChange(1).array), JSON.stringify([null, null, 1]));
  const zeroBaseInfinity = zeroBase.pctChange(1, { zeroDivision: 'infinity' }).array;
  assert.equal(zeroBaseInfinity[0], null);
  assert.equal(zeroBaseInfinity[1], Infinity);
  assert.equal(zeroBaseInfinity[2], 1);
  assert.throws(() => zeroBase.pctChange(1, { zeroDivision: 'error' }), /division by zero/);

  const mixed = new context.Series([10, 'x', 20], 'mixed');
  assert.equal(JSON.stringify(mixed.diff(1).array), JSON.stringify([null, null, null]));
  assert.equal(JSON.stringify(mixed.pctChange(1).array), JSON.stringify([null, null, null]));
  assert.throws(() => series.pctChange(1, { zeroDivision: 'bad' }), /zeroDivision/);
});

test('DataFrame.shift supports explicit row and column axis semantics', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10, c: 100 },
    { a: 2, b: 20, c: 200 },
    { a: 3, b: 30, c: 300 }
  ]);
  df.index = ['r1', 'r2', 'r3'];

  const rowShift = df.shift(1, { axis: 'rows', fillValue: 0 });
  assert.equal(JSON.stringify(rowShift.data.a.array), JSON.stringify([0, 1, 2]));
  assert.equal(JSON.stringify(rowShift.data.b.array), JSON.stringify([0, 10, 20]));
  assert.equal(JSON.stringify(rowShift.index), JSON.stringify(['r1', 'r2', 'r3']));

  const colShift = df.shift(1, { axis: 'columns', fillValue: 'x' });
  assert.equal(JSON.stringify(colShift.data.a.array), JSON.stringify(['x', 'x', 'x']));
  assert.equal(JSON.stringify(colShift.data.b.array), JSON.stringify([1, 2, 3]));
  assert.equal(JSON.stringify(colShift.data.c.array), JSON.stringify([10, 20, 30]));

  const colShiftNeg = df.shift(-1, { axis: 1, fillValue: null });
  assert.equal(JSON.stringify(colShiftNeg.data.a.array), JSON.stringify([10, 20, 30]));
  assert.equal(JSON.stringify(colShiftNeg.data.b.array), JSON.stringify([100, 200, 300]));
  assert.equal(JSON.stringify(colShiftNeg.data.c.array), JSON.stringify([null, null, null]));

  assert.deepEqual(df.shift(0, { axis: 'rows' }).toRecords(), df.toRecords());
  assert.throws(() => df.shift(1.2), /periods must be an integer/);
  assert.throws(() => df.shift(1, { axis: 'bad' }), /axis must be one of/);
});

test('DataFrame.diff and DataFrame.pctChange handle axis behavior and boundary rows', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 10, b: 20, c: 0 },
    { a: 20, b: 10, c: 10 },
    { a: 10, b: null, c: 5 }
  ]);

  const rowDiff = df.diff(1, { axis: 'rows' });
  assert.equal(JSON.stringify(rowDiff.data.a.array), JSON.stringify([null, 10, -10]));
  assert.equal(JSON.stringify(rowDiff.data.b.array), JSON.stringify([null, -10, null]));
  assert.equal(JSON.stringify(rowDiff.data.c.array), JSON.stringify([null, 10, -5]));

  const colDiff = df.diff(1, { axis: 'columns' });
  assert.equal(JSON.stringify(colDiff.data.a.array), JSON.stringify([null, null, null]));
  assert.equal(JSON.stringify(colDiff.data.b.array), JSON.stringify([10, -10, null]));
  assert.equal(JSON.stringify(colDiff.data.c.array), JSON.stringify([-20, 0, null]));

  const rowPct = df.pctChange(1, { axis: 'rows' });
  assert.equal(JSON.stringify(rowPct.data.a.array), JSON.stringify([null, 1, -0.5]));
  assert.equal(JSON.stringify(rowPct.data.b.array), JSON.stringify([null, -0.5, null]));
  assert.equal(JSON.stringify(rowPct.data.c.array), JSON.stringify([null, null, -0.5]));

  const colPct = df.pctChange(1, { axis: 'columns' });
  assert.equal(JSON.stringify(colPct.data.a.array), JSON.stringify([null, null, null]));
  assert.equal(JSON.stringify(colPct.data.b.array), JSON.stringify([1, -0.5, null]));
  assert.equal(JSON.stringify(colPct.data.c.array), JSON.stringify([-1, 0, null]));

  const pctInfinity = df.pctChange(1, { axis: 'rows', zeroDivision: 'infinity' });
  assert.equal(pctInfinity.data.c.array[1], Infinity);
  assert.throws(() => df.pctChange(1, { axis: 'rows', zeroDivision: 'error' }), /division by zero/);
});

test('DataFrame delta methods support periods=0 and large periods', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 'x' },
    { a: 2, b: 'y' }
  ]);

  const zeroDiff = df.diff(0, { axis: 'rows' });
  assert.equal(JSON.stringify(zeroDiff.data.a.array), JSON.stringify([0, 0]));
  assert.equal(JSON.stringify(zeroDiff.data.b.array), JSON.stringify([null, null]));

  const zeroPct = df.pctChange(0, { axis: 'rows' });
  assert.equal(JSON.stringify(zeroPct.data.a.array), JSON.stringify([0, 0]));
  assert.equal(JSON.stringify(zeroPct.data.b.array), JSON.stringify([null, null]));

  const largeShift = df.shift(5, { axis: 'rows', fillValue: null });
  assert.equal(JSON.stringify(largeShift.data.a.array), JSON.stringify([null, null]));
  assert.equal(JSON.stringify(largeShift.data.b.array), JSON.stringify([null, null]));

  const largeDiff = df.diff(5, { axis: 'rows' });
  assert.equal(JSON.stringify(largeDiff.data.a.array), JSON.stringify([null, null]));
  assert.equal(JSON.stringify(largeDiff.data.b.array), JSON.stringify([null, null]));
});
