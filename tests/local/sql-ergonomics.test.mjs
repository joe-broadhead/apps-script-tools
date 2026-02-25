import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

function loadSqlRuntime(context) {
  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/sqlProviderAdapters.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);
}

test('AST.Sql exposes prepare/executePrepared/status/cancel/providers/capabilities', () => {
  const context = createGasContext({
    runSqlQuery: () => ({}),
    astSqlPrepare: () => ({}),
    astSqlExecutePrepared: () => ({}),
    astSqlStatus: () => ({}),
    astSqlCancel: () => ({}),
    astListSqlProviders: () => ['bigquery', 'databricks'],
    astGetSqlProviderCapabilities: () => ({})
  });

  loadScripts(context, ['apps_script_tools/AST.js']);

  const sql = context.AST.Sql;
  assert.equal(typeof sql.run, 'function');
  assert.equal(typeof sql.prepare, 'function');
  assert.equal(typeof sql.executePrepared, 'function');
  assert.equal(typeof sql.status, 'function');
  assert.equal(typeof sql.cancel, 'function');
  assert.equal(typeof sql.providers, 'function');
  assert.equal(typeof sql.capabilities, 'function');
});

test('astSqlPrepare + astSqlExecutePrepared binds typed params and executes provider detailed path', () => {
  let captured = null;
  const context = createGasContext({
    astExecuteBigQuerySqlDetailed: (sql, parameters, placeholders, options) => {
      captured = { sql, parameters, placeholders, options };
      return {
        dataFrame: { kind: 'df' },
        execution: {
          provider: 'bigquery',
          executionId: 'job-123',
          state: 'SUCCEEDED'
        }
      };
    },
    astRunBigQuerySql: () => ({ kind: 'fallback' }),
    astRunDatabricksSql: () => ({ kind: 'dbx' })
  });

  loadSqlRuntime(context);

  const prepared = context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select * from users where id = {{id}} and name = {{name}}',
    paramsSchema: {
      id: 'integer',
      name: 'string'
    },
    parameters: {
      projectId: 'proj-default'
    }
  });

  const result = context.astSqlExecutePrepared({
    statementId: prepared.statementId,
    params: {
      id: 7,
      name: "O'Reilly"
    }
  });

  assert.equal(typeof prepared.statementId, 'string');
  assert.equal(prepared.provider, 'bigquery');
  assert.equal(captured.parameters.projectId, 'proj-default');
  assert.equal(captured.placeholders && Object.keys(captured.placeholders).length, 0);
  assert.match(captured.sql, /id = 7/);
  assert.match(captured.sql, /name = 'O''Reilly'/);
  assert.equal(result.execution.executionId, 'job-123');
  assert.equal(result.dataFrame.kind, 'df');
});

test('astSqlExecutePrepared falls back to executeQuery when detailed provider helper is unavailable', () => {
  const context = createGasContext({
    astRunBigQuerySql: () => ({ kind: 'fallback-df' }),
    astRunDatabricksSql: () => ({ kind: 'dbx' })
  });

  loadSqlRuntime(context);

  const prepared = context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select {{n}} as n',
    paramsSchema: { n: 'integer' },
    parameters: { projectId: 'proj-1' }
  });

  const result = context.astSqlExecutePrepared({
    statementId: prepared.statementId,
    params: { n: 3 }
  });

  assert.equal(result.dataFrame.kind, 'fallback-df');
  assert.equal(result.execution, null);
});

test('astSqlExecutePrepared throws for missing required prepared params', () => {
  const context = createGasContext({
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' })
  });

  loadSqlRuntime(context);

  const prepared = context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select * from t where account_id = {{account_id}}',
    paramsSchema: {
      account_id: { type: 'integer', required: true }
    },
    parameters: { projectId: 'proj-1' }
  });

  assert.throws(
    () => context.astSqlExecutePrepared({ statementId: prepared.statementId, params: {} }),
    /Missing required prepared parameter 'account_id'/
  );
});

test('astSqlStatus routes to provider status helpers', () => {
  let captured = null;
  const context = createGasContext({
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' }),
    astGetBigQuerySqlStatus: (parameters, jobId) => {
      captured = { parameters, jobId };
      return {
        provider: 'bigquery',
        executionId: jobId,
        state: 'RUNNING',
        complete: false
      };
    }
  });

  loadSqlRuntime(context);

  const status = context.astSqlStatus({
    provider: 'bigquery',
    executionId: 'job-xyz',
    parameters: { projectId: 'proj-1' }
  });

  assert.equal(captured.jobId, 'job-xyz');
  assert.equal(captured.parameters.projectId, 'proj-1');
  assert.equal(status.state, 'RUNNING');
});

test('astSqlCancel routes to provider cancel helpers', () => {
  let captured = null;
  const context = createGasContext({
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' }),
    astCancelDatabricksSql: (parameters, statementId) => {
      captured = { parameters, statementId };
      return {
        provider: 'databricks',
        executionId: statementId,
        state: 'CANCELED',
        canceled: true
      };
    }
  });

  loadSqlRuntime(context);

  const cancel = context.astSqlCancel({
    provider: 'databricks',
    statementId: 'stmt-42',
    parameters: {
      host: 'dbc.example.com',
      token: 'token'
    }
  });

  assert.equal(captured.statementId, 'stmt-42');
  assert.equal(captured.parameters.host, 'dbc.example.com');
  assert.equal(cancel.canceled, true);
  assert.equal(cancel.state, 'CANCELED');
});
