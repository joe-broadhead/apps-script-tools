import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.fromColumns builds DataFrame and toColumns round-trips data', () => {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromColumns({
    id: [1, 2, 3],
    region: ['east', 'west', 'east'],
    amount: [10, 20, 30]
  });

  assert.equal(df.len(), 3);
  assert.equal(JSON.stringify(df.columns), JSON.stringify(['id', 'region', 'amount']));

  const columns = df.toColumns();
  assert.equal(
    JSON.stringify(columns),
    JSON.stringify({
      id: [1, 2, 3],
      region: ['east', 'west', 'east'],
      amount: [10, 20, 30]
    })
  );
});

test('DataFrame.toArrays does not force toRecords conversion path', () => {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  context.DataFrame.__resetPerfCounters();

  const df = context.DataFrame.fromColumns({
    id: [1, 2],
    amount: [10, 20]
  });

  const arrays = df.toArrays();
  assert.equal(
    JSON.stringify(arrays),
    JSON.stringify([
      ['id', 'amount'],
      [1, 10],
      [2, 20]
    ])
  );

  const counters = context.DataFrame.__getPerfCounters();
  assert.equal(counters.toArrays >= 1, true);
  assert.equal(counters.toRecords, 0);
});
