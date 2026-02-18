import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.toTable routes to loadBigQueryTable', () => {
  let called = 0;
  let captured = null;

  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: config => {
      called += 1;
      captured = config;
    }
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);

  df.toTable({
    provider: 'bigquery',
    config: {
      tableName: 'dataset.users',
      tableSchema: { id: 'INT64', name: 'STRING' },
      bigquery_parameters: { projectId: 'project' }
    }
  });

  assert.equal(called, 1);
  assert.ok(Array.isArray(captured.arrays));
});
