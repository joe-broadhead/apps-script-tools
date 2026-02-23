import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

function createResponse(body = '{}') {
  return {
    getContentText: () => body
  };
}

test('getBigQuerySqlStatus maps DONE state to SUCCEEDED', () => {
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

  const status = context.getBigQuerySqlStatus(
    { projectId: 'project-1' },
    'job-1'
  );

  assert.equal(status.provider, 'bigquery');
  assert.equal(status.executionId, 'job-1');
  assert.equal(status.state, 'SUCCEEDED');
  assert.equal(status.complete, true);
});

test('cancelBigQuerySql delegates to BigQuery.Jobs.cancel', () => {
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

  const status = context.cancelBigQuerySql(
    { projectId: 'project-1' },
    'job-2'
  );

  assert.equal(called.projectId, 'project-1');
  assert.equal(called.jobId, 'job-2');
  assert.equal(status.canceled, true);
});

test('getDatabricksSqlStatus returns normalized statement status', () => {
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

  const status = context.getDatabricksSqlStatus(
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

test('cancelDatabricksSql posts cancel and returns latest status', () => {
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

  const status = context.cancelDatabricksSql(
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
