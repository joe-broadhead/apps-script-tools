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

test('DataFrame.stack stacks selected columns with index and drops nulls by default', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: null }
  ]);
  df.index = ['r1', 'r2'];

  const stacked = df.stack();
  assert.equal(JSON.stringify(stacked.toRecords()), JSON.stringify([
    { row_index: 'r1', column: 'a', value: 1 },
    { row_index: 'r1', column: 'b', value: 10 },
    { row_index: 'r2', column: 'a', value: 2 }
  ]));
});

test('DataFrame.stack rejects dangerous output column names', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1 }
  ]);

  assert.throws(() => df.stack({ indexName: '__proto__' }), /must not be one of/);
  assert.throws(() => df.stack({ columnName: 'prototype' }), /must not be one of/);
  assert.throws(() => df.stack({ valueName: 'constructor' }), /must not be one of/);
  assert.throws(() => df.stack({ dropNulls: 'false' }), /dropNulls must be boolean/);
});

test('DataFrame.unstack round-trips stacked output with preserved index labels', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: null }
  ]);
  df.index = ['r1', 'r2'];

  const stacked = df.stack({ dropNulls: false });
  const unstacked = stacked.unstack();

  assert.equal(JSON.stringify(unstacked.index), JSON.stringify(['r1', 'r2']));
  assert.equal(JSON.stringify(unstacked.toRecords()), JSON.stringify([
    { a: 1, b: 10 },
    { a: 2, b: null }
  ]));
});

test('DataFrame.unstack backfills all stacked columns from metadata when dropNulls=true', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: null },
    { a: 2, b: null }
  ]);
  df.index = ['r1', 'r2'];

  const stacked = df.stack();
  const unstacked = stacked.unstack();

  assert.equal(JSON.stringify(unstacked.columns), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(unstacked.toRecords()), JSON.stringify([
    { a: 1, b: null },
    { a: 2, b: null }
  ]));
});

test('DataFrame.unstack preserves all-null source rows for stack default dropNulls=true', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: null, b: null },
    { a: 2, b: null }
  ]);
  df.index = ['r1', 'r2', 'r3'];

  const stacked = df.stack();
  const unstacked = stacked.unstack();

  assert.equal(JSON.stringify(unstacked.index), JSON.stringify(['r1', 'r2', 'r3']));
  assert.equal(JSON.stringify(unstacked.toRecords()), JSON.stringify([
    { a: 1, b: 10 },
    { a: null, b: null },
    { a: 2, b: null }
  ]));
});

test('DataFrame.unstack preserves schema for empty stack/unstack round-trip', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromColumns({
    a: [],
    b: []
  });
  df.index = [];

  const stacked = df.stack({ dropNulls: false });
  const unstacked = stacked.unstack();

  assert.equal(unstacked.len(), 0);
  assert.equal(JSON.stringify(unstacked.columns), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(unstacked.toRecords()), JSON.stringify([]));
});

test('DataFrame.unstack keeps index length aligned when stacked columns are empty', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);
  df.index = ['r1', 'r2'];

  const stacked = df.stack({ columns: [] });
  const unstacked = stacked.unstack();

  assert.equal(unstacked.len(), 0);
  assert.equal(unstacked.index.length, unstacked.len());
  assert.equal(JSON.stringify(unstacked.columns), JSON.stringify([]));
});

test('DataFrame.unstack preserves duplicate index labels on stack/unstack round-trip', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]);
  df.index = ['r1', 'r1'];

  const stacked = df.stack({ dropNulls: false });
  const unstacked = stacked.unstack();

  assert.equal(unstacked.len(), 2);
  assert.equal(JSON.stringify(unstacked.index), JSON.stringify(['r1', 'r1']));
  assert.equal(JSON.stringify(unstacked.toRecords()), JSON.stringify([
    { a: 1, b: 10 },
    { a: 2, b: 20 }
  ]));
});

