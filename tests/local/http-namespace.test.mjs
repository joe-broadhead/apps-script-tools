import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadHttpScripts } from './http-helpers.mjs';

test('AST exposes Http namespace and methods', () => {
  const context = createGasContext();
  loadHttpScripts(context, { includeAst: true });

  assert.ok(context.AST && context.AST.Http, 'AST.Http should be available');

  const requiredMethods = [
    'request',
    'requestBatch',
    'capabilities',
    'configure',
    'getConfig',
    'clearConfig'
  ];

  requiredMethods.forEach(method => {
    assert.equal(typeof context.AST.Http[method], 'function', `AST.Http.${method} should be a function`);
  });
});

test('AST.Http.capabilities returns request and batch contracts', () => {
  const context = createGasContext();
  loadHttpScripts(context, { includeAst: true });

  const capabilities = context.AST.Http.capabilities();
  assert.equal(capabilities.request.retries, true);
  assert.equal(capabilities.request_batch.supported, true);
});
