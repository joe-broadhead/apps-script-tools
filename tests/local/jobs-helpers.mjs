import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadJobsScripts(context, { includeAst = false } = {}) {
  const paths = [];

  paths.push(...listScriptFiles('apps_script_tools/jobs/general'));
  paths.push('apps_script_tools/jobs/Jobs.js');

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
