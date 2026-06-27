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
  assert.equal(prepared.lifecycle, 'invocation_local');
  assert.equal(prepared.durable, false);
  assert.equal(prepared.crossExecution, false);
  assert.equal(prepared.ttlSec, 900);
  assert.equal(typeof prepared.expiresAt, 'string');
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

test('astSqlExecutePrepared reports invocation-local miss across simulated executions', () => {
  const firstContext = createGasContext({
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' })
  });
  loadSqlRuntime(firstContext);

  const prepared = firstContext.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select {{n}} as n',
    paramsSchema: { n: 'integer' },
    parameters: { projectId: 'proj-1' }
  });

  const secondContext = createGasContext({
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' })
  });
  loadSqlRuntime(secondContext);

  assert.throws(
    () => secondContext.astSqlExecutePrepared({
      statementId: prepared.statementId,
      params: { n: 3 }
    }),
    error => {
      assert.equal(error.name, 'SqlPreparedStatementError');
      assert.match(error.message, /invocation-local/);
      assert.equal(error.details.statementId, prepared.statementId);
      assert.equal(error.details.durable, false);
      assert.equal(error.details.crossExecution, false);
      return true;
    }
  );
});

test('astSqlExecutePrepared rejects expired and invalid prepared IDs', () => {
  let nowMs = 1_000;
  class FakeDate extends Date {
    constructor(value) {
      super(typeof value === 'undefined' ? nowMs : value);
    }

    static now() {
      return nowMs;
    }
  }

  const context = createGasContext({
    Date: FakeDate,
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' })
  });
  loadSqlRuntime(context);

  const prepared = context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select {{n}} as n',
    paramsSchema: { n: 'integer' },
    parameters: { projectId: 'proj-1' },
    ttlSec: 1
  });

  assert.equal(prepared.ttlSec, 1);
  nowMs += 1_001;

  assert.throws(
    () => context.astSqlExecutePrepared({
      statementId: prepared.statementId,
      params: { n: 3 }
    }),
    error => {
      assert.equal(error.name, 'SqlPreparedStatementError');
      assert.match(error.message, /expired/);
      assert.equal(error.details.ttlSec, 1);
      assert.equal(error.details.lifecycle, 'invocation_local');
      return true;
    }
  );

  assert.throws(
    () => context.astSqlExecutePrepared({
      statementId: 'not-a-prepared-id',
      params: { n: 3 }
    }),
    /statementId is invalid/
  );
});

test('astSqlPrepare compacts expired IDs before enforcing max prepared cache size', () => {
  let nowMs = 1_000;
  class FakeDate extends Date {
    constructor(value) {
      super(typeof value === 'undefined' ? nowMs : value);
    }

    static now() {
      return nowMs;
    }
  }

  let capturedSql = '';
  const context = createGasContext({
    Date: FakeDate,
    astExecuteBigQuerySqlDetailed: sql => {
      capturedSql = sql;
      return {
        dataFrame: { kind: 'df' },
        execution: {
          provider: 'bigquery',
          executionId: 'job-live',
          state: 'SUCCEEDED'
        }
      };
    },
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' })
  });
  loadSqlRuntime(context);

  const longLived = context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select {{n}} as n',
    paramsSchema: { n: 'integer' },
    parameters: { projectId: 'proj-1' },
    ttlSec: 3600
  });

  for (let idx = 0; idx < 499; idx += 1) {
    context.astSqlPrepare({
      provider: 'bigquery',
      sql: `select {{n}} as n_${idx}`,
      paramsSchema: { n: 'integer' },
      parameters: { projectId: 'proj-1' },
      ttlSec: 1
    });
  }

  nowMs += 1_001;
  context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select {{n}} as fresh_n',
    paramsSchema: { n: 'integer' },
    parameters: { projectId: 'proj-1' },
    ttlSec: 3600
  });

  const result = context.astSqlExecutePrepared({
    statementId: longLived.statementId,
    params: { n: 42 }
  });

  assert.equal(result.execution.executionId, 'job-live');
  assert.match(capturedSql, /select 42 as n/);
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

test('astSqlExecutePrepared rejects raw params unless allowRawParameters is true', () => {
  const context = createGasContext({
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' })
  });

  loadSqlRuntime(context);

  const prepared = context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select * from users where {{where_clause}}',
    paramsSchema: {
      where_clause: { type: 'raw', required: true }
    },
    parameters: { projectId: 'proj-1' }
  });

  assert.throws(
    () => context.astSqlExecutePrepared({
      statementId: prepared.statementId,
      params: { where_clause: "email like '%@example.com'" }
    }),
    /allowRawParameters=true/
  );
});

test('astSqlExecutePrepared allows raw params only with explicit opt-in and emits warning', () => {
  const warnings = [];
  let capturedSql = null;
  const context = createGasContext({
    console: {
      log: () => {},
      info: () => {},
      error: () => {},
      warn: message => warnings.push(String(message))
    },
    astExecuteBigQuerySqlDetailed: sql => {
      capturedSql = sql;
      return {
        dataFrame: { kind: 'df' },
        execution: {
          provider: 'bigquery',
          executionId: 'job-raw-1',
          state: 'SUCCEEDED'
        }
      };
    },
    astRunBigQuerySql: () => ({ kind: 'unused' }),
    astRunDatabricksSql: () => ({ kind: 'unused' })
  });

  loadSqlRuntime(context);

  const prepared = context.astSqlPrepare({
    provider: 'bigquery',
    sql: 'select * from users where {{where_clause}}',
    paramsSchema: {
      where_clause: { type: 'raw', required: true }
    },
    options: {
      allowRawParameters: true
    },
    parameters: { projectId: 'proj-1' }
  });

  const result = context.astSqlExecutePrepared({
    statementId: prepared.statementId,
    params: { where_clause: "email like '%@example.com'" }
  });

  assert.match(capturedSql, /where email like '%@example.com'/);
  assert.equal(result.execution.executionId, 'job-raw-1');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /raw parameter used/i);
});
