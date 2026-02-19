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
