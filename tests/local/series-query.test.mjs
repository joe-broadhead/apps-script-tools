import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('Series.query accepts function predicates', () => {
  const context = createGasContext();
  loadCoreDataContext(context);

  const series = new context.Series([10, 20, 30], 'numbers');
  const filtered = series.query((_s, value) => value > 15);

  assert.deepEqual(filtered.array, [20, 30]);
});

test('Series.query rejects string predicates', () => {
  const context = createGasContext();
  loadCoreDataContext(context);

  const series = new context.Series([10, 20, 30], 'numbers');

  assert.throws(() => series.query('value > 15'), /Condition must be a function/);
});
