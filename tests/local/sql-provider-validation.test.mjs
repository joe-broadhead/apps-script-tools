import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

test('runSqlQuery validates required BigQuery parameters', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({ provider: 'databricks' }),
    runBigQuerySql: () => ({ provider: 'bigquery' })
  });

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);

  assert.throws(() => {
    context.runSqlQuery({
      provider: 'bigquery',
      sql: 'select 1',
      parameters: {}
    });
  }, /parameters\.projectId/);
});

test('runSqlQuery validates required Databricks parameters', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({ provider: 'databricks' }),
    runBigQuerySql: () => ({ provider: 'bigquery' })
  });

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);

  assert.throws(() => {
    context.runSqlQuery({
      provider: 'databricks',
      sql: 'select 1',
      parameters: {
        host: 'dbc.example.com',
        sqlWarehouseId: 'warehouse',
        schema: 'default'
      }
    });
  }, /parameters\.token/);
});

test('runSqlQuery forwards normalized options to BigQuery provider', () => {
  let captured = null;
  const context = createGasContext({
    runDatabricksSql: () => ({ provider: 'databricks' }),
    runBigQuerySql: (sql, parameters, placeholders, options) => {
      captured = { sql, parameters, placeholders, options };
      return { provider: 'bigquery' };
    }
  });

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);

  context.runSqlQuery({
    provider: 'bigquery',
    sql: 'select * from users where region = {{region}}',
    parameters: { projectId: 'project-1' },
    placeholders: { region: 'north' },
    options: {
      allowUnsafePlaceholders: true,
      maxWaitMs: 2000,
      pollIntervalMs: 250
    }
  });

  const expected = {
    sql: 'select * from users where region = {{region}}',
    parameters: { projectId: 'project-1' },
    placeholders: { region: 'north' },
    options: {
      allowUnsafePlaceholders: true,
      maxWaitMs: 2000,
      pollIntervalMs: 250
    }
  };

  assert.equal(JSON.stringify(captured), JSON.stringify(expected));
});

test('runSqlQuery forwards default options to Databricks provider', () => {
  let capturedOptions = null;
  const context = createGasContext({
    runDatabricksSql: (_sql, _parameters, _placeholders, options) => {
      capturedOptions = options;
      return { provider: 'databricks' };
    },
    runBigQuerySql: () => ({ provider: 'bigquery' })
  });

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);

  context.runSqlQuery({
    provider: 'databricks',
    sql: 'select 1',
    parameters: {
      host: 'dbc.example.com',
      sqlWarehouseId: 'warehouse',
      schema: 'default',
      token: 'token'
    }
  });

  assert.equal(
    JSON.stringify(capturedOptions),
    JSON.stringify({
      allowUnsafePlaceholders: false,
      maxWaitMs: 120000,
      pollIntervalMs: 500
    })
  );
});

test('runSqlQuery rejects options.pollIntervalMs larger than options.maxWaitMs', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({ provider: 'databricks' }),
    runBigQuerySql: () => ({ provider: 'bigquery' })
  });

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);

  assert.throws(() => {
    context.runSqlQuery({
      provider: 'bigquery',
      sql: 'select 1',
      parameters: { projectId: 'project-1' },
      options: {
        maxWaitMs: 50,
        pollIntervalMs: 100
      }
    });
  }, /options\.pollIntervalMs cannot be greater than options\.maxWaitMs/);
});
