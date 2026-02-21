import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext, loadScripts } from './helpers.mjs';

test('runBigQuerySql returns empty DataFrame with schema columns', () => {
  const context = createGasContext({
    BigQuery: {
      Jobs: {
        query: () => ({
          jobReference: { jobId: 'job-1' },
          jobComplete: true,
          schema: {
            fields: [{ name: 'id' }, { name: 'name' }]
          },
          rows: undefined
        }),
        getQueryResults: () => ({
          jobComplete: true,
          schema: {
            fields: [{ name: 'id' }, { name: 'name' }]
          },
          rows: undefined
        })
      }
    }
  });

  loadCoreDataContext(context);
  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/bigQuery/runBigQuerySql.js'
  ]);

  const result = context.runBigQuerySql('select id, name from users', { projectId: 'proj' });

  assert.equal(result instanceof context.DataFrame, true);
  assert.equal(JSON.stringify(result.columns), JSON.stringify(['id', 'name']));
  assert.equal(result.len(), 0);
});

test('runBigQuerySql collects paginated rows when first page has no rows', () => {
  const context = createGasContext({
    BigQuery: {
      Jobs: {
        query: () => ({
          jobReference: { jobId: 'job-1' },
          jobComplete: true,
          schema: {
            fields: [{ name: 'id' }, { name: 'name' }]
          },
          rows: undefined,
          pageToken: 'next-page'
        }),
        getQueryResults: (_projectId, _jobId, queryOptions = null) => {
          if (queryOptions && queryOptions.pageToken === 'next-page') {
            return {
              jobComplete: true,
              schema: {
                fields: [{ name: 'id' }, { name: 'name' }]
              },
              rows: [{ f: [{ v: '1' }, { v: 'Alice' }] }]
            };
          }

          return {
            jobComplete: true,
            schema: {
              fields: [{ name: 'id' }, { name: 'name' }]
            },
            rows: undefined
          };
        }
      }
    }
  });

  loadCoreDataContext(context);
  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/bigQuery/runBigQuerySql.js'
  ]);

  const result = context.runBigQuerySql('select id, name from users', { projectId: 'proj' });

  assert.equal(result.len(), 1);
  assert.equal(
    JSON.stringify(result.toRecords()),
    JSON.stringify([{ id: '1', name: 'Alice' }])
  );
});

test('runBigQuerySql throws timeout errors when query polling exceeds maxWaitMs', () => {
  let sleepCount = 0;
  const baseContext = createGasContext();

  const context = createGasContext({
    Utilities: {
      ...baseContext.Utilities,
      sleep: () => {
        sleepCount += 1;
      }
    },
    BigQuery: {
      Jobs: {
        query: () => ({
          jobReference: { jobId: 'job-timeout' },
          jobComplete: false,
          schema: { fields: [] }
        }),
        getQueryResults: () => ({
          jobComplete: false,
          schema: { fields: [] }
        })
      }
    }
  });

  loadCoreDataContext(context);
  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/bigQuery/runBigQuerySql.js'
  ]);

  assert.throws(() => {
    context.runBigQuerySql(
      'select * from users',
      { projectId: 'proj' },
      {},
      { maxWaitMs: 1000, pollIntervalMs: 250 }
    );
  }, /timed out after 1000ms/);

  assert.equal(sleepCount, 4);
});

test('runBigQuerySql rejects pollIntervalMs greater than maxWaitMs', () => {
  const context = createGasContext();

  loadCoreDataContext(context);
  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/bigQuery/runBigQuerySql.js'
  ]);

  assert.throws(() => {
    context.runBigQuerySql(
      'select 1',
      { projectId: 'proj' },
      {},
      { maxWaitMs: 100, pollIntervalMs: 200 }
    );
  }, /options\.pollIntervalMs cannot be greater than options\.maxWaitMs/);
});