test('DataFrame.unstack supports duplicate index/column pairs via agg option', () => {
  const context = createDataContext();
  const long = context.DataFrame.fromRecords([
    { row_index: 'row1', column: 'a', value: 1 },
    { row_index: 'row1', column: 'a', value: 2 },
    { row_index: 'row1', column: 'b', value: 9 }
  ]);

  const first = long.unstack({ agg: 'first' });
  const last = long.unstack({ agg: 'last' });

  assert.equal(first.toRecords()[0].a, 1);
  assert.equal(last.toRecords()[0].a, 2);
  assert.equal(last.toRecords()[0].b, 9);
});

test('DataFrame.unstack min/max aggregate comparable non-numeric values deterministically', () => {
  const context = createDataContext();
  const long = context.DataFrame.fromRecords([
    { row_index: 'row1', column: 'city', value: 'zurich' },
    { row_index: 'row1', column: 'city', value: 'amsterdam' },
    { row_index: 'row1', column: 'region', value: 'eu' }
  ]);

  const minOut = long.unstack({ agg: 'min' });
  const maxOut = long.unstack({ agg: 'max' });

  assert.equal(minOut.toRecords()[0].city, 'amsterdam');
  assert.equal(maxOut.toRecords()[0].city, 'zurich');
  assert.equal(maxOut.toRecords()[0].region, 'eu');
});

test('DataFrame.unstack preserves string pivot labels verbatim', () => {
  const context = createDataContext();
  const long = context.DataFrame.fromRecords([
    { row_index: 'row1', column: 'a', value: 1 },
    { row_index: 'row1', column: ' a ', value: 2 }
  ]);

  const out = long.unstack({ agg: 'first' });
  assert.equal(JSON.stringify(out.columns), JSON.stringify(['a', ' a ']));
  assert.equal(out.data.a.array[0], 1);
  assert.equal(out.data[' a '].array[0], 2);
});

test('DataFrame.unstack rejects dangerous output column names from pivot values', () => {
  const context = createDataContext();
  const long = context.DataFrame.fromRecords([
    { row_index: 'row1', column: '__proto__', value: 1 }
  ]);

  assert.throws(() => long.unstack(), /unsupported output column name/);
  assert.throws(() => long.unstack({ dropIndexColumn: 'false' }), /dropIndexColumn must be boolean/);
  assert.throws(() => long.unstack({ preserveIndex: 1 }), /preserveIndex must be boolean/);
});

test('DataFrame.unstack validates agg even for empty inputs', () => {
  const context = createDataContext();
  const long = context.DataFrame.fromColumns({
    row_index: [],
    column: [],
    value: []
  });

  assert.throws(() => long.unstack({ agg: 'bogus' }), /aggregation for 'value' must be one of/);
});

test('DataFrame.unstack preserves distinct object index labels with same serialized key', () => {
  const context = createDataContext();
  const indexA = { id: 1 };
  const indexB = { id: 1 };
  const long = context.DataFrame.fromRecords([
    { row_index: indexA, column: 'value', value: 10 },
    { row_index: indexB, column: 'value', value: 20 }
  ]);

  const out = long.unstack({ agg: 'first' });
  assert.equal(out.len(), 2);
  assert.equal(out.data.value.array[0], 10);
  assert.equal(out.data.value.array[1], 20);
  assert.equal(out.index[0], indexA);
  assert.equal(out.index[1], indexB);
});

test('DataFrame.resample buckets on datetime column with mean aggregation', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { ts: '2026-03-03T10:01:00Z', value: 10, qty: 1 },
    { ts: '2026-03-03T10:45:00Z', value: 20, qty: 2 },
    { ts: '2026-03-03T11:02:00Z', value: 40, qty: 3 }
  ]);

  const out = df.resample('1h', {
    on: 'ts',
    columns: ['value', 'qty'],
    agg: 'mean'
  });

  assert.equal(out.len(), 2);
  assert.equal(out.index[0].toISOString(), '2026-03-03T10:00:00.000Z');
  assert.equal(out.index[1].toISOString(), '2026-03-03T11:00:00.000Z');
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { value: 15, qty: 1.5 },
    { value: 40, qty: 3 }
  ]));
});

