import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

const SCRIPT = 'apps_script_tools/database/databricks/loadDatabricksTable.js';

function baseConfig(mode = 'insert') {
  return {
    arrays: [
      ['id', 'name'],
      [1, 'Alice'],
      [2, 'Bob']
    ],
    tableName: 'analytics.users',
    tableSchema: { id: 'INT', name: 'STRING' },
    mode,
    databricks_parameters: {
      host: 'dbc.example.com',
      sqlWarehouseId: 'warehouse-1',
      schema: 'analytics',
      token: 'token'
    },
    options: {
      maxWaitMs: 5000,
      pollIntervalMs: 250
    }
  };
}

test('loadDatabricksTable forwards options to each Databricks SQL statement', () => {
  const captured = [];
  const context = createGasContext({
    runDatabricksSql: (...args) => {
      captured.push(args);
      return {};
    }
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  context.loadDatabricksTable(baseConfig('insert'));

  assert.ok(captured.length >= 2);
  assert.equal(
    JSON.stringify(captured.map(args => args[3])),
    JSON.stringify([
      { maxWaitMs: 5000, pollIntervalMs: 250 },
      { maxWaitMs: 5000, pollIntervalMs: 250 }
    ])
  );
});

test('loadDatabricksTable throws for unsupported write mode', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({})
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  assert.throws(
    () => context.loadDatabricksTable(baseConfig('upsert')),
    /Unsupported mode/
  );
});
