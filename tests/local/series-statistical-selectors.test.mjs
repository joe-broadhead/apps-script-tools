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

test('Series.quantile supports scalar and array quantiles with deterministic interpolation', () => {
  const context = createContext();
  const series = new context.Series([1, 2, 3, 4], 'values');

  assert.equal(series.quantile(0), 1);
  assert.equal(series.quantile(1), 4);
  assert.equal(series.quantile(0.5), 2.5);
  assert.equal(series.quantile(0.5, { interpolation: 'lower' }), 2);
  assert.equal(series.quantile(0.5, { interpolation: 'higher' }), 3);
  assert.equal(series.quantile(0.5, { interpolation: 'midpoint' }), 2.5);

  const multi = series.quantile([0, 0.5, 1]);
  assert.equal(JSON.stringify(multi.array), JSON.stringify([1, 2.5, 4]));
  assert.equal(JSON.stringify(multi.index), JSON.stringify([0, 0.5, 1]));
});

test('Series.quantile handles non-numeric data with ignore/error policies', () => {
  const context = createContext();
  const series = new context.Series([1, '2', 'oops', null], 'mixed');

  assert.equal(series.quantile(0.5), 1.5);
  assert.throws(
    () => series.quantile(0.5, { nonNumeric: 'error' }),
    /non-numeric value/
  );
});

test('Series.idxMax and idxMin return first matching index label', () => {
  const context = createContext();
  const series = new context.Series([3, 5, 5, 1], 'values', null, ['a', 'b', 'c', 'd']);

  assert.equal(series.idxMax(), 'b');
  assert.equal(series.idxMin(), 'd');
});

test('Series cumulative selectors preserve length/index and do not mutate input', () => {
  const context = createContext();
  const series = new context.Series([2, '4', null, 3, 'bad'], 'values', null, ['r1', 'r2', 'r3', 'r4', 'r5']);
  const original = [...series.array];

  const cummax = series.cummax();
  const cummin = series.cummin();
  const cumproduct = series.cumproduct();

  assert.equal(JSON.stringify(cummax.array), JSON.stringify([2, 4, 4, 4, 4]));
  assert.equal(JSON.stringify(cummin.array), JSON.stringify([2, 2, 2, 2, 2]));
  assert.equal(JSON.stringify(cumproduct.array), JSON.stringify([2, 8, 8, 24, 24]));

  assert.equal(JSON.stringify(cummax.index), JSON.stringify(['r1', 'r2', 'r3', 'r4', 'r5']));
  assert.equal(JSON.stringify(series.array), JSON.stringify(original));
});
