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
