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

test('DataFrame.validateSchema reports missing/extra/type/nullability violations', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: '1', amount: 10, extra: 'x' },
    { id: null, amount: 'bad', extra: 'y' }
  ]);

  const report = context.DataFrame.validateSchema(df, {
    id: { type: 'integer', nullable: false },
    amount: { type: 'float', nullable: false },
    status: { type: 'string', nullable: true }
  });

  assert.equal(report.valid, false);
  assert.equal(JSON.stringify(report.violations.missingColumns), JSON.stringify(['status']));
  assert.equal(JSON.stringify(report.violations.extraColumns), JSON.stringify(['extra']));
  assert.equal(report.violations.nullabilityViolations.length, 1);
  assert.equal(report.violations.typeMismatches.length >= 2, true);
});

test('DataFrame.validateSchema strict mode throws on violations', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([{ id: 'abc' }]);

  assert.throws(
    () => df.validateSchema({ id: { type: 'integer', nullable: false } }, { strict: true }),
    /DataFrame\.validateSchema schema validation failed/
  );
});

test('DataFrame.enforceSchema coerces values and can drop extra columns', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: '1', amount: '10.5', active: 'true', extra: 'x' },
    { id: '2', amount: 'bad', active: 'false', extra: 'y' }
  ]);

  const out = df.enforceSchema(
    {
      id: { type: 'integer', nullable: false },
      amount: { type: 'float', nullable: true },
      active: { type: 'boolean', nullable: false }
    },
    {
      coerce: true,
      dropExtraColumns: true,
      strict: false
    }
  );

  assert.equal(JSON.stringify(out.columns), JSON.stringify(['id', 'amount', 'active']));
  assert.equal(JSON.stringify(out.id.array), JSON.stringify([1, 2]));
  assert.equal(JSON.stringify(out.amount.array), JSON.stringify([10.5, null]));
  assert.equal(JSON.stringify(out.active.array), JSON.stringify([true, false]));
});

test('DataFrame.enforceSchema can return validation report with coercion failures', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([{ amount: 'bad' }]);
  const result = df.enforceSchema(
    { amount: { type: 'float', nullable: true } },
    { returnReport: true, strict: false }
  );

  assert.equal(result.report.valid, false);
  assert.equal(result.report.violations.coercionFailures.length, 1);
  assert.equal(result.report.violations.coercionFailures[0].column, 'amount');
  assert.equal(JSON.stringify(result.dataframe.amount.array), JSON.stringify([null]));
});

test('DataFrame.enforceSchema strict mode throws on non-coercible non-nullable values', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([{ amount: 'bad' }]);

  assert.throws(
    () => df.enforceSchema({ amount: { type: 'float', nullable: false } }),
    /DataFrame\.enforceSchema schema validation failed/
  );
});
