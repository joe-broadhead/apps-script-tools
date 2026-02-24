import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadTelemetryScripts(context, { includeAst = false } = {}) {
  const paths = [];

  paths.push(...listScriptFiles('apps_script_tools/telemetry/general'));
  paths.push(
    'apps_script_tools/telemetry/Telemetry.js',
    'apps_script_tools/telemetry/TelemetryHelpers.js'
  );

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