test('DataFrame.resample materializes missing buckets across the bucket range', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { ts: '2026-03-01T10:01:00Z', value: 10 },
    { ts: '2026-03-03T09:15:00Z', value: 30 }
  ]);

  const out = df.resample('1d', {
    on: 'ts',
    columns: ['value'],
    agg: 'sum',
    fillValue: 0
  });

  assert.equal(out.len(), 3);
  assert.equal(out.index[0].toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(out.index[1].toISOString(), '2026-03-02T00:00:00.000Z');
  assert.equal(out.index[2].toISOString(), '2026-03-03T00:00:00.000Z');
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { value: 10 },
    { value: 0 },
    { value: 30 }
  ]));
});

test('DataFrame.resample rejects null and boolean timestamp values', () => {
  const context = createDataContext();
  const dfNull = context.DataFrame.fromRecords([
    { ts: null, value: 10 }
  ]);
  const dfBool = context.DataFrame.fromRecords([
    { ts: false, value: 10 }
  ]);
  const dfSymbol = context.DataFrame.fromRecords([
    { ts: Symbol('ts'), value: 10 }
  ]);

  assert.throws(() => dfNull.resample('1h', { on: 'ts', columns: ['value'], agg: 'sum' }), /non-date timestamp value/);
  assert.throws(() => dfBool.resample('1h', { on: 'ts', columns: ['value'], agg: 'sum' }), /non-date timestamp value/);
  assert.throws(() => dfSymbol.resample('1h', { on: 'ts', columns: ['value'], agg: 'sum' }), /non-date timestamp value/);
  assert.throws(() => dfBool.resample('1h', { on: 'ts', columns: ['value'], agg: new Date() }), /agg object must be a plain object/);
});

test('DataFrame.resample supports per-column aggregations and right-edge labels', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { ts: '2026-03-03T00:15:00Z', value: 10, qty: 1 },
    { ts: '2026-03-03T12:00:00Z', value: 5, qty: 2 },
    { ts: '2026-03-04T09:00:00Z', value: 7, qty: null }
  ]);

  const out = df.resample('1d', {
    on: 'ts',
    columns: ['value', 'qty'],
    agg: {
      value: 'sum',
      qty: 'count'
    },
    label: 'right'
  });

  assert.equal(out.len(), 2);
  assert.equal(out.index[0].toISOString(), '2026-03-04T00:00:00.000Z');
  assert.equal(out.index[1].toISOString(), '2026-03-05T00:00:00.000Z');
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { value: 15, qty: 2 },
    { value: 7, qty: 0 }
  ]));
});

test('DataFrame.resample min/max aggregates comparable non-numeric values', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { ts: '2026-03-03T10:01:00Z', status: 'pending' },
    { ts: '2026-03-03T10:45:00Z', status: 'approved' },
    { ts: '2026-03-03T11:02:00Z', status: 'review' }
  ]);

  const minOut = df.resample('1h', {
    on: 'ts',
    columns: ['status'],
    agg: 'min'
  });
  const maxOut = df.resample('1h', {
    on: 'ts',
    columns: ['status'],
    agg: 'max'
  });

  assert.equal(JSON.stringify(minOut.toRecords()), JSON.stringify([
    { status: 'approved' },
    { status: 'review' }
  ]));
  assert.equal(JSON.stringify(maxOut.toRecords()), JSON.stringify([
    { status: 'pending' },
    { status: 'review' }
  ]));
});

test('DataFrame.resample preserves exact spaced column labels for on and agg keys', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromColumns({
    ' ts ': ['2026-03-03T10:01:00Z', '2026-03-03T10:45:00Z'],
    ts: [null, null],
    ' value ': [1, 2]
  });

  const out = df.resample('1h', {
    on: ' ts ',
    columns: [' value '],
    agg: {
      ' value ': 'sum'
    }
  });

  assert.equal(out.len(), 1);
  assert.equal(JSON.stringify(out.columns), JSON.stringify([' value ']));
  assert.equal(out.data[' value '].array[0], 3);
});

