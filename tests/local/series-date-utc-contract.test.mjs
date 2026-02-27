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

  const original = {
    getFullYear: Date.prototype.getFullYear,
    getMonth: Date.prototype.getMonth,
    getDate: Date.prototype.getDate,
    getUTCFullYear: Date.prototype.getUTCFullYear,
    getUTCMonth: Date.prototype.getUTCMonth,
    getUTCDate: Date.prototype.getUTCDate
  };

  try {
    Date.prototype.getFullYear = () => 1999;
    Date.prototype.getMonth = () => 0;
    Date.prototype.getDate = () => 2;
    Date.prototype.getUTCFullYear = () => 2001;
    Date.prototype.getUTCMonth = () => 11;
    Date.prototype.getUTCDate = () => 31;

    const localSeries = new context.Series(['2026-01-01T00:00:00Z'], 'dates', null, null, { useUTC: false });
    const utcSeries = new context.Series(['2026-01-01T00:00:00Z'], 'dates', null, null, { useUTC: true });

    assert.equal(localSeries.dt.toDateString().array[0], '1999-01-02');
    assert.equal(utcSeries.dt.toDateString().array[0], '2001-12-31');
  } finally {
    Date.prototype.getFullYear = original.getFullYear;
    Date.prototype.getMonth = original.getMonth;
    Date.prototype.getDate = original.getDate;
    Date.prototype.getUTCFullYear = original.getUTCFullYear;
    Date.prototype.getUTCMonth = original.getUTCMonth;
    Date.prototype.getUTCDate = original.getUTCDate;
  }
});
