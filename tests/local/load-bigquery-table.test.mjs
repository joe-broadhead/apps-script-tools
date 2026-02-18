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
    bigquery_parameters: { projectId: 'project-id' }
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
