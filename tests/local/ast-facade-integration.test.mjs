import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, listScriptFiles, loadCoreDataContext, loadScripts } from './helpers.mjs';

const FACADE_MODULE_DIRS = [
  'apps_script_tools/workspace',
  'apps_script_tools/config',
  'apps_script_tools/runtime',
  'apps_script_tools/cache',
  'apps_script_tools/storage',
  'apps_script_tools/secrets',
  'apps_script_tools/telemetry',
  'apps_script_tools/jobs',
  'apps_script_tools/triggers',
  'apps_script_tools/chat',
  'apps_script_tools/ai',
  'apps_script_tools/rag',
  'apps_script_tools/dbt',
  'apps_script_tools/github',
  'apps_script_tools/database'
];

const FACADE_FILES = new Set([
  'apps_script_tools/config/Config.js',
  'apps_script_tools/runtime/Runtime.js',
  'apps_script_tools/cache/Cache.js',
  'apps_script_tools/storage/Storage.js',
  'apps_script_tools/secrets/Secrets.js',
  'apps_script_tools/telemetry/Telemetry.js',
  'apps_script_tools/jobs/Jobs.js',
  'apps_script_tools/triggers/Triggers.js',
  'apps_script_tools/chat/Chat.js',
  'apps_script_tools/ai/AI.js',
  'apps_script_tools/rag/RAG.js',
  'apps_script_tools/dbt/DBT.js',
  'apps_script_tools/github/GitHub.js'
]);

function orderedModuleFiles(dir) {
  const files = listScriptFiles(dir);
  const internals = [];
  const facades = [];
  files.forEach(file => {
    if (FACADE_FILES.has(file)) {
      facades.push(file);
    } else {
      internals.push(file);
    }
  });
  return [...internals, ...facades];
}

function loadFacadeContext() {
  const context = createGasContext();
  loadCoreDataContext(context);

  const modulePaths = [];
  FACADE_MODULE_DIRS.forEach(dir => {
    modulePaths.push(...orderedModuleFiles(dir));
  });

  const uniqueModulePaths = [...new Set(modulePaths)];
  loadScripts(context, uniqueModulePaths);
  loadScripts(context, ['apps_script_tools/AST.js']);
  return context;
}

test('AST facade composes key namespaces in a single VM context', () => {
  const context = loadFacadeContext();
  const AST = context.AST;
  assert.ok(AST, 'AST is not available');

  [
    'Utils',
    'Series',
    'DataFrame',
    'GroupBy',
    'Sheets',
    'Drive',
    'Storage',
    'Secrets',
    'Cache',
    'Config',
    'Runtime',
    'Telemetry',
    'TelemetryHelpers',
    'Jobs',
    'Triggers',
    'Chat',
    'AI',
    'RAG',
    'DBT',
    'GitHub',
    'Sql'
  ].forEach(key => {
    assert.ok(AST[key], `AST.${key} is missing`);
  });
});

test('AST facade namespace methods are callable in composed context', () => {
  const context = loadFacadeContext();
  const AST = context.AST;

  assert.equal(AST.Utils.arraySum([1, 2, 3, 4]), 10);

  const frame = AST.DataFrame.fromRecords([
    { id: 1, value: 2 },
    { id: 2, value: 3 }
  ]);
  assert.equal(frame.len(), 2);

  AST.Cache.clearConfig();
  AST.Cache.configure({
    CACHE_BACKEND: 'memory',
    CACHE_NAMESPACE: 'ast_facade_smoke'
  });
  AST.Cache.set('facade:key', { ok: true });
  const cached = AST.Cache.get('facade:key');
  assert.ok(cached && cached.ok === true);

  const spanId = AST.Telemetry.startSpan('ast.facade.integration');
  const ended = AST.Telemetry.endSpan(spanId, { status: 'ok' });
  assert.equal(ended.status, 'ok');

  assert.ok(AST.AI.providers().length > 0);
  assert.ok(AST.RAG.embeddingProviders().length > 0);
  assert.ok(AST.DBT.providers().includes('drive'));
  assert.ok(AST.Storage.providers().includes('gcs'));
  assert.ok(AST.GitHub.operations().includes('get_repository'));

  assert.equal(typeof AST.Chat.ThreadStore.create, 'function');
  assert.equal(typeof AST.Jobs.enqueue, 'function');
  assert.equal(typeof AST.Triggers.upsert, 'function');
  assert.equal(typeof AST.Sql.run, 'function');
});
