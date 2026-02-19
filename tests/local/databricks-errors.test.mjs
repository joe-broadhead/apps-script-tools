import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

test('runDatabricksSql throws DatabricksSqlError on failed statements', () => {
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
    () => context.runDatabricksSql('select 1', {
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

test('runDatabricksSql validates required Databricks parameters', () => {
  const context = createGasContext();

  loadScripts(context, [
    'apps_script_tools/database/general/replacePlaceHoldersInQuery.js',
    'apps_script_tools/database/databricks/runDatabricksSql.js'
  ]);

  assert.throws(
    () => context.runDatabricksSql('select 1', {
      host: 'dbc.example.com',
      sqlWarehouseId: 'warehouse-1',
      schema: 'default'
    }),
    /Missing required Databricks parameters: token/
  );
});
