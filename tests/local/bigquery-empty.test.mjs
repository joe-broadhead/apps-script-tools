import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext, loadScripts } from './helpers.mjs';

test('astRunBigQuerySql returns empty DataFrame with schema columns', () => {
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

  const result = context.astRunBigQuerySql('select id, name from users', { projectId: 'proj' });

  assert.equal(result instanceof context.DataFrame, true);
  assert.equal(JSON.stringify(result.columns), JSON.stringify(['id', 'name']));
  assert.equal(result.len(), 0);
});

test('astRunBigQuerySql collects paginated rows when first page has no rows', () => {
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

  const result = context.astRunBigQuerySql('select id, name from users', { projectId: 'proj' });

  assert.equal(result.len(), 1);
  assert.equal(
    JSON.stringify(result.toRecords()),
    JSON.stringify([{ id: '1', name: 'Alice' }])
  );
});

test('astRunBigQuerySql throws timeout errors when query polling exceeds maxWaitMs', () => {
  let fakeNow = 0;
  const sleepDurations = [];
  class FakeDate extends Date {
    static now() {
      return fakeNow;
    }
  }
  const baseContext = createGasContext();

  const context = createGasContext({
    Date: FakeDate,
    Utilities: {
      ...baseContext.Utilities,
      sleep: (ms) => {
        sleepDurations.push(ms);
        fakeNow += ms;
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
    context.astRunBigQuerySql(
      'select * from users',
      { projectId: 'proj' },
      {},
      { maxWaitMs: 1000, pollIntervalMs: 250 }
    );
  }, /timed out after 1000ms/);

  assert.equal(JSON.stringify(sleepDurations), JSON.stringify([250, 250, 250, 250]));
});

test('astRunBigQuerySql rejects pollIntervalMs greater than maxWaitMs', () => {
  const context = createGasContext();

  loadCoreDataContext(context);
  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/bigQuery/runBigQuerySql.js'
  ]);

  assert.throws(() => {
    context.astRunBigQuerySql(
      'select 1',
      { projectId: 'proj' },
      {},
      { maxWaitMs: 100, pollIntervalMs: 200 }
    );
  }, /options\.pollIntervalMs cannot be greater than options\.maxWaitMs/);
});

test('astRunBigQuerySql caps final sleep to remaining timeout budget', () => {
  let fakeNow = 0;
  const sleepDurations = [];
  class FakeDate extends Date {
    static now() {
      return fakeNow;
    }
  }

  const baseContext = createGasContext();
  const context = createGasContext({
    Date: FakeDate,
    Utilities: {
      ...baseContext.Utilities,
      sleep: (ms) => {
        sleepDurations.push(ms);
        fakeNow += ms;
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
    context.astRunBigQuerySql(
      'select * from users',
      { projectId: 'proj' },
      {},
      { maxWaitMs: 1000, pollIntervalMs: 600 }
    );
  }, /timed out after 1000ms/);

  assert.equal(JSON.stringify(sleepDurations), JSON.stringify([600, 400]));
});
