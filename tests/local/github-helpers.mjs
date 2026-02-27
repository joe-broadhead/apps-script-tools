import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadGitHubScripts(context, { includeAst = false } = {}) {
  const paths = [];

  paths.push(...listScriptFiles('apps_script_tools/github/general'));
  paths.push('apps_script_tools/github/GitHub.js');

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
