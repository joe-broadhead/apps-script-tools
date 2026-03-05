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

test('expression parser compiles CASE expression and collects dependencies', () => {
  const context = createContext();

  const plan = context.__astExprCompile(
    "case when score >= 80 then 'high' else 'standard' end",
    { cachePlan: false }
  );

  assert.equal(plan.expression, "case when score >= 80 then 'high' else 'standard' end");
  assert.equal(JSON.stringify(plan.dependencies), JSON.stringify(['score']));
  assert.equal(typeof plan.evaluate, 'function');
});

test('expression planner cache reuses compiled plans by expression', () => {
  const context = createContext();

  context.__astExprPlanCacheClear();

  const first = context.__astExprCompile('amount * 2');
  const second = context.__astExprCompile('amount * 2');

  assert.equal(first, second);
});

test('DataFrame.selectExprDsl evaluates arithmetic/functions/case expressions', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1, amount: 10, fx_rate: 1.3, score: 82, region: 'East' },
    { id: 2, amount: 20, fx_rate: 1.1, score: 61, region: 'West' }
  ]);
  df.index = ['row_a', 'row_b'];

  const projected = df.selectExprDsl({
    id: 'id',
    amount_usd: 'round(amount * fx_rate, 2)',
    amount_abs_delta: 'abs(amount - 15)',
    score_band: "case when score >= 80 then 'high' else 'standard' end",
    region_lower: 'lower(region)'
  });

  assert.equal(JSON.stringify(projected.columns), JSON.stringify(['id', 'amount_usd', 'amount_abs_delta', 'score_band', 'region_lower']));
  assert.equal(JSON.stringify(projected.amount_usd.array), JSON.stringify([13, 22]));
  assert.equal(JSON.stringify(projected.amount_abs_delta.array), JSON.stringify([5, 5]));
  assert.equal(JSON.stringify(projected.score_band.array), JSON.stringify(['high', 'standard']));
  assert.equal(JSON.stringify(projected.region_lower.array), JSON.stringify(['east', 'west']));
  assert.equal(JSON.stringify(projected.index), JSON.stringify(['row_a', 'row_b']));
});

test('expression parser supports SQL-like operators and collects dependencies', () => {
  const context = createContext();

  const plan = context.__astExprCompile(
    "amount IS NOT NULL AND code IN ('A1', 'B2') AND score BETWEEN 10 AND 90 AND code LIKE 'A%'",
    { cachePlan: false }
  );

  assert.equal(JSON.stringify(plan.dependencies), JSON.stringify(['amount', 'code', 'score']));
  assert.equal(plan.evaluate({ amount: 1, code: 'A1', score: 50 }), true);
  assert.equal(plan.evaluate({ amount: null, code: 'A1', score: 50 }), false);
});

test('DataFrame.selectExprDsl evaluates new SQL-like functions/operators', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { txt: '  Alpha  ', n: 1.2, score: 82, code: 'A12', region: null },
    { txt: 'Beta', n: -1.2, score: 55, code: 'B34', region: 'west' }
  ]);

  const projected = df.selectExprDsl({
    trimmed: 'trim(txt)',
    sub: 'substring(trim(txt), 1, 4)',
    merged: "concat(trim(txt), '-', floor(n), '-', ceil(n))",
    band: "iff(score >= 80, 'high', 'standard')",
    is_region_null: 'region IS NULL',
    in_set: "code IN ('A12', 'C34')",
    not_in_set: "code NOT IN ('Z99')",
    between_score: 'score BETWEEN 60 AND 90',
    not_between_score: 'score NOT BETWEEN 0 AND 50',
    like_code: "code LIKE 'A%'",
    not_like_code: "code NOT LIKE 'B%'"
  });

  assert.equal(JSON.stringify(projected.trimmed.array), JSON.stringify(['Alpha', 'Beta']));
  assert.equal(JSON.stringify(projected.sub.array), JSON.stringify(['Alph', 'Beta']));
  assert.equal(JSON.stringify(projected.merged.array), JSON.stringify(['Alpha-1-2', 'Beta--2--1']));
  assert.equal(JSON.stringify(projected.band.array), JSON.stringify(['high', 'standard']));
  assert.equal(JSON.stringify(projected.is_region_null.array), JSON.stringify([true, false]));
  assert.equal(JSON.stringify(projected.in_set.array), JSON.stringify([true, false]));
  assert.equal(JSON.stringify(projected.not_in_set.array), JSON.stringify([true, true]));
  assert.equal(JSON.stringify(projected.between_score.array), JSON.stringify([true, false]));
  assert.equal(JSON.stringify(projected.not_between_score.array), JSON.stringify([true, true]));
  assert.equal(JSON.stringify(projected.like_code.array), JSON.stringify([true, false]));
  assert.equal(JSON.stringify(projected.not_like_code.array), JSON.stringify([true, false]));
});

