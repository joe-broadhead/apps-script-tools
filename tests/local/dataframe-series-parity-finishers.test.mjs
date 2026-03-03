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

test('Series.expanding computes deterministic cumulative aggregations', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, null, 4], 'values');

  assert.equal(JSON.stringify(series.expanding('sum').array), JSON.stringify([1, 3, 3, 7]));
  assert.equal(JSON.stringify(series.expanding('count').array), JSON.stringify([1, 2, 2, 3]));
  assert.equal(JSON.stringify(series.expanding({ operation: 'mean', minPeriods: 2 }).array), JSON.stringify([null, 1.5, 1.5, 7 / 3]));
});

test('Series.ewm computes exponentially weighted means with adjust=false', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, 3], 'values');

  const out = series.ewm({ alpha: 0.5, adjust: false });
  assert.equal(JSON.stringify(out.array), JSON.stringify([1, 1.5, 2.25]));
});

test('Series.ewm honors minPeriods and ignoreNulls behavior', () => {
  const context = createDataContext();
  const series = new context.Series([1, null, 3], 'values');

  const out = series.ewm({ alpha: 0.5, adjust: false, minPeriods: 2, ignoreNulls: true });
  assert.equal(JSON.stringify(out.array), JSON.stringify([null, null, 2]));
});

test('Parity finisher methods validate invalid contracts deterministically', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([{ ts: '2026-03-03T00:00:00Z', value: 1 }]);
  const series = new context.Series([1, 2, 3], 'values');

  assert.throws(() => df.resample('bad', { on: 'ts' }), /rule/);
  assert.throws(() => series.expanding('bad-op'), /operation/);
  assert.throws(() => series.ewm({ alpha: 0.2, span: 5 }), /mutually exclusive/);
});
