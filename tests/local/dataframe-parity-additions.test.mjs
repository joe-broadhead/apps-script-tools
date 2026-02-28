import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadCoreDataContext } from './helpers.mjs';

function createContext() {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });
  loadCoreDataContext(context);
  return context;
}

test('DataFrame isNull/isNa/notNull/notNa produce deterministic boolean masks', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: null },
    { a: undefined, b: 'x' },
    { a: Number.NaN, b: 3 }
  ]);
  df.index = ['r1', 'r2', 'r3'];

  const isNull = df.isNull();
  const isNa = df.isNa();
  const notNull = df.notNull();
  const notNa = df.notNa();

  assert.deepEqual(JSON.parse(JSON.stringify(isNull.toRecords())), [
    { a: false, b: true },
    { a: true, b: false },
    { a: true, b: false }
  ]);
  assert.equal(JSON.stringify(isNa.toRecords()), JSON.stringify(isNull.toRecords()));

  assert.deepEqual(JSON.parse(JSON.stringify(notNull.toRecords())), [
    { a: true, b: false },
    { a: false, b: true },
    { a: false, b: true }
  ]);
  assert.equal(JSON.stringify(notNa.toRecords()), JSON.stringify(notNull.toRecords()));
  assert.equal(JSON.stringify(isNull.index), JSON.stringify(['r1', 'r2', 'r3']));
});

test('DataFrame.duplicated supports keep first/last/false with subset', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 'x' },
    { a: 1, b: 'x' },
    { a: 2, b: 'y' },
    { a: 1, b: 'x' },
    { a: 2, b: 'y' }
  ]);
  df.index = ['r1', 'r2', 'r3', 'r4', 'r5'];

  const first = df.duplicated(['a', 'b']);
  const last = df.duplicated(['a', 'b'], { keep: 'last' });
  const all = df.duplicated(['a', 'b'], { keep: false });

  assert.equal(JSON.stringify(first.array), JSON.stringify([false, true, false, true, true]));
  assert.equal(JSON.stringify(last.array), JSON.stringify([true, true, true, false, false]));
  assert.equal(JSON.stringify(all.array), JSON.stringify([true, true, true, true, true]));
  assert.equal(JSON.stringify(first.index), JSON.stringify(['r1', 'r2', 'r3', 'r4', 'r5']));

  assert.throws(() => df.duplicated(['a'], { keep: 'middle' }), /option keep must be one of/);
});

test('DataFrame.nunique supports columns and rows axis with dropna behavior', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 1, c: null },
    { a: 1, b: 2, c: 'x' },
    { a: 2, b: 2, c: Number.NaN }
  ]);
  df.index = ['r1', 'r2', 'r3'];

  const byColumns = df.nunique();
  assert.equal(JSON.stringify(byColumns.index), JSON.stringify(['a', 'b', 'c']));
  assert.equal(JSON.stringify(byColumns.array), JSON.stringify([2, 2, 1]));

  const byColumnsKeepMissing = df.nunique({ dropna: false });
  assert.equal(JSON.stringify(byColumnsKeepMissing.array), JSON.stringify([2, 2, 3]));

  const byRows = df.nunique({ axis: 'rows' });
  assert.equal(JSON.stringify(byRows.index), JSON.stringify(['r1', 'r2', 'r3']));
  assert.equal(JSON.stringify(byRows.array), JSON.stringify([1, 3, 1]));

  // pandas-compatible numeric aliases
  assert.equal(JSON.stringify(df.nunique({ axis: 0 }).array), JSON.stringify(byColumns.array));
  assert.equal(JSON.stringify(df.nunique({ axis: 1 }).array), JSON.stringify(byRows.array));
});

test('DataFrame.valueCounts returns sorted combination counts and supports normalize', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 'x' },
    { a: 1, b: 'x' },
    { a: 2, b: 'y' },
    { a: null, b: 'x' },
    { a: 2, b: 'y' }
  ]);

  const counts = df.valueCounts({ subset: ['a', 'b'] });
  assert.deepEqual(JSON.parse(JSON.stringify(counts.toRecords())), [
    { a: 1, b: 'x', count: 2 },
    { a: 2, b: 'y', count: 2 }
  ]);

  const normalized = df.valueCounts({ subset: ['a', 'b'], normalize: true });
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.toRecords())), [
    { a: 1, b: 'x', count: 0.5 },
    { a: 2, b: 'y', count: 0.5 }
  ]);

  assert.throws(() => df.valueCounts({ subset: ['a'], countColumn: 'a' }), /must not collide/);
});

test('DataFrame.agg supports strings/functions and returns Series/DataFrame deterministically', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 },
    { a: 3, b: 30 }
  ]);

  const single = df.agg('sum');
  assert.equal(JSON.stringify(single.index), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(single.array), JSON.stringify([6, 60]));

  const multi = df.agg(['sum', 'mean']);
  assert.equal(JSON.stringify(multi.index), JSON.stringify(['sum', 'mean']));
  assert.deepEqual(JSON.parse(JSON.stringify(multi.toRecords())), [
    { a: 6, b: 60 },
    { a: 2, b: 20 }
  ]);

  const mapped = df.agg({
    a: ['sum'],
    b: [series => series.max()]
  });
  assert.equal(JSON.stringify(mapped.index), JSON.stringify(['sum', 'custom_1']));
  assert.deepEqual(JSON.parse(JSON.stringify(mapped.toRecords())), [
    { a: 6, b: null },
    { a: null, b: 30 }
  ]);

  assert.throws(() => df.agg({ a: ['sum', 'sum'] }), /duplicate aggregation label/);
});

test('DataFrame.agg handles __proto__-labeled custom aggregations without row corruption', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);

  function __proto__(series) {
    return series.sum();
  }

  const out = df.agg({
    a: [__proto__],
    b: [__proto__]
  });

  assert.ok(out instanceof context.Series);
  assert.equal(out.name, 'proto');
  assert.equal(JSON.stringify(out.index), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(out.array), JSON.stringify([3, 30]));
});

test('DataFrame.transform preserves row shape and supports function/object transformers', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);
  df.index = ['x', 'y'];

  const fnTransformed = df.transform(series => series.multiply(2), { columns: ['a'] });
  assert.deepEqual(JSON.parse(JSON.stringify(fnTransformed.toRecords())), [
    { a: 2, b: 10 },
    { a: 4, b: 20 }
  ]);
  assert.equal(JSON.stringify(fnTransformed.index), JSON.stringify(['x', 'y']));

  const mapTransformed = df.transform({
    a: [100, 200],
    b: series => series.add(1)
  });
  assert.deepEqual(JSON.parse(JSON.stringify(mapTransformed.toRecords())), [
    { a: 100, b: 11 },
    { a: 200, b: 21 }
  ]);

  assert.throws(() => df.transform({ a: [1] }), /must have length 2/);
  assert.throws(() => df.transform({ unknown: 1 }), /unknown columns/);
});

test('DataFrame.valueCounts rejects dangerous countColumn prototype keys', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1 },
    { a: 1 },
    { a: 2 }
  ]);

  assert.throws(
    () => df.valueCounts({ subset: ['a'], countColumn: '__proto__' }),
    /must not be one of/
  );
});
