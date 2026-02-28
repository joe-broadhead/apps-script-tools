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

test('Series.agg supports named reducers and custom callbacks', () => {
  const context = createContext();
  const series = new context.Series([1, 2, 3], 'values');

  assert.equal(series.agg('sum'), 6);

  const multi = series.agg(['sum', 'mean', s => s.max()]);
  assert.equal(JSON.stringify(multi.index), JSON.stringify(['sum', 'mean', 'custom_3']));
  assert.equal(JSON.stringify(multi.array), JSON.stringify([6, 2, 3]));

  assert.throws(() => series.agg(['sum', 'sum']), /duplicate aggregation label/);
  assert.throws(() => series.agg('does_not_exist'), /unknown aggregation method/);
});

test('Series.interpolate supports linear, nearest, ffill/pad, and bfill with limit', () => {
  const context = createContext();
  const base = new context.Series([1, null, null, 4, null, 10], 'values', null, ['a', 'b', 'c', 'd', 'e', 'f']);

  const linear = base.interpolate();
  assert.equal(JSON.stringify(linear.array), JSON.stringify([1, 2, 3, 4, 7, 10]));

  const nearest = base.interpolate({ method: 'nearest' });
  assert.equal(JSON.stringify(nearest.array), JSON.stringify([1, 1, 4, 4, 4, 10]));

  const ffill = base.interpolate({ method: 'ffill' });
  assert.equal(JSON.stringify(ffill.array), JSON.stringify([1, 1, 1, 4, 4, 10]));

  const pad = base.interpolate({ method: 'pad' });
  assert.equal(JSON.stringify(pad.array), JSON.stringify([1, 1, 1, 4, 4, 10]));

  const bfill = base.interpolate({ method: 'bfill' });
  assert.equal(JSON.stringify(bfill.array), JSON.stringify([1, 4, 4, 4, 10, 10]));

  const limited = base.interpolate({ method: 'linear', limit: 1 });
  assert.equal(JSON.stringify(limited.array), JSON.stringify([1, 2, null, 4, 7, 10]));

  assert.equal(JSON.stringify(base.array), JSON.stringify([1, null, null, 4, null, 10]));
  assert.equal(JSON.stringify(base.index), JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f']));

  assert.throws(() => base.interpolate({ method: 'spline' }), /option method must be one of/);
  assert.throws(() => base.interpolate({ limit: 0 }), /option limit must be a positive integer/);
});

test('Series.toFrame builds a one-column DataFrame with index preserved', () => {
  const context = createContext();
  const series = new context.Series([10, 20], 'sales', null, ['x', 'y']);

  const frame = series.toFrame();
  assert.equal(JSON.stringify(frame.columns), JSON.stringify(['sales']));
  assert.equal(JSON.stringify(frame.index), JSON.stringify(['x', 'y']));
  assert.deepEqual(JSON.parse(JSON.stringify(frame.toRecords())), [
    { sales: 10 },
    { sales: 20 }
  ]);

  const renamed = series.toFrame({ name: 'Revenue Value' });
  assert.equal(JSON.stringify(renamed.columns), JSON.stringify(['revenue_value']));

  assert.throws(() => series.toFrame({ name: '' }), /non-empty string/);
});
