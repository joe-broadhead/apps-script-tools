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

test('DataFrame.quantile defaults to numeric columns and supports multiple quantiles', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10, c: 'x' },
    { a: 2, b: 20, c: 'y' },
    { a: 3, b: 30, c: 'z' }
  ]);

  const single = df.quantile(0.5);
  assert.equal(JSON.stringify(single.index), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(single.array), JSON.stringify([2, 20]));

  const multi = df.quantile([0, 0.5, 1]);
  assert.equal(JSON.stringify(multi.columns), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(multi.index), JSON.stringify([0, 0.5, 1]));
  assert.deepEqual(JSON.parse(JSON.stringify(multi.toRecords())), [
    { a: 1, b: 10 },
    { a: 2, b: 20 },
    { a: 3, b: 30 }
  ]);
});

test('DataFrame.describe returns deterministic numeric summary rows', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 10, c: 'x' },
    { a: 2, b: null, c: 'y' },
    { a: 3, b: 30, c: 'z' }
  ]);

  const described = df.describe({ percentiles: [0.5] });
  assert.equal(JSON.stringify(described.index), JSON.stringify(['count', 'mean', 'std', 'min', '50%', 'max']));
  assert.equal(JSON.stringify(described.columns), JSON.stringify(['a', 'b']));

  const rows = JSON.parse(JSON.stringify(described.toRecords()));
  assert.equal(rows[0].a, 3);
  assert.equal(rows[0].b, 2);
  assert.equal(rows[1].a, 2);
  assert.equal(rows[1].b, 20);
  assert.equal(rows[3].a, 1);
  assert.equal(rows[3].b, 10);
  assert.equal(rows[4].a, 2);
  assert.equal(rows[4].b, 20);
  assert.equal(rows[5].a, 3);
  assert.equal(rows[5].b, 30);
});

test('DataFrame.nlargest and nsmallest are deterministic and tie-stable', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { id: 'a', score: 10, weight: 1 },
    { id: 'b', score: 10, weight: 1 },
    { id: 'c', score: 9, weight: 5 },
    { id: 'd', score: null, weight: 100 },
    { id: 'e', score: 'oops', weight: 2 }
  ]);

  const largest = df.nlargest(3, ['score', 'weight']);
  assert.deepEqual(JSON.parse(JSON.stringify(largest.toRecords())), [
    { id: 'a', score: 10, weight: 1 },
    { id: 'b', score: 10, weight: 1 },
    { id: 'c', score: 9, weight: 5 }
  ]);

  const smallest = df.nsmallest(2, ['score', 'weight']);
  assert.deepEqual(JSON.parse(JSON.stringify(smallest.toRecords())), [
    { id: 'c', score: 9, weight: 5 },
    { id: 'a', score: 10, weight: 1 }
  ]);
});

test('DataFrame statistical selectors validate inputs strictly', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([{ score: 1 }]);

  assert.throws(
    () => df.quantile(1.5),
    /between 0 and 1/
  );

  assert.throws(
    () => df.describe({ percentiles: ['0.5'] }),
    /finite numbers between 0 and 1/
  );

  assert.throws(
    () => df.nlargest(-1, 'score'),
    /non-negative integer/
  );

  assert.throws(
    () => df.nsmallest(1, []),
    /requires at least one column/
  );
});

test('DataFrame quantile/describe return empty DataFrame when no numeric columns are eligible', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { label: 'a' },
    { label: 'b' }
  ]);

  const q = df.quantile([0.25, 0.5, 0.75]);
  const d = df.describe();

  assert.equal(JSON.stringify(q.columns), JSON.stringify([]));
  assert.equal(JSON.stringify(q.toRecords()), JSON.stringify([]));

  assert.equal(JSON.stringify(d.columns), JSON.stringify([]));
  assert.equal(JSON.stringify(d.toRecords()), JSON.stringify([]));
});