test('DataFrame.resample allows valid second-level spans beyond 200k buckets', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { ts: '2026-03-01T00:00:00Z', value: 1 },
    { ts: '2026-03-03T07:33:21Z', value: 2 }
  ]);

  const out = df.resample('1s', {
    on: 'ts',
    columns: ['value'],
    agg: 'sum',
    fillValue: 0
  });

  assert.equal(out.len(), 200002);
  assert.equal(out.index[0].toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(out.index[out.len() - 1].toISOString(), '2026-03-03T07:33:21.000Z');
  assert.equal(out.data.value.array[0], 1);
  assert.equal(out.data.value.array[out.len() - 1], 2);
  assert.equal(out.data.value.array[1], 0);
});

test('Series.expanding computes deterministic cumulative aggregations', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, null, 4], 'values');

  assert.equal(JSON.stringify(series.expanding('sum').array), JSON.stringify([1, 3, 3, 7]));
  assert.equal(JSON.stringify(series.expanding('count').array), JSON.stringify([1, 2, 2, 3]));
  assert.equal(JSON.stringify(series.expanding({ operation: 'mean', minPeriods: 2 }).array), JSON.stringify([null, 1.5, 1.5, 7 / 3]));
});

test('Series.expanding count includes non-missing non-numeric values', () => {
  const context = createDataContext();
  const series = new context.Series([1, 'ok', 'err', null, 4], 'mixed');

  assert.equal(JSON.stringify(series.expanding('count').array), JSON.stringify([1, 2, 3, 3, 4]));
});

test('Series.ewm computes exponentially weighted means with adjust=false', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, 3], 'values');

  const out = series.ewm({ alpha: 0.5, adjust: false });
  assert.equal(JSON.stringify(out.array), JSON.stringify([1, 1.5, 2.25]));
});

test('Series.ewm defaults align with pandas com=0.5 decay', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, 3], 'values');

  const out = series.ewm({ adjust: false });
  assert.equal(out.len(), 3);
  assert.ok(Math.abs(out.array[0] - 1) < 1e-12);
  assert.ok(Math.abs(out.array[1] - (5 / 3)) < 1e-12);
  assert.ok(Math.abs(out.array[2] - (23 / 9)) < 1e-12);
});

test('Series.ewm honors minPeriods and ignoreNulls behavior', () => {
  const context = createDataContext();
  const series = new context.Series([1, null, 3], 'values');

  const out = series.ewm({ alpha: 0.5, adjust: false, minPeriods: 2, ignoreNulls: true });
  assert.equal(JSON.stringify(out.array), JSON.stringify([null, null, 2]));
});

test('Series.ewm decays state across null gaps when ignoreNulls=false', () => {
  const context = createDataContext();
  const series = new context.Series([1, null, 3], 'values');

  const out = series.ewm({ alpha: 0.5, adjust: false, ignoreNulls: false });
  assert.equal(JSON.stringify(out.array), JSON.stringify([1, null, 1.75]));
});

test('Series.ewm rejects non-boolean adjust and ignoreNulls flags', () => {
  const context = createDataContext();
  const series = new context.Series([1, null, 3], 'values');

  assert.throws(() => series.ewm({ alpha: 0.5, adjust: 'false' }), /option adjust must be boolean/);
  assert.throws(() => series.ewm({ alpha: 0.5, ignoreNulls: 1 }), /option ignoreNulls must be boolean/);
});

test('Series.ewm ignores undefined decay params in exclusivity validation', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, 3], 'values');

  const out = series.ewm({ span: 10, alpha: undefined, adjust: false });
  assert.equal(out.len(), 3);
  assert.equal(out.array[0], 1);
});

test('Parity finisher methods validate invalid contracts deterministically', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([{ ts: '2026-03-03T00:00:00Z', value: 1 }]);
  const series = new context.Series([1, 2, 3], 'values');

  assert.throws(() => df.resample('bad', { on: 'ts' }), /rule/);
  assert.throws(() => series.expanding('bad-op'), /operation/);
  assert.throws(() => series.ewm({ alpha: 0.2, span: 5 }), /mutually exclusive/);
});
