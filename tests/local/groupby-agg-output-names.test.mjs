import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('GroupBy.agg assigns unique output names for anonymous custom functions', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { grp: 'a', value: 2 },
    { grp: 'a', value: 3 },
    { grp: 'b', value: 5 }
  ]);

  const aggregated = df.groupBy(['grp']).agg({
    value: [
      values => values.length,
      values => values.reduce((sum, item) => sum + item, 0)
    ]
  });

  assert.equal(aggregated.columns.includes('value_custom_1'), true);
  assert.equal(aggregated.columns.includes('value_custom_2'), true);

  const rows = aggregated
    .toRecords()
    .sort((left, right) => String(left.grp).localeCompare(String(right.grp)));

  assert.equal(rows[0].value_custom_1, 2);
  assert.equal(rows[0].value_custom_2, 5);
  assert.equal(rows[1].value_custom_1, 1);
  assert.equal(rows[1].value_custom_2, 5);
});
