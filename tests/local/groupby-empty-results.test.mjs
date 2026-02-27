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
