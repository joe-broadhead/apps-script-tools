import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadTriggersScripts(context, { includeAst = false, includeJobs = false } = {}) {
  const paths = [
    ...listScriptFiles('apps_script_tools/config/general'),
    'apps_script_tools/config/Config.js'
  ];

  if (includeJobs) {
    paths.push(...listScriptFiles('apps_script_tools/jobs/general'));
    paths.push('apps_script_tools/jobs/Jobs.js');
  }

  paths.push(...listScriptFiles('apps_script_tools/triggers/general'));
  paths.push('apps_script_tools/triggers/Triggers.js');

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
