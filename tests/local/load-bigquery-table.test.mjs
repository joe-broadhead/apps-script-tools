import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

const SCRIPT = 'apps_script_tools/database/bigQuery/loadBigQueryTable.js';

function baseConfig(mode = 'insert') {
  return {
    arrays: [
      ['id', 'name'],
      [1, 'Alice']
    ],
    tableName: 'dataset.users',
    tableSchema: { id: 'INT64', name: 'STRING' },
    mode,
    bigquery_parameters: { projectId: 'project-id' },
    options: {
      maxWaitMs: 10000,
      pollIntervalMs: 500
    }
  };
}

test('loadBigQueryTable rejects unsupported load modes', () => {
  const context = createGasContext();
  loadScripts(context, [SCRIPT]);

  assert.throws(
    () => context.loadBigQueryTable(baseConfig('upsert')),
    /Invalid BigQuery load mode/
  );
});

test('loadBigQueryTable throws when insert returns immediate errorResult', () => {
  const context = createGasContext({
    BigQuery: {
      Jobs: {
        insert: () => ({
          jobReference: { jobId: 'job-1' },
          status: { state: 'DONE', errorResult: { message: 'permission denied' } }
        }),
        get: () => ({ status: { state: 'DONE' } })
      }
    }
  });

  loadScripts(context, [SCRIPT]);

  assert.throws(
    () => context.loadBigQueryTable(baseConfig('insert')),
    /BigQuery load failed/
  );
});

test('loadBigQueryTable throws timeout error when polling exceeds maxWaitMs', () => {
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
        insert: () => ({
          jobReference: { jobId: 'job-1' },
          status: { state: 'PENDING' }
        }),
        get: () => ({ status: { state: 'RUNNING' } })
      }
    }
  });

  loadScripts(context, [SCRIPT]);

  const config = baseConfig('insert');
  config.options = { maxWaitMs: 1000, pollIntervalMs: 250 };

  assert.throws(
    () => context.loadBigQueryTable(config),
    /BigQuery load timed out after 1000ms/
  );

  assert.equal(JSON.stringify(sleepDurations), JSON.stringify([250, 250, 250, 250]));
});

test('loadBigQueryTable rejects pollIntervalMs greater than maxWaitMs', () => {
  const context = createGasContext();
  loadScripts(context, [SCRIPT]);

  const config = baseConfig('insert');
  config.options = { maxWaitMs: 100, pollIntervalMs: 200 };

  assert.throws(
    () => context.loadBigQueryTable(config),
    /options\.pollIntervalMs cannot be greater than options\.maxWaitMs/
  );
});

test('loadBigQueryTable caps final sleep to remaining timeout budget', () => {
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
        insert: () => ({
          jobReference: { jobId: 'job-1' },
          status: { state: 'PENDING' }
        }),
        get: () => ({ status: { state: 'RUNNING' } })
      }
    }
  });

  loadScripts(context, [SCRIPT]);

  const config = baseConfig('insert');
  config.options = { maxWaitMs: 1000, pollIntervalMs: 600 };

  assert.throws(
    () => context.loadBigQueryTable(config),
    /BigQuery load timed out after 1000ms/
  );

  assert.equal(JSON.stringify(sleepDurations), JSON.stringify([600, 400]));
});
