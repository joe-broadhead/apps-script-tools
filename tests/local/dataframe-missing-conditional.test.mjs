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

test('Series dropNulls/fillNulls treat null, undefined, and NaN as missing', () => {
  const context = createDataContext();
  const series = new context.Series([1, null, undefined, Number.NaN, 5], 'values', null, ['a', 'b', 'c', 'd', 'e']);

  const dropped = series.dropNulls();
  assert.equal(JSON.stringify(dropped.array), JSON.stringify([1, 5]));
  assert.equal(JSON.stringify(dropped.index), JSON.stringify(['a', 'e']));

  const filled = series.fillNulls(0);
  assert.equal(filled.array[0], 1);
  assert.equal(filled.array[1], 0);
  assert.equal(filled.array[2], 0);
  assert.equal(filled.array[3], 0);
  assert.equal(filled.array[4], 5);
  assert.equal(JSON.stringify(filled.index), JSON.stringify(['a', 'b', 'c', 'd', 'e']));
});

test('Series where/mask validate shape and boolean mask values', () => {
  const context = createDataContext();
  const series = new context.Series([10, 20, 30], 'numbers', null, ['x', 'y', 'z']);

  const whereArray = series.where([true, false, true], 99);
  assert.equal(JSON.stringify(whereArray.array), JSON.stringify([10, 99, 30]));
  assert.equal(JSON.stringify(whereArray.index), JSON.stringify(['x', 'y', 'z']));

  const masked = series.mask((_s, value) => value >= 20, 0);
  assert.equal(JSON.stringify(masked.array), JSON.stringify([10, 0, 0]));

  assert.throws(() => series.where([true], 0), /length must match Series length/);
  assert.throws(() => series.where([true, 1, false], 0), /condition values must be boolean/);
  assert.throws(() => series.mask(() => 'yes', 0), /must return boolean/);
});

test('Series replace supports scalar/list targets and map modes', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, 2, Number.NaN, null, 'x'], 'mixed');

  const scalar = series.replace(2, 9);
  assert.equal(JSON.stringify(scalar.array), JSON.stringify([1, 9, 9, null, null, 'x']));
  assert.equal(Number.isNaN(scalar.array[3]), true);

  const listReplace = series.replace([1, 'x'], 0);
  assert.equal(JSON.stringify(listReplace.array), JSON.stringify([0, 2, 2, null, null, 0]));
  assert.equal(Number.isNaN(listReplace.array[3]), true);

  const objectMap = series.replace({ null: 'nil', NaN: 'nan' });
  assert.equal(JSON.stringify(objectMap.array), JSON.stringify([1, 2, 2, 'nan', 'nil', 'x']));

  const objectMapWithUndefinedValue = series.replace({ x: 'X' }, undefined, {});
  assert.equal(JSON.stringify(objectMapWithUndefinedValue.array), JSON.stringify([1, 2, 2, null, null, 'X']));
  assert.equal(Number.isNaN(objectMapWithUndefinedValue.array[3]), true);

  const mapMode = series.replace(new Map([[2, 'two'], [Number.NaN, 'nan'], [null, 'nil']]));
  assert.equal(JSON.stringify(mapMode.array), JSON.stringify([1, 'two', 'two', 'nan', 'nil', 'x']));
});

test('DataFrame dropNulls supports axis/how/thresh/subset with deterministic missing semantics', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10, c: null, d: null },
    { a: null, b: 20, c: 30, d: undefined },
    { a: 3, b: undefined, c: 40, d: Number.NaN },
    { a: 4, b: 50, c: 60, d: null },
    { a: Number.NaN, b: 70, c: 80, d: undefined }
  ]);
  df.index = ['r1', 'r2', 'r3', 'r4', 'r5'];

  const dropRowsAny = df.dropNulls();
  assert.equal(JSON.stringify(dropRowsAny.index), JSON.stringify([]));
  assert.equal(JSON.stringify(dropRowsAny.toRecords()), JSON.stringify([]));

  const dropRowsAll = df.dropNulls({ how: 'all' });
  assert.equal(JSON.stringify(dropRowsAll.index), JSON.stringify(['r1', 'r2', 'r3', 'r4', 'r5']));

  const dropRowsSubset = df.dropNulls({ subset: ['a', 'b'] });
  assert.equal(JSON.stringify(dropRowsSubset.index), JSON.stringify(['r1', 'r4']));

  const dropRowsThresh = df.dropNulls({ thresh: 3 });
  assert.equal(JSON.stringify(dropRowsThresh.index), JSON.stringify(['r4']));

  const dropColsAny = df.dropNulls({ axis: 'columns', how: 'any' });
  assert.equal(JSON.stringify(dropColsAny.columns), JSON.stringify([]));
  assert.equal(JSON.stringify(dropColsAny.index), JSON.stringify(['r1', 'r2', 'r3', 'r4', 'r5']));

  const dropColsAll = df.dropNulls({ axis: 'columns', how: 'all' });
  assert.equal(JSON.stringify(dropColsAll.columns), JSON.stringify(['a', 'b', 'c']));

  assert.throws(() => df.dropNulls({ axis: 'columns', subset: ['a'] }), /subset is only supported when axis='rows'/);
  assert.throws(() => df.dropNulls({ thresh: -1 }), /thresh must be a non-negative integer/);
});

