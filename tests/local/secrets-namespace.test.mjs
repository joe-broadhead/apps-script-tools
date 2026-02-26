import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadSecretsScripts } from './secrets-helpers.mjs';

test('AST exposes Secrets namespace and helper methods', () => {
  const context = createGasContext();
  loadSecretsScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.Secrets.run, 'function');
  assert.equal(typeof context.AST.Secrets.get, 'function');
  assert.equal(typeof context.AST.Secrets.set, 'function');
  assert.equal(typeof context.AST.Secrets.delete, 'function');
  assert.equal(typeof context.AST.Secrets.providers, 'function');
  assert.equal(typeof context.AST.Secrets.capabilities, 'function');
  assert.equal(typeof context.AST.Secrets.configure, 'function');
  assert.equal(typeof context.AST.Secrets.getConfig, 'function');
  assert.equal(typeof context.AST.Secrets.clearConfig, 'function');
  assert.equal(typeof context.AST.Secrets.resolveValue, 'function');

  assert.equal(
    JSON.stringify(context.AST.Secrets.providers()),
    JSON.stringify(['script_properties', 'secret_manager'])
  );
});
