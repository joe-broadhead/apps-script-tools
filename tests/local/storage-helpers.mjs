import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadStorageScripts(context, { includeAst = false } = {}) {
  const paths = [];

  paths.push(...listScriptFiles('apps_script_tools/storage/general'));
  paths.push(
    'apps_script_tools/storage/gcs/gcsAuth.js',
    'apps_script_tools/storage/gcs/runGcsStorage.js',
    'apps_script_tools/storage/s3/s3SigV4.js',
    'apps_script_tools/storage/s3/runS3Storage.js',
    'apps_script_tools/storage/dbfs/runDbfsStorage.js',
    'apps_script_tools/storage/Storage.js'
  );

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
