import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

test('runSqlQuery rejects placeholders unless unsafe option is enabled', () => {
  const context = createGasContext({
    runDatabricksSql: () => ({ provider: 'databricks' }),
    runBigQuerySql: () => ({ provider: 'bigquery' })
  });

  loadScripts(context, [
    'apps_script_tools/database/general/validateSqlRequest.js',
    'apps_script_tools/database/general/sqlProviderAdapters.js',
    'apps_script_tools/database/general/runSqlQuery.js'
  ]);

  assert.throws(() => {
    context.runSqlQuery({
      provider: 'bigquery',
      sql: 'select * from t where region = {{region}}',
      parameters: { projectId: 'project' },
      placeholders: { region: 'north' }
    });
  }, /Unsafe placeholder interpolation is disabled/);
});
