import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadMessagingScripts(context, { includeAst = false } = {}) {
  const paths = [];

  paths.push(...listScriptFiles('apps_script_tools/config/general'));
  paths.push('apps_script_tools/config/Config.js');

  paths.push(...listScriptFiles('apps_script_tools/cache/general'));
  paths.push(...listScriptFiles('apps_script_tools/cache/backends'));
  paths.push('apps_script_tools/cache/Cache.js');

  paths.push(...listScriptFiles('apps_script_tools/jobs/general'));
  paths.push('apps_script_tools/jobs/Jobs.js');

  paths.push(...listScriptFiles('apps_script_tools/telemetry/general'));
  paths.push('apps_script_tools/telemetry/Telemetry.js');

  paths.push(...listScriptFiles('apps_script_tools/messaging'));

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
