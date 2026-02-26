import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadSecretsScripts(context, { includeAst = false } = {}) {
  const paths = [
    'apps_script_tools/config/Config.js'
  ];

  paths.push(...listScriptFiles('apps_script_tools/secrets/general'));
  paths.push('apps_script_tools/secrets/Secrets.js');

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
