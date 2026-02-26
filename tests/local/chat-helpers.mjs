import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadChatScripts(context, { includeAst = false } = {}) {
  const paths = [
    'apps_script_tools/config/Config.js'
  ];

  paths.push(...listScriptFiles('apps_script_tools/cache/general'));
  paths.push(...listScriptFiles('apps_script_tools/cache/backends'));
  paths.push('apps_script_tools/cache/Cache.js');

  paths.push(...listScriptFiles('apps_script_tools/chat/general'));
  paths.push('apps_script_tools/chat/Chat.js');

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
