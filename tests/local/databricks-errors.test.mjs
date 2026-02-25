import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

test('astRunDatabricksSql throws DatabricksSqlError on failed statements', () => {
  let callCount = 0;
  const context = createGasContext({
    UrlFetchApp: {
      fetch: () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            getContentText: () => JSON.stringify({ statement_id: 'stmt-1' })
          };
        }

        return {
          getContentText: () => JSON.stringify({
            status: {
              state: 'FAILED',
              error: { message: 'synthetic failure' }
            }
          })
        };
      }
    }
  });

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/databricks/runDatabricksSql.js'
  ]);

  assert.throws(
    () => context.astRunDatabricksSql('select 1', {
      host: 'dbc.example.com',
      sqlWarehouseId: 'warehouse-1',
      schema: 'default',
      token: 'token'
    }),
    error => {
      assert.equal(error.name, 'DatabricksSqlError');
      assert.match(error.message, /statement failed/i);
      assert.equal(error.provider, 'databricks');
      return true;
    }
  );
});

test('astRunDatabricksSql validates required Databricks parameters', () => {
  const context = createGasContext();

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/databricks/runDatabricksSql.js'
  ]);

  assert.throws(
    () => context.astRunDatabricksSql('select 1', {
      host: 'dbc.example.com',
      sqlWarehouseId: 'warehouse-1',
      schema: 'default'
    }),
    /Missing required Databricks parameters: token/
  );
});

test('astRunDatabricksSql rejects pollIntervalMs greater than maxWaitMs', () => {
  const context = createGasContext();

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/databricks/runDatabricksSql.js'
  ]);

  assert.throws(
    () => context.astRunDatabricksSql(
      'select 1',
      {
        host: 'dbc.example.com',
        sqlWarehouseId: 'warehouse-1',
        schema: 'default',
        token: 'token'
      },
      {},
      { maxWaitMs: 100, pollIntervalMs: 200 }
    ),
    /options\.pollIntervalMs cannot be greater than options\.maxWaitMs/
  );
});

test('astRunDatabricksSql times out based on elapsed maxWaitMs budget', () => {
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
    UrlFetchApp: {
      fetch: (_url, options = {}) => {
        if (options.method === 'post') {
          return {
            getContentText: () => JSON.stringify({ statement_id: 'stmt-timeout' })
          };
        }

        return {
          getContentText: () => JSON.stringify({
            status: {
              state: 'RUNNING'
            }
          })
        };
      }
    }
  });

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/databricks/runDatabricksSql.js'
  ]);

  assert.throws(
    () => context.astRunDatabricksSql(
      'select 1',
      {
        host: 'dbc.example.com',
        sqlWarehouseId: 'warehouse-1',
        schema: 'default',
        token: 'token'
      },
      {},
      { maxWaitMs: 1000, pollIntervalMs: 250 }
    ),
    /timed out after 1000ms/
  );

  assert.equal(JSON.stringify(sleepDurations), JSON.stringify([250, 250, 250, 250]));
});

test('astRunDatabricksSql caps final sleep to remaining timeout budget', () => {
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
    UrlFetchApp: {
      fetch: (_url, options = {}) => {
        if (options.method === 'post') {
          return {
            getContentText: () => JSON.stringify({ statement_id: 'stmt-timeout' })
          };
        }

        return {
          getContentText: () => JSON.stringify({
            status: {
              state: 'RUNNING'
            }
          })
        };
      }
    }
  });

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/databricks/runDatabricksSql.js'
  ]);

  assert.throws(
    () => context.astRunDatabricksSql(
      'select 1',
      {
        host: 'dbc.example.com',
        sqlWarehouseId: 'warehouse-1',
        schema: 'default',
        token: 'token'
      },
      {},
      { maxWaitMs: 1000, pollIntervalMs: 600 }
    ),
    /timed out after 1000ms/
  );

  assert.equal(JSON.stringify(sleepDurations), JSON.stringify([600, 400]));
});
