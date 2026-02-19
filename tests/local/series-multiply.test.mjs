import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('Series.multiply uses numeric fast path for scalar and preserves results', () => {
  const context = createGasContext();
  loadCoreDataContext(context);

  const series = context.Series.fromRange(1, 5, 1, 'nums');
  const result = series.multiply(2);

  assert.deepEqual([...result.array], [2, 4, 6, 8, 10]);
  assert.equal(result.type, 'number');
});

test('Series.multiply keeps NaN-as-null semantics for numeric fast path', () => {
  const context = createGasContext();
  loadCoreDataContext(context);

  const left = new context.Series([1, Number.NaN, 3], 'left');
  const right = new context.Series([2, 2, 2], 'right');
  const result = left.multiply(right);

  assert.deepEqual([...result.array], [2, null, 6]);
});

test('Series.multiply keeps mismatch-length error contract', () => {
  const context = createGasContext();
  loadCoreDataContext(context);

  const left = new context.Series([1, 2, 3], 'left');
  const right = new context.Series([2, 3], 'right');

  assert.throws(
    () => left.multiply(right),
    /All elements in seriesArray must be Series of the same length as the base Series\./
  );
});
