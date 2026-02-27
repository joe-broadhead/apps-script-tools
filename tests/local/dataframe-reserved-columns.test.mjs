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

test('DataFrame rejects column names that shadow reserved members', () => {
  const context = createDataFrameContext();

  assert.throws(
    () => {
      context.DataFrame.fromColumns({
        sort: [2, 1],
        amount: [20, 10]
      });
    },
    /reserved DataFrame members: sort/
  );
});

test('DataFrame.sort remains callable for non-reserved column names', () => {
  const context = createDataFrameContext();

  const df = context.DataFrame.fromColumns({
    metric_sort: [2, 1],
    amount: [20, 10]
  });

  assert.equal(typeof df.sort, 'function');
  const sorted = df.sort('metric_sort');
  assert.equal(JSON.stringify(sorted.metric_sort.array), JSON.stringify([1, 2]));
});

test('DataFrame.rename rejects target names that collide with reserved members', () => {
  const context = createDataFrameContext();
  const df = context.DataFrame.fromColumns({
    value: [1, 2]
  });

  assert.throws(
    () => {
      df.rename({ value: 'len' });
    },
    /reserved DataFrame members: len/
  );
});
