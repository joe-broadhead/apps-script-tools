import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

function createContext(overrides = {}) {
  return createGasContext({
    runDatabricksSql: () => ({ provider: 'databricks' }),
    runBigQuerySql: () => ({ provider: 'bigquery' }),
    ...overrides
  });
}

test('astListSqlProviders returns supported provider keys', () => {
  const context = createContext();

  loadScripts(context, [
    'apps_script_tools/database/general/sqlProviderAdapters.js'
  ]);

  assert.equal(
    JSON.stringify(context.astListSqlProviders()),
    JSON.stringify(['bigquery', 'databricks'])
  );
});

test('astGetSqlProviderAdapter returns typed validation error for unknown providers', () => {
  const context = createContext();

  loadScripts(context, [
    'apps_script_tools/database/general/sqlProviderAdapters.js'
  ]);

  assert.throws(
    () => context.astGetSqlProviderAdapter('snowflake'),
    error => {
      assert.equal(error.name, 'SqlProviderValidationError');
      assert.equal(error.provider, 'snowflake');
      assert.match(error.message, /Provider must be one of: databricks, bigquery/);
      return true;
    }
  );
});

test('runSqlQuery uses adapter registry dispatch for provider execution', () => {
  const calls = [];
  const context = createContext({
    runDatabricksSql: () => {
      calls.push('databricks');
      return { provider: 'databricks' };
    },
    runBigQuerySql: () => {
      calls.push('bigquery');
      return { provider: 'bigquery' };
    }
  });

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/sqlProviderAdapters.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);

  context.runSqlQuery({
    provider: 'bigquery',
    sql: 'select 1',
    parameters: { projectId: 'project-1' }
  });

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

  assert.equal(JSON.stringify(calls), JSON.stringify(['bigquery', 'databricks']));
});

test('astGetSqlProviderCapabilities exposes execution-control support', () => {
  const context = createContext();

  loadScripts(context, [
    'apps_script_tools/database/general/sqlProviderAdapters.js'
  ]);

  const bigquery = context.astGetSqlProviderCapabilities('bigquery');
  const databricks = context.astGetSqlProviderCapabilities('databricks');

  assert.equal(bigquery.supportsPreparedStatements, true);
  assert.equal(bigquery.supportsStatus, true);
  assert.equal(bigquery.supportsCancel, true);

  assert.equal(databricks.supportsPreparedStatements, true);
  assert.equal(databricks.supportsStatus, true);
  assert.equal(databricks.supportsCancel, true);
});
