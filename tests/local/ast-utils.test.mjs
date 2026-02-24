import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, listScriptFiles, loadScripts } from './helpers.mjs';

test('AST.Utils exposes utility functions like arraySum', () => {
  const context = createGasContext();
  const utilityFiles = listScriptFiles('apps_script_tools/utilities');

  loadScripts(context, [...utilityFiles, 'apps_script_tools/AST.js']);

  assert.equal(typeof context.AST.Utils.arraySum, 'function');
  assert.equal(context.AST.Utils.arraySum([1, 2, 3, 4]), 10);
});

test('AST.Utils date helpers are callable', () => {
  const context = createGasContext();
  const utilityFiles = listScriptFiles('apps_script_tools/utilities');

  loadScripts(context, [...utilityFiles, 'apps_script_tools/AST.js']);

  const base = new Date('2024-01-10T00:00:00.000Z');
  const out = context.AST.Utils.dateAdd(base, 2, 'days');

  assert.equal(out.toISOString(), '2024-01-12T00:00:00.000Z');
});

test('AST namespace exposes Chat.ThreadStore factory when chat module is loaded', () => {
  const context = createGasContext();
  const utilityFiles = listScriptFiles('apps_script_tools/utilities');
  const cacheGeneral = listScriptFiles('apps_script_tools/cache/general');
  const cacheBackends = listScriptFiles('apps_script_tools/cache/backends');
  const chatGeneral = listScriptFiles('apps_script_tools/chat/general');

  loadScripts(context, [
    ...utilityFiles,
    ...cacheGeneral,
    ...cacheBackends,
    'apps_script_tools/cache/Cache.js',
    ...chatGeneral,
    'apps_script_tools/chat/Chat.js',
    'apps_script_tools/AST.js'
  ]);

  assert.equal(typeof context.AST.Chat.configure, 'function');
  assert.equal(typeof context.AST.Chat.ThreadStore.create, 'function');
});
