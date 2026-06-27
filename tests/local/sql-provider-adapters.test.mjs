import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

function createContext(overrides = {}) {
  return createGasContext({
    astRunDatabricksSql: () => ({ provider: 'databricks' }),
    astRunBigQuerySql: () => ({ provider: 'bigquery' }),
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
      assert.match(error.message, /Provider must be one of: bigquery, databricks/);
      assert.equal(JSON.stringify(error.details.supportedProviders), JSON.stringify(['bigquery', 'databricks']));
      return true;
    }
  );
});

test('astGetSqlProviderAdapter rejects inherited Object provider names', () => {
  const context = createContext();

  loadScripts(context, [
    'apps_script_tools/database/general/sqlProviderAdapters.js'
  ]);

  ['toString', 'constructor', '__proto__'].forEach(provider => {
    assert.throws(
      () => context.astGetSqlProviderAdapter(provider),
      error => {
        assert.equal(error.name, 'SqlProviderValidationError');
        assert.equal(error.provider, provider);
        assert.match(error.message, /Provider must be one of: bigquery, databricks/);
        return true;
      }
    );
  });
});

test('runSqlQuery uses adapter registry dispatch for provider execution', () => {
  const calls = [];
  const context = createContext({
    astRunDatabricksSql: () => {
      calls.push('databricks');
      return { provider: 'databricks' };
    },
    astRunBigQuerySql: () => {
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
  assert.equal(JSON.stringify(bigquery.requiredParameters), JSON.stringify(['projectId']));
  assert.equal(bigquery.executionIdField, 'jobId');
  assert.equal(bigquery.preparedStatementLifecycle.storage, 'runtime_memory');
  assert.equal(bigquery.preparedStatementLifecycle.durable, false);
  assert.equal(bigquery.preparedStatementLifecycle.crossExecution, false);
  assert.equal(bigquery.preparedStatementLifecycle.scope, 'invocation_local');
  assert.equal(bigquery.preparedStatementLifecycle.defaultTtlSec, 900);
  assert.equal(bigquery.supportsStatus, true);
  assert.equal(bigquery.supportsCancel, true);

  assert.equal(databricks.supportsPreparedStatements, true);
  assert.equal(JSON.stringify(databricks.requiredParameters), JSON.stringify(['host', 'sqlWarehouseId', 'schema', 'token']));
  assert.equal(databricks.executionIdField, 'statementId');
  assert.equal(databricks.preparedStatementLifecycle.storage, 'runtime_memory');
  assert.equal(databricks.preparedStatementLifecycle.durable, false);
  assert.equal(databricks.preparedStatementLifecycle.crossExecution, false);
  assert.equal(databricks.supportsStatus, true);
  assert.equal(databricks.supportsCancel, true);
});

test('astGetSqlProviderCapabilities returns isolated lifecycle metadata objects', () => {
  const context = createContext();

  loadScripts(context, [
    'apps_script_tools/database/general/sqlProviderAdapters.js'
  ]);

  const first = context.astGetSqlProviderCapabilities('bigquery');
  first.preparedStatementLifecycle.maxTtlSec = 1;
  first.requiredParameters.push('mutated');

  const second = context.astGetSqlProviderCapabilities('bigquery');
  assert.equal(second.preparedStatementLifecycle.maxTtlSec, 3600);
  assert.equal(JSON.stringify(second.requiredParameters), JSON.stringify(['projectId']));
});

test('astValidateSqlRequest derives provider required parameters from registry metadata', () => {
  const context = createContext();

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/sqlProviderAdapters.js'
  ]);

  assert.equal(JSON.stringify(context.astGetSqlProviderValidationSpec('databricks').requiredParameters), JSON.stringify([
    'host',
    'sqlWarehouseId',
    'schema',
    'token'
  ]));

  assert.throws(
    () => context.astValidateSqlRequest({
      provider: 'databricks',
      sql: 'select 1',
      parameters: {
        host: 'dbc.example.com',
        schema: 'default'
      }
    }),
    /Databricks requests require parameters.sqlWarehouseId, parameters.token/
  );
});

test('astLoadSqlProviderTable routes table loads through provider adapters', () => {
  const calls = [];
  const context = createContext({
    astLoadBigQueryTable: config => {
      calls.push({ provider: 'bigquery', config });
      return 'bigquery-loaded';
    },
    astLoadDatabricksTable: config => {
      calls.push({ provider: 'databricks', config });
      return 'databricks-loaded';
    }
  });

  loadScripts(context, [
    'apps_script_tools/database/general/sqlProviderAdapters.js'
  ]);

  assert.equal(context.astLoadSqlProviderTable('bigquery', { tableName: 'dataset.table' }), 'bigquery-loaded');
  assert.equal(context.astLoadSqlProviderTable('databricks', { tableName: 'schema.table' }), 'databricks-loaded');
  assert.equal(JSON.stringify(calls), JSON.stringify([
    { provider: 'bigquery', config: { tableName: 'dataset.table' } },
    { provider: 'databricks', config: { tableName: 'schema.table' } }
  ]));
});
