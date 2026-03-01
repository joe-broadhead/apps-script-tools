import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadHttpScripts(context, { includeAst = false } = {}) {
  const paths = [
    ...listScriptFiles('apps_script_tools/config/general'),
    'apps_script_tools/config/Config.js',
    ...listScriptFiles('apps_script_tools/http/general'),
    'apps_script_tools/http/Http.js'
  ];

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
