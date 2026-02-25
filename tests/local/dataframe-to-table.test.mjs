import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('DataFrame.toTable routes to astLoadBigQueryTable', () => {
  let called = 0;
  let captured = null;

  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: config => {
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

test('DataFrame.toTable routes to astLoadDatabricksTable', () => {
  let called = 0;
  let captured = null;

  const context = createGasContext({
    astLoadDatabricksTable: config => {
      called += 1;
      captured = config;
    },
    astLoadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);

  df.toTable({
    provider: 'databricks',
    config: {
      tableName: 'analytics.users',
      tableSchema: { id: 'INT', name: 'STRING' },
      databricks_parameters: {
        host: 'dbc.example.com',
        sqlWarehouseId: 'warehouse-1',
        schema: 'analytics',
        token: 'token'
      },
      options: {
        maxWaitMs: 2000,
        pollIntervalMs: 250
      }
    }
  });

  assert.equal(called, 1);
  assert.ok(Array.isArray(captured.arrays));
  assert.equal(
    JSON.stringify(captured.options),
    JSON.stringify({ maxWaitMs: 2000, pollIntervalMs: 250 })
  );
});
