import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadCoreDataContext } from './helpers.mjs';

function createDataFrameContext() {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });
  loadCoreDataContext(context);
  return context;
}

test('DataFrame.concat rejects mismatched schemas when column names differ', () => {
  const context = createDataFrameContext();
  const left = context.DataFrame.fromRecords([{ id: 1, name: 'Alice' }]);
  const right = context.DataFrame.fromRecords([{ id: 2, age: 30 }]);

  assert.throws(
    () => {
      context.DataFrame.concat([left, right]);
    },
    /identical columns/
  );
});

test('DataFrame.rename evaluates explicit mappings even when destination is falsy', () => {
  const context = createDataFrameContext();
  const df = context.DataFrame.fromRecords([{ id: 1 }]);

  assert.throws(
    () => {
      df.rename({ id: '' });
    },
    /Invalid name/
  );
});

test('DataFrame.pivot uses collision-safe grouping keys', () => {
  const context = createDataFrameContext();
  const df = context.DataFrame.fromRecords([
    { idx: 'a||b', piv: 'c', metric: 1 },
    { idx: 'a', piv: 'b||c', metric: 2 }
  ]);

  const pivoted = df.pivot('idx', 'piv', {
    metric: values => values.reduce((sum, value) => sum + value, 0)
  });

  const firstRow = pivoted.at(0);
  const secondRow = pivoted.at(1);

  assert.equal(firstRow.idx, 'a||b');
  assert.equal(firstRow.c_metric, 1);
  assert.equal(firstRow['b||c_metric'], null);

  assert.equal(secondRow.idx, 'a');
  assert.equal(secondRow.c_metric, null);
  assert.equal(secondRow['b||c_metric'], 2);
});
