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

test('loadDatabricksTable requires mergeKey in merge mode', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({})
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  const config = baseConfig('merge');
  delete config.mergeKey;

  assert.throws(
    () => context.loadDatabricksTable(config),
    /mergeKey is required for merge mode/
  );
});

test('loadDatabricksTable validates mergeKey exists in headers', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({})
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  const config = baseConfig('merge');
  config.mergeKey = 'missing_id';

  assert.throws(
    () => context.loadDatabricksTable(config),
    /must exist in header columns/
  );
});

test('loadDatabricksTable validates row width matches header width', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({})
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  const config = baseConfig('insert');
  config.arrays = [
    ['id', 'name'],
    [1]
  ];

  assert.throws(
    () => context.loadDatabricksTable(config),
    /has length 1, expected 2/
  );
});

test('loadDatabricksTable validates schema coverage for headers', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({})
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  const config = baseConfig('insert');
  config.tableSchema = { id: 'INT' };

  assert.throws(
    () => context.loadDatabricksTable(config),
    /tableSchema is missing definitions for columns: name/
  );
});

test('loadDatabricksTable validates polling options', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({})
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  const config = baseConfig('insert');
  config.options = {
    maxWaitMs: 100,
    pollIntervalMs: 200
  };

  assert.throws(
    () => context.loadDatabricksTable(config),
    /options\.pollIntervalMs cannot be greater than options\.maxWaitMs/
  );
});

test('loadDatabricksTable wraps statement failures in DatabricksLoadError', () => {
  const context = createGasContext({
    runDatabricksSql: () => {
      const err = new Error('statement failed');
      err.name = 'DatabricksSqlError';
      throw err;
    }
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  assert.throws(
    () => context.loadDatabricksTable(baseConfig('insert')),
    error => {
      assert.equal(error.name, 'DatabricksLoadError');
      assert.match(error.message, /Databricks load failed during create table/);
      assert.equal(error.provider, 'databricks');
      assert.equal(error.cause.name, 'DatabricksSqlError');
      return true;
    }
  );
});

test('loadDatabricksTable executes merge statements when mergeKey is valid', () => {
  const capturedSql = [];
  const context = createGasContext({
    runDatabricksSql: (sql) => {
      capturedSql.push(sql);
      return {};
    }
  });

  loadScripts(context, [
    'apps_script_tools/utilities/array/arrayChunk.js',
    SCRIPT
  ]);

  const config = baseConfig('merge');
  config.mergeKey = 'id';

  context.loadDatabricksTable(config);

  const hasMergeStatement = capturedSql.some(sql => String(sql).toLowerCase().includes('merge into'));
  assert.equal(hasMergeStatement, true);
});
