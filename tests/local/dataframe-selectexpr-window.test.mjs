import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

function createContext() {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);
  return context;
}

test('DataFrame.selectExpr supports passthrough + row + columnar projections', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1, amount: 10, score: 82 },
    { id: 2, amount: 20, score: 61 }
  ]);
  df.index = ['row_a', 'row_b'];

  const projected = df.selectExpr({
    id: 'id',
    amount_doubled: row => row.amount * 2,
    score_bucket: (columns, rowIdx) => columns.score.array[rowIdx] >= 80 ? 'high' : 'standard'
  });

  assert.equal(JSON.stringify(projected.columns), JSON.stringify(['id', 'amount_doubled', 'score_bucket']));
  assert.equal(JSON.stringify(projected.id.array), JSON.stringify([1, 2]));
  assert.equal(JSON.stringify(projected.amount_doubled.array), JSON.stringify([20, 40]));
  assert.equal(JSON.stringify(projected.score_bucket.array), JSON.stringify(['high', 'standard']));
  assert.equal(JSON.stringify(projected.index), JSON.stringify(['row_a', 'row_b']));
});

test('DataFrame.selectExpr strict=false null-fills unknown passthrough columns', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1 },
    { id: 2 }
  ]);

  const projected = df.selectExpr(
    {
      id: 'id',
      missing_column: 'not_present'
    },
    { strict: false }
  );

  assert.equal(JSON.stringify(projected.missing_column.array), JSON.stringify([null, null]));
});

test('DataFrame.selectExpr strict=true rejects unknown passthrough columns', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([{ id: 1 }]);

  assert.throws(
    () => df.selectExpr({ missing: 'not_present' }),
    /unknown source column/
  );
});

test('DataFrame.selectExpr onError=null null-fills expression failures', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1, amount: 10 },
    { id: 2, amount: null }
  ]);

  const projected = df.selectExpr(
    {
      safe_div: row => {
        if (row.amount == null) {
          throw new Error('missing amount');
        }
        return 100 / row.amount;
      }
    },
    { onError: 'null' }
  );

  assert.equal(JSON.stringify(projected.safe_div.array), JSON.stringify([10, null]));
});

test('DataFrame.selectExpr rejects async expression results', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([{ id: 1 }]);

  assert.throws(
    () => df.selectExpr({ next: () => Promise.resolve(1) }),
    /does not support async expressions/
  );
});

test('DataFrame.window supports rowNumber, lag/lead, and running metrics by partition order', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { account: 'a', ts: 2, amount: 20 },
    { account: 'a', ts: 1, amount: 10 },
    { account: 'b', ts: 1, amount: 5 },
    { account: 'b', ts: 3, amount: 15 },
    { account: 'b', ts: 2, amount: null }
  ]);

  const windowed = df.window({
    partitionBy: ['account'],
    orderBy: [{ column: 'ts', ascending: true }]
  });

  const rowNumber = windowed.rowNumber();
  const lag = windowed.col('amount').lag(1);
  const lead = windowed.col('amount').lead(1);
  const runningSum = windowed.col('amount').running('sum');
  const runningMean = windowed.col('amount').running('mean');
  const runningCount = windowed.col('amount').running('count');

  assert.equal(JSON.stringify(rowNumber), JSON.stringify([2, 1, 1, 3, 2]));
  assert.equal(JSON.stringify(lag), JSON.stringify([10, null, null, null, 5]));
  assert.equal(JSON.stringify(lead), JSON.stringify([null, 20, null, null, 15]));
  assert.equal(JSON.stringify(runningSum), JSON.stringify([30, 10, 5, 20, 5]));
  assert.equal(JSON.stringify(runningMean), JSON.stringify([15, 10, 5, 10, 5]));
  assert.equal(JSON.stringify(runningCount), JSON.stringify([2, 1, 1, 2, 1]));
});

test('DataFrame.window.assign appends computed window columns and preserves index', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { region: 'east', amount: 10 },
    { region: 'east', amount: 15 },
    { region: 'west', amount: 5 }
  ]);
  df.index = ['a', 'b', 'c'];

  const result = df
    .window({
      partitionBy: ['region'],
      orderBy: [{ column: 'amount', ascending: true }]
    })
    .assign({
      row_number: windowCtx => windowCtx.rowNumber(),
      amount_lag: windowCtx => windowCtx.col('amount').lag(1),
      amount_running_sum: windowCtx => windowCtx.col('amount').running('sum')
    });

  assert.equal(JSON.stringify(result.columns), JSON.stringify(['region', 'amount', 'row_number', 'amount_lag', 'amount_running_sum']));
  assert.equal(JSON.stringify(result.row_number.array), JSON.stringify([1, 2, 1]));
  assert.equal(JSON.stringify(result.amount_lag.array), JSON.stringify([null, 10, null]));
  assert.equal(JSON.stringify(result.amount_running_sum.array), JSON.stringify([10, 25, 5]));
  assert.equal(JSON.stringify(result.index), JSON.stringify(['a', 'b', 'c']));
});

test('DataFrame.window supports null ordering controls', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1, value: null },
    { id: 2, value: 10 },
    { id: 3, value: 5 }
  ]);

  const nullsFirst = df.window({
    orderBy: [{ column: 'value', nulls: 'first' }]
  }).rowNumber();

  const nullsLast = df.window({
    orderBy: [{ column: 'value', nulls: 'last' }]
  }).rowNumber();

  assert.equal(JSON.stringify(nullsFirst), JSON.stringify([1, 3, 2]));
  assert.equal(JSON.stringify(nullsLast), JSON.stringify([3, 2, 1]));
});

test('DataFrame.window validates required spec and numeric running constraints', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1, value: 'x' },
    { id: 2, value: 'y' }
  ]);

  assert.throws(
    () => df.window({ partitionBy: ['id'] }),
    /window requires orderBy/
  );

  assert.throws(
    () => df.window({ orderBy: ['value'] }).col('value').running('sum'),
    /requires numeric values/
  );
});