test('DataFrame.selectExprDsl keeps contextual operator words usable as identifiers', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { in: 1, like: 2, between: 3, is: 4 },
    { in: 10, like: 20, between: 30, is: 40 }
  ]);

  const projected = df.selectExprDsl({
    total: 'in + like + between + is',
    in_value: 'in',
    like_value: 'like',
    between_value: 'between',
    is_value: 'is'
  });

  assert.equal(JSON.stringify(projected.total.array), JSON.stringify([10, 100]));
  assert.equal(JSON.stringify(projected.in_value.array), JSON.stringify([1, 10]));
  assert.equal(JSON.stringify(projected.like_value.array), JSON.stringify([2, 20]));
  assert.equal(JSON.stringify(projected.between_value.array), JSON.stringify([3, 30]));
  assert.equal(JSON.stringify(projected.is_value.array), JSON.stringify([4, 40]));
});

test('LIKE escaped characters are matched as literals', () => {
  const context = createContext();

  const plan = context.__astExprCompile("value LIKE '\\\\d%'", { cachePlan: false });
  assert.equal(plan.evaluate({ value: 'dabc' }), true);
  assert.equal(plan.evaluate({ value: '9abc' }), false);
});

test('iff short-circuits unselected branches', () => {
  const context = createContext();

  const safeTrue = context.__astExprCompile('iff(true, 1, 1 / 0)', { cachePlan: false });
  const safeFalse = context.__astExprCompile('iff(false, 1 / 0, 2)', { cachePlan: false });
  const unknownColumn = context.__astExprCompile('iff(true, 10, missing_column + 1)', { cachePlan: false });

  assert.equal(safeTrue.evaluate({}), 1);
  assert.equal(safeFalse.evaluate({}), 2);
  assert.equal(unknownColumn.evaluate({}, { strict: true }), 10);
});

test('DataFrame.selectExprDsl strict=true rejects unknown columns at compile time', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([{ id: 1 }]);

  assert.throws(
    () => df.selectExprDsl({ value: 'missing_column + 1' }),
    /references unknown columns/
  );
});

test('DataFrame.selectExprDsl strict=false null-fills unknown columns', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([{ id: 1 }, { id: 2 }]);

  const projected = df.selectExprDsl(
    { value: 'missing_column + 1' },
    { strict: false }
  );

  assert.equal(JSON.stringify(projected.value.array), JSON.stringify([null, null]));
});

test('DataFrame.selectExprDsl onError=null null-fills runtime evaluation failures', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { name: 'alpha' },
    { name: 'beta' }
  ]);

  const projected = df.selectExprDsl(
    { rounded: 'round(name, 1)' },
    { onError: 'null' }
  );

  assert.equal(JSON.stringify(projected.rounded.array), JSON.stringify([null, null]));
});

test('DataFrame.selectExprDsl abs(null) preserves null semantics', () => {
  const context = createContext();
  const df = context.DataFrame.fromRecords([
    { amount: -5 },
    { amount: null }
  ]);

  const projected = df.selectExprDsl({
    magnitude: 'abs(amount)'
  });

  assert.equal(JSON.stringify(projected.magnitude.array), JSON.stringify([5, null]));
});

test('expression parser raises deterministic parse error details', () => {
  const context = createContext();

  assert.throws(
    () => context.__astExprCompile('amount +', { cachePlan: false }),
    error => {
      assert.equal(error.name, 'DataFrameExprParseError');
      assert.equal(typeof error.details.line, 'number');
      assert.equal(typeof error.details.column, 'number');
      return true;
    }
  );

  assert.throws(
    () => context.__astExprCompile('code IN ()', { cachePlan: false }),
    /IN requires at least one value/
  );
});
