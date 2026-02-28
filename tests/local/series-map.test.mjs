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

test('Series.map supports function mapper with index metadata', () => {
  const context = createContext();
  const series = new context.Series([10, 20], 'amount', null, ['a', 'b']);

  const out = series.map((value, indexLabel, pos) => `${indexLabel}:${value + pos}`);

  assert.equal(JSON.stringify(out.array), JSON.stringify(['a:10', 'b:21']));
  assert.equal(JSON.stringify(out.index), JSON.stringify(['a', 'b']));
  assert.equal(out.name, 'amount');
});

test('Series.map supports object and Map mapper contracts', () => {
  const context = createContext();
  const series = new context.Series(['a', 'b', 'z'], 'codes');

  const byObject = series.map({ a: 'alpha', b: 'beta' }, { defaultValue: 'unknown' });
  const byMap = series.map(new Map([['a', 1], ['b', 2]]), { defaultValue: -1 });

  assert.equal(JSON.stringify(byObject.array), JSON.stringify(['alpha', 'beta', 'unknown']));
  assert.equal(JSON.stringify(byMap.array), JSON.stringify([1, 2, -1]));
});

test('Series.map supports Series-based lookup by index label', () => {
  const context = createContext();
  const source = new context.Series(['high', 'low', 'missing'], 'risk');
  const mapper = new context.Series(['H', 'L'], 'lookup', null, ['high', 'low']);

  const out = source.map(mapper, { defaultValue: '?' });

  assert.equal(JSON.stringify(out.array), JSON.stringify(['H', 'L', '?']));
});

test('Series.map with Series mapper matches keys by identity, not string coercion', () => {
  const context = createContext();
  const source = new context.Series([1, '1', true, 'true'], 'keys');
  const mapper = new context.Series(['num-one', 'bool-true'], 'lookup', null, [1, true]);

  const out = source.map(mapper, { defaultValue: 'missing' });

  assert.equal(JSON.stringify(out.array), JSON.stringify(['num-one', 'missing', 'bool-true', 'missing']));
});

test('Series.map with Series mapper matches Date keys by timestamp value', () => {
  const context = createContext();
  const t0 = new Date('2026-01-01T00:00:00.000Z');
  const t1 = new Date('2026-01-02T00:00:00.000Z');
  const source = new context.Series([new Date(t0.getTime()), new Date(t1.getTime())], 'keys');
  const mapper = new context.Series(['first-day', 'second-day'], 'lookup', null, [t0, t1]);

  const out = source.map(mapper, { defaultValue: 'missing' });

  assert.equal(JSON.stringify(out.array), JSON.stringify(['first-day', 'second-day']));
});

test('Series.map supports naAction=ignore', () => {
  const context = createContext();
  const series = new context.Series([1, null, Number.NaN, 2], 'values');

  const out = series.map(value => value * 10, { naAction: 'ignore' });

  assert.equal(out.at(0), 10);
  assert.equal(out.at(1), null);
  assert.ok(Number.isNaN(out.at(2)));
  assert.equal(out.at(3), 20);
});

test('Series.map validates mapper and options', () => {
  const context = createContext();
  const series = new context.Series([1], 'values');

  assert.throws(
    () => {
      series.map(123);
    },
    /mapper must be a function, Map, plain object, or Series/
  );

  assert.throws(
    () => {
      series.map(value => value, { naAction: 'drop' });
    },
    /naAction must be 'ignore'/
  );
});
