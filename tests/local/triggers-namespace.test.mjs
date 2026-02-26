import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadTriggersScripts } from './triggers-helpers.mjs';

test('AST.Triggers namespace is exposed with helper methods', () => {
  const context = createGasContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
        getProperties: () => ({}),
        setProperty: () => {},
        setProperties: () => {},
        deleteProperty: () => {}
      })
    }
  });

  loadTriggersScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.Triggers.run, 'function');
  assert.equal(typeof context.AST.Triggers.upsert, 'function');
  assert.equal(typeof context.AST.Triggers.list, 'function');
  assert.equal(typeof context.AST.Triggers.delete, 'function');
  assert.equal(typeof context.AST.Triggers.runNow, 'function');
  assert.equal(typeof context.AST.Triggers.configure, 'function');
  assert.equal(typeof context.AST.Triggers.getConfig, 'function');
  assert.equal(typeof context.AST.Triggers.clearConfig, 'function');
  assert.equal(typeof context.astTriggersDispatch, 'function');
});
