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

test('Series.dt uses DateMethods configured from series useUTC flag', () => {
  const context = createContext();

  const utcSeries = new context.Series(['2026-01-01T00:00:00Z'], 'dates', null, null, { useUTC: true });
  const localSeries = new context.Series(['2026-01-01T00:00:00Z'], 'dates', null, null, { useUTC: false });

  assert.equal(utcSeries.dt.useUTC, true);
  assert.equal(localSeries.dt.useUTC, false);
});

test('DateMethods.toDateString honors UTC/local getters based on useUTC', () => {
  const context = createContext();

  const originalCoerceValues = context.coerceValues;

  try {
    context.coerceValues = () => ({
      getTime: () => 1,
      getFullYear: () => 1999,
      getMonth: () => 0,
      getDate: () => 2,
      getUTCFullYear: () => 2001,
      getUTCMonth: () => 11,
      getUTCDate: () => 31
    });

    const localSeries = new context.Series(['2026-01-01T00:00:00Z'], 'dates', null, null, { useUTC: false });
    const utcSeries = new context.Series(['2026-01-01T00:00:00Z'], 'dates', null, null, { useUTC: true });

    assert.equal(localSeries.dt.toDateString().array[0], '1999-01-02');
    assert.equal(utcSeries.dt.toDateString().array[0], '2001-12-31');
  } finally {
    context.coerceValues = originalCoerceValues;
  }
});
