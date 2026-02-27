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

test('GroupBy.agg returns deterministic empty DataFrame for empty input', () => {
  const context = createContext();
  const df = context.DataFrame.fromColumns({
    grp: [],
    value: []
  });

  const out = df.groupBy(['grp']).agg({
    value: 'sum'
  });

  assert.equal(out.empty(), true);
  assert.equal(JSON.stringify(out.columns), JSON.stringify(['grp', 'value_sum']));
});

test('GroupBy.apply returns schema-preserving empty DataFrame for empty input', () => {
  const context = createContext();
  const df = context.DataFrame.fromColumns({
    grp: [],
    value: []
  });

  const out = df.groupBy(['grp']).apply(group => group);

  assert.equal(out.empty(), true);
  assert.equal(JSON.stringify(out.columns), JSON.stringify(['grp', 'value']));
});

test('GroupBy.agg preserves key and output schema types for empty typed input', () => {
  const context = createContext();
  const df = context.DataFrame.fromColumns({
    grp: new context.Series([], 'grp', 'string'),
    value: new context.Series([], 'value', 'number')
  });

  const out = df.groupBy(['grp']).agg({
    value: 'sum'
  });

  assert.equal(
    JSON.stringify(out.schema()),
    JSON.stringify({ grp: 'string', value_sum: 'number' })
  );
});

test('GroupBy.apply preserves source schema types for empty typed input', () => {
  const context = createContext();
  const df = context.DataFrame.fromColumns({
    grp: new context.Series([], 'grp', 'string'),
    value: new context.Series([], 'value', 'number')
  });

  const out = df.groupBy(['grp']).apply(group => group);

  assert.equal(
    JSON.stringify(out.schema()),
    JSON.stringify({ grp: 'string', value: 'number' })
  );
});

test('GroupBy.agg validates missing columns even when input is empty', () => {
  const context = createContext();
  const df = context.DataFrame.fromColumns({
    grp: [],
    value: []
  });

  assert.throws(
    () => {
      df.groupBy(['grp']).agg({
        missing: 'sum'
      });
    },
    /Column 'missing' not found in DataFrame/
  );
});

test('GroupBy.agg validates reducer names even when input is empty', () => {
  const context = createContext();
  const df = context.DataFrame.fromColumns({
    grp: [],
    value: []
  });

  assert.throws(
    () => {
      df.groupBy(['grp']).agg({
        value: 'notAFunction'
      });
    },
    /Invalid aggregation function 'notAFunction' for column 'value'/
  );
});

test('GroupBy.apply validates callback type even when input is empty', () => {
  const context = createContext();
  const df = context.DataFrame.fromColumns({
    grp: [],
    value: []
  });

  assert.throws(
    () => {
      df.groupBy(['grp']).apply(123);
    },
    /The applied function must be a function/
  );
});
