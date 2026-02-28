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

test('Series head/tail/take are non-mutating and preserve index values', () => {
  const context = createDataContext();
  const series = new context.Series([10, 20, 30, 40], 'numbers', null, ['a', 'b', 'c', 'd']);

  const head = series.head(2);
  const tail = series.tail(2);
  const taken = series.take([3, 1, 1]);

  assert.equal(JSON.stringify(head.array), JSON.stringify([10, 20]));
  assert.equal(JSON.stringify(head.index), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(tail.array), JSON.stringify([30, 40]));
  assert.equal(JSON.stringify(tail.index), JSON.stringify(['c', 'd']));
  assert.equal(JSON.stringify(taken.array), JSON.stringify([40, 20, 20]));
  assert.equal(JSON.stringify(taken.index), JSON.stringify(['d', 'b', 'b']));

  assert.equal(JSON.stringify(series.array), JSON.stringify([10, 20, 30, 40]));
  assert.equal(JSON.stringify(series.index), JSON.stringify(['a', 'b', 'c', 'd']));

  assert.throws(() => series.take([-1]), /out of bounds/);
  assert.throws(() => series.take([4]), /out of bounds/);
});

test('Series.sample validates options and is deterministic with randomState', () => {
  const context = createDataContext();
  const series = new context.Series([1, 2, 3, 4, 5], 'numbers');

  const sampledA = series.sample({ n: 3, randomState: 42 });
  const sampledB = series.sample({ n: 3, randomState: 42 });

  assert.equal(JSON.stringify(sampledA.array), JSON.stringify(sampledB.array));
  assert.equal(JSON.stringify(sampledA.index), JSON.stringify(sampledB.index));

  const weightedA = series.sample({ n: 3, randomState: 99, weights: [1, 2, 3, 4, 5] });
  const weightedB = series.sample({ n: 3, randomState: 99, weights: [1, 2, 3, 4, 5] });
  assert.equal(JSON.stringify(weightedA.array), JSON.stringify(weightedB.array));

  assert.throws(() => series.sample({ n: 2, frac: 0.4 }), /cannot include both n and frac/);
  assert.throws(() => series.sample({ n: 6 }), /greater than Series length/);
  assert.throws(() => series.sample({ frac: 1.1 }), /frac cannot be greater than 1/);
  assert.throws(() => series.sample({ n: 2, replace: 'true' }), /replace must be boolean/);
  assert.throws(() => series.sample({ n: 2, weights: [1, 2] }), /weights length must match/);
  assert.throws(() => series.sample({ n: 2, weights: [1, -1, 1, 1, 1] }), /finite non-negative/);
});

test('DataFrame head/tail/take preserve index and support duplicate positional rows', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { id: 1, value: 'a' },
    { id: 2, value: 'b' },
    { id: 3, value: 'c' },
    { id: 4, value: 'd' }
  ]);
  df.index = ['r1', 'r2', 'r3', 'r4'];

  const head = df.head(2);
  const tail = df.tail(2);
  const taken = df.take([2, 0, 2]);

  assert.equal(JSON.stringify(head.index), JSON.stringify(['r1', 'r2']));
  assert.equal(JSON.stringify(tail.index), JSON.stringify(['r3', 'r4']));
  assert.equal(JSON.stringify(taken.index), JSON.stringify(['r3', 'r1', 'r3']));

  assert.equal(head.at(0).id, 1);
  assert.equal(tail.at(1).id, 4);
  assert.equal(taken.at(0).id, 3);
  assert.equal(taken.at(1).id, 1);
  assert.equal(taken.at(2).id, 3);

  assert.equal(JSON.stringify(df.index), JSON.stringify(['r1', 'r2', 'r3', 'r4']));

  assert.throws(() => df.take([-1]), /out of bounds/);
  assert.throws(() => df.take([8]), /out of bounds/);
  assert.throws(() => df.take([0], { preserveIndex: 'yes' }), /preserveIndex must be boolean/);
});

test('DataFrame.sample validates options and is deterministic with randomState', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { id: 1, score: 1, w: 1 },
    { id: 2, score: 2, w: 2 },
    { id: 3, score: 3, w: 3 },
    { id: 4, score: 4, w: 4 },
    { id: 5, score: 5, w: 5 }
  ]);

  const sampledA = df.sample({ n: 3, randomState: 'seed-a' });
  const sampledB = df.sample({ n: 3, randomState: 'seed-a' });
  assert.equal(JSON.stringify(sampledA.toRecords()), JSON.stringify(sampledB.toRecords()));
  assert.equal(JSON.stringify(sampledA.index), JSON.stringify(sampledB.index));

  const weightedA = df.sample({ n: 3, randomState: 27, weights: 'w' });
  const weightedB = df.sample({ n: 3, randomState: 27, weights: 'w' });
  assert.equal(JSON.stringify(weightedA.toRecords()), JSON.stringify(weightedB.toRecords()));

  assert.throws(() => df.sample({ n: 2, frac: 0.5 }), /cannot include both n and frac/);
  assert.throws(() => df.sample({ n: 7 }), /greater than DataFrame length/);
  assert.throws(() => df.sample({ frac: 1.2 }), /frac cannot be greater than 1/);
  assert.throws(() => df.sample({ n: 2, replace: 'true' }), /replace must be boolean/);
  assert.throws(() => df.sample({ n: 2, weights: [1, 2] }), /weights length must match/);
  assert.throws(() => df.sample({ n: 2, weights: 'missing_col' }), /weights column/);
  assert.throws(() => df.sample({ n: 2, weights: [1, -2, 1, 1, 1] }), /finite non-negative/);
});

test('DataFrame.copy supports deep and shallow semantics', () => {
  const context = createDataContext();
  const df = context.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 20 }
  ]);

  const deepCopy = df.copy();
  deepCopy.data.amount.array[0] = 999;
  assert.equal(df.data.amount.array[0], 10);

  const shallowCopy = df.copy({ deep: false });
  shallowCopy.data.amount.array[0] = 777;
  assert.equal(df.data.amount.array[0], 777);

  assert.notEqual(shallowCopy, df);
  assert.notEqual(shallowCopy.data, df.data);
  assert.equal(shallowCopy.data.amount, df.data.amount);

  shallowCopy.index[0] = 'changed';
  assert.equal(df.index[0], 0);

  assert.throws(() => df.copy({ deep: 'false' }), /deep must be boolean/);
});