test('DataFrame fillNulls supports scalar and per-column fills', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: null, c: Number.NaN },
    { a: undefined, b: 2, c: 3 }
  ]);

  const scalarFilled = df.fillNulls(0);
  assert.equal(JSON.stringify(scalarFilled.toRecords()), JSON.stringify([
    { a: 1, b: 0, c: 0 },
    { a: 0, b: 2, c: 3 }
  ]));

  const mapFilled = df.fillNulls({ a: 10, c: -1 });
  assert.equal(JSON.stringify(mapFilled.toRecords()), JSON.stringify([
    { a: 1, b: null, c: -1 },
    { a: 10, b: 2, c: 3 }
  ]));

  const scopedFill = df.fillNulls(5, { columns: ['a'] });
  assert.equal(JSON.stringify(scopedFill.toRecords()), JSON.stringify([
    { a: 1, b: null, c: Number.NaN },
    { a: 5, b: 2, c: 3 }
  ]));
  assert.equal(Number.isNaN(scopedFill.data.c.array[0]), true);

  assert.throws(() => df.fillNulls({ unknown: 1 }), /unknown columns/);
  assert.throws(() => df.fillNulls(0, { columns: ['missing'] }), /contains unknown columns/);
});

test('DataFrame replace supports scalar/list, global map, and column map', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 'x' },
    { a: 2, b: 'y' },
    { a: 2, b: 'x' },
    { a: null, b: 'z' },
    { a: Number.NaN, b: 'x' }
  ]);

  const scalar = df.replace(2, 20);
  assert.equal(JSON.stringify(scalar.toRecords()), JSON.stringify([
    { a: 1, b: 'x' },
    { a: 20, b: 'y' },
    { a: 20, b: 'x' },
    { a: null, b: 'z' },
    { a: Number.NaN, b: 'x' }
  ]));
  assert.equal(Number.isNaN(scalar.data.a.array[4]), true);

  const listReplace = df.replace([1, 'z'], 'k');
  assert.equal(JSON.stringify(listReplace.toRecords()), JSON.stringify([
    { a: 'k', b: 'x' },
    { a: 2, b: 'y' },
    { a: 2, b: 'x' },
    { a: null, b: 'k' },
    { a: Number.NaN, b: 'x' }
  ]));
  assert.equal(Number.isNaN(listReplace.data.a.array[4]), true);

  const objectMap = df.replace({ null: 'nil', NaN: 'nan', x: 'X' });
  assert.equal(JSON.stringify(objectMap.toRecords()), JSON.stringify([
    { a: 1, b: 'X' },
    { a: 2, b: 'y' },
    { a: 2, b: 'X' },
    { a: 'nil', b: 'z' },
    { a: 'nan', b: 'X' }
  ]));

  const scopedObjectMap = df.replace({ x: 'X' }, undefined, { columns: ['b'] });
  assert.equal(JSON.stringify(scopedObjectMap.toRecords()), JSON.stringify([
    { a: 1, b: 'X' },
    { a: 2, b: 'y' },
    { a: 2, b: 'X' },
    { a: null, b: 'z' },
    { a: Number.NaN, b: 'X' }
  ]));

  const columnMap = df.replace({
    a: { null: 0, NaN: 0 },
    b: { x: 'XX' }
  });
  assert.equal(JSON.stringify(columnMap.toRecords()), JSON.stringify([
    { a: 1, b: 'XX' },
    { a: 2, b: 'y' },
    { a: 2, b: 'XX' },
    { a: 0, b: 'z' },
    { a: 0, b: 'XX' }
  ]));

  const scoped = df.replace('x', 'X', { columns: ['b'] });
  assert.equal(JSON.stringify(scoped.toRecords()), JSON.stringify([
    { a: 1, b: 'X' },
    { a: 2, b: 'y' },
    { a: 2, b: 'X' },
    { a: null, b: 'z' },
    { a: Number.NaN, b: 'X' }
  ]));
});

test('DataFrame where/mask apply row and cell conditions with strict validation', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 },
    { a: 3, b: 30 }
  ]);

  const rowWhere = df.where([true, false, true], 0);
  assert.equal(JSON.stringify(rowWhere.toRecords()), JSON.stringify([
    { a: 1, b: 10 },
    { a: 0, b: 0 },
    { a: 3, b: 30 }
  ]));

  const rowMask = df.mask((row) => row.a >= 2, { a: -1 });
  assert.equal(JSON.stringify(rowMask.toRecords()), JSON.stringify([
    { a: 1, b: 10 },
    { a: -1, b: 20 },
    { a: -1, b: 30 }
  ]));

  const conditionFrame = context.DataFrame.fromRecords([
    { a: true, b: false },
    { a: false, b: true },
    { a: true, b: true }
  ]);
  const cellWhere = df.where(conditionFrame, -1);
  assert.equal(JSON.stringify(cellWhere.toRecords()), JSON.stringify([
    { a: 1, b: -1 },
    { a: -1, b: 20 },
    { a: 3, b: 30 }
  ]));

  assert.throws(() => df.where([true, false], 0), /condition length must match DataFrame length/);
  assert.throws(() => df.where([true, 1, false], 0), /mask values must be boolean/);
  assert.throws(() => df.where(() => 'true', 0), /must return boolean/);
  assert.throws(() => df.where(context.DataFrame.fromRecords([{ a: true }, { a: true }, { a: true }]), 0), /missing columns/);
  assert.throws(() => df.where([true, false, true], [0, 0]), /other row array length must match DataFrame length/);
});
