import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

function createResponse(body = '{}', statusCode = 200) {
  return {
    getContentText: () => body,
    getResponseCode: () => statusCode
  };
}

test('astGetBigQuerySqlStatus maps DONE state to SUCCEEDED', () => {
  const context = createGasContext({
    BigQuery: {
      Jobs: {
        get: (_projectId, _jobId) => ({
          status: { state: 'DONE' }
        })
      }
    }
  });

  loadScripts(context, ['apps_script_tools/database/bigQuery/runBigQuerySql.js']);

  const status = context.astGetBigQuerySqlStatus(
    { projectId: 'project-1' },
    'job-1'
  );

  assert.equal(status.provider, 'bigquery');
  assert.equal(status.executionId, 'job-1');
  assert.equal(status.state, 'SUCCEEDED');
  assert.equal(status.complete, true);
});

test('astCancelBigQuerySql delegates to BigQuery.Jobs.cancel', () => {
  let called = null;
  const context = createGasContext({
    BigQuery: {
      Jobs: {
        cancel: (projectId, jobId) => {
          called = { projectId, jobId };
          return {
            job: {
              status: { state: 'DONE' }
            }
          };
        }
      }
    }
  });

  loadScripts(context, ['apps_script_tools/database/bigQuery/runBigQuerySql.js']);

  const status = context.astCancelBigQuerySql(
    { projectId: 'project-1' },
    'job-2'
  );

  assert.equal(called.projectId, 'project-1');
  assert.equal(called.jobId, 'job-2');
  assert.equal(status.canceled, true);
});

test('astGetBigQuerySqlStatus maps DONE + stopped reason to CANCELED', () => {
  const context = createGasContext({
    BigQuery: {
      Jobs: {
        get: (_projectId, _jobId) => ({
          status: {
            state: 'DONE',
            errorResult: {
              reason: 'stopped',
              message: 'Job was cancelled by user'
            }
          }
        })
      }
    }
  });

  loadScripts(context, ['apps_script_tools/database/bigQuery/runBigQuerySql.js']);

  const status = context.astGetBigQuerySqlStatus(
    { projectId: 'project-1' },
    'job-3'
  );

  assert.equal(status.state, 'CANCELED');
  assert.equal(status.complete, true);
});

test('astGetDatabricksSqlStatus returns normalized statement status', () => {
  let calledUrl = null;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: url => {
        calledUrl = url;
        return createResponse(JSON.stringify({
          status: {
            state: 'RUNNING'
          }
        }));
      }
    }
  });

  loadScripts(context, ['apps_script_tools/database/databricks/runDatabricksSql.js']);

  const status = context.astGetDatabricksSqlStatus(
    {
      host: 'https://dbc.example.com/',
      token: 'token'
    },
    'stmt-1'
  );

  assert.match(calledUrl, /https:\/\/dbc\.example\.com\/api\/2\.0\/sql\/statements\/stmt-1/);
  assert.equal(status.provider, 'databricks');
  assert.equal(status.executionId, 'stmt-1');
  assert.equal(status.state, 'RUNNING');
  assert.equal(status.complete, false);
});

test('astCancelDatabricksSql posts cancel and returns latest status', () => {
  const calls = [];
  const context = createGasContext({
    UrlFetchApp: {
      fetch: (url, options = {}) => {
        calls.push({ url, options });

        if (String(url).endsWith('/cancel')) {
          return createResponse('{}');
        }

        return createResponse(JSON.stringify({
          status: {
            state: 'CANCELED'
          }
        }));
      }
    }
  });

  loadScripts(context, ['apps_script_tools/database/databricks/runDatabricksSql.js']);

  const status = context.astCancelDatabricksSql(
    {
      host: 'dbc.example.com',
      token: 'token'
    },
    'stmt-2'
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/stmt-2\/cancel$/);
  assert.equal(calls[0].options.method, 'post');
  assert.equal(status.canceled, true);
  assert.equal(status.state, 'CANCELED');
});

test('astCancelDatabricksSql throws when cancel endpoint returns non-2xx', () => {
  const context = createGasContext({
    UrlFetchApp: {
      fetch: url => {
        if (String(url).endsWith('/cancel')) {
          return createResponse(JSON.stringify({ message: 'forbidden' }), 403);
        }

        return createResponse(JSON.stringify({
          status: {
            state: 'RUNNING'
          }
        }), 200);
      }
    }
  });

  loadScripts(context, ['apps_script_tools/database/databricks/runDatabricksSql.js']);

  assert.throws(
    () => context.astCancelDatabricksSql(
      {
        host: 'dbc.example.com',
        token: 'token'
      },
      'stmt-3'
    ),
    error => {
      assert.equal(error.name, 'DatabricksSqlError');
      assert.equal(error.details.statusCode, 403);
      return true;
    }
  );
});
