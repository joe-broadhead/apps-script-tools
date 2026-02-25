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
});
