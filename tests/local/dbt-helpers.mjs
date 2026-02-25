import { listScriptFiles, loadScripts } from './helpers.mjs';
import { loadStorageScripts } from './storage-helpers.mjs';

export function loadDbtScripts(context, { includeAst = false, includeStorage = true } = {}) {
  if (includeStorage) {
    loadStorageScripts(context, { includeAst: false });
  }

  const paths = [
    'apps_script_tools/config/Config.js',
    'apps_script_tools/dbt/schema/manifest_v12_schema.js'
  ];

  paths.push(...listScriptFiles('apps_script_tools/dbt/general'));
  paths.push('apps_script_tools/dbt/DBT.js');

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
