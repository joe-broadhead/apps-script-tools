import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.generateSurrogateKey does not mutate provided column array', () => {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, region: 'east' },
    { id: 2, region: 'west' }
  ]);

  const staticColumns = ['id', 'region'];
  const instanceColumns = ['id', 'region'];

  const staticKey = context.DataFrame.generateSurrogateKey(df, staticColumns);
  const instanceKey = df.generateSurrogateKey(instanceColumns);

  assert.deepEqual(staticColumns, ['id', 'region']);
  assert.deepEqual(instanceColumns, ['id', 'region']);
  assert.deepEqual(staticKey.array, instanceKey.array);
});

test('DataFrame.generateSurrogateKey validates input columns', () => {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([{ id: 1 }]);

  assert.throws(() => df.generateSurrogateKey([]), /at least one column/);
  assert.throws(() => df.generateSurrogateKey(['missing']), /unknown columns/);
});
