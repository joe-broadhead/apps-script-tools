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

test('DataFrame.apply over rows returns Series for scalar mapper results', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 15 }
  ]);
  df.index = ['r1', 'r2'];

  const out = df.apply((row, label, pos) => row.at(0) + row.at(1) + pos, {
    axis: 'rows',
    resultName: 'row_total'
  });

  assert.ok(out instanceof context.Series);
  assert.equal(JSON.stringify(out.array), JSON.stringify([11, 18]));
  assert.equal(JSON.stringify(out.index), JSON.stringify(['r1', 'r2']));
  assert.equal(out.name, 'row_total');
});

test('DataFrame.apply over columns returns Series for scalar mapper results', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { amount: 10, score: 2 },
    { amount: 20, score: 3 }
  ]);

  const out = df.apply(column => column.sum(), { axis: 'columns' });

  assert.ok(out instanceof context.Series);
  assert.equal(JSON.stringify(out.index), JSON.stringify(['amount', 'score']));
  assert.equal(JSON.stringify(out.array), JSON.stringify([30, 5]));
});

test('DataFrame.apply over rows returns DataFrame for object mapper results', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: 5 }
  ]);
  df.index = ['a', 'b'];

  const out = df.apply(row => ({
    id: row.at(0),
    doubled: row.at(1) * 2
  }));

  assert.ok(out instanceof context.DataFrame);
  assert.equal(JSON.stringify(out.columns), JSON.stringify(['id', 'doubled']));
  assert.equal(JSON.stringify(out.index), JSON.stringify(['a', 'b']));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { id: 1, doubled: 20 },
    { id: 2, doubled: 10 }
  ]));
});

test('DataFrame.apply over columns returns DataFrame for Series mapper results', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { amount: 10, score: 1 },
    { amount: 20, score: 2 }
  ]);

  const out = df.apply(column => new context.Series([column.min(), column.max()], 'range', null, ['min', 'max']), {
    axis: 'columns'
  });

  assert.ok(out instanceof context.DataFrame);
  assert.equal(JSON.stringify(out.columns), JSON.stringify(['min', 'max']));
  assert.equal(JSON.stringify(out.index), JSON.stringify(['amount', 'score']));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { min: 10, max: 20 },
    { min: 1, max: 2 }
  ]));
});

test('DataFrame.apply supports DataFrame outputs over rows', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { amount: 5 },
    { amount: 7 }
  ]);
  df.index = ['i1', 'i2'];

  const out = df.apply(
    row => context.DataFrame.fromRecords([{ doubled: row.at(0) * 2, squared: row.at(0) * row.at(0) }]),
    { axis: 'rows' }
  );

  assert.ok(out instanceof context.DataFrame);
  assert.equal(JSON.stringify(out.index), JSON.stringify(['i1', 'i2']));
  assert.equal(JSON.stringify(out.columns), JSON.stringify(['doubled', 'squared']));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { doubled: 10, squared: 25 },
    { doubled: 14, squared: 49 }
  ]));
});

test('DataFrame.apply supports DataFrame outputs over columns with namespacing', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 2 },
    { a: 3, b: 4 }
  ]);

  const out = df.apply(
    column => context.DataFrame.fromColumns({
      original: [...column.array],
      doubled: column.multiply(2).array
    }, { index: [...column.index] }),
    { axis: 'columns' }
  );

  assert.ok(out instanceof context.DataFrame);
  assert.equal(JSON.stringify(out.columns), JSON.stringify(['a_original', 'a_doubled', 'b_original', 'b_doubled']));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { a_original: 1, a_doubled: 2, b_original: 2, b_doubled: 4 },
    { a_original: 3, a_doubled: 6, b_original: 4, b_doubled: 8 }
  ]));
});

test('DataFrame.apply rejects mixed mapper return types', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { value: 1 },
    { value: 2 }
  ]);

  assert.throws(
    () => {
      df.apply((row, _, pos) => (pos === 0 ? row.at(0) : { value: row.at(0) }));
    },
    /consistent callback return type/
  );
});

test('DataFrame.apply enforces DataFrame alignment rules for axis=columns', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { value: 1 },
    { value: 2 }
  ]);

  assert.throws(
    () => {
      df.apply(
        () => context.DataFrame.fromRecords([{ only: 1 }]),
        { axis: 'columns' }
      );
    },
    /requires callback DataFrame results to match source row count/
  );
});

test('DataFrame.applyMap is non-mutating and supports stateful closures', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { a: 1, b: 2 },
    { a: 3, b: 4 }
  ]);
  df.index = ['x', 'y'];

  let calls = 0;
  const out = df.applyMap((value, rowLabel, columnName, rowPos, columnPos) => {
    calls += 1;
    return `${rowLabel}:${columnName}:${value + rowPos + columnPos}`;
  });

  assert.equal(JSON.stringify(df.toRecords()), JSON.stringify([
    { a: 1, b: 2 },
    { a: 3, b: 4 }
  ]));
  assert.equal(calls, 4);
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { a: 'x:a:1', b: 'x:b:3' },
    { a: 'y:a:4', b: 'y:b:6' }
  ]));
  assert.equal(JSON.stringify(out.index), JSON.stringify(['x', 'y']));
});

test('DataFrame.applyMap medium fixture sanity', () => {
  const context = createContext();
  const rows = 5000;
  const records = Array.from({ length: rows }, (_, idx) => ({
    c0: idx,
    c1: idx + 1,
    c2: idx + 2,
    c3: idx + 3
  }));
  const df = context.DataFrame.fromRecords(records);

  const startedAt = Date.now();
  const out = df.applyMap(value => value + 1);
  const elapsedMs = Date.now() - startedAt;

  assert.equal(out.len(), rows);
  assert.equal(out.c0.at(0), 1);
  assert.equal(out.c3.at(rows - 1), rows + 3);
  assert.ok(elapsedMs < 6000, `Expected applyMap sanity runtime < 6000ms, got ${elapsedMs}ms`);
});
