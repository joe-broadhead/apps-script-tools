import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext } from './helpers.mjs';
import { loadMessagingScripts } from './messaging-helpers.mjs';

test('AST exposes Messaging namespace with expected public surface', () => {
  const context = createGasContext();
  loadMessagingScripts(context, { includeAst: true });

  assert.equal(typeof context.AST.Messaging, 'object');
  assert.equal(typeof context.AST.Messaging.run, 'function');
  assert.equal(typeof context.AST.Messaging.operations, 'function');
  assert.equal(typeof context.AST.Messaging.capabilities, 'function');
  assert.equal(typeof context.AST.Messaging.configure, 'function');
  assert.equal(typeof context.AST.Messaging.getConfig, 'function');
  assert.equal(typeof context.AST.Messaging.clearConfig, 'function');

  const emailMethods = [
    'send',
    'sendBatch',
    'createDraft',
    'sendDraft',
    'listThreads',
    'getThread',
    'searchMessages',
    'getMessage',
    'listLabels',
    'updateMessageLabels'
  ];
  emailMethods.forEach(method => {
    assert.equal(typeof context.AST.Messaging.email[method], 'function');
  });

  const chatMethods = ['send', 'sendBatch', 'getMessage', 'listMessages'];
  chatMethods.forEach(method => {
    assert.equal(typeof context.AST.Messaging.chat[method], 'function');
  });

  const trackingMethods = ['buildPixelUrl', 'wrapLinks', 'recordEvent', 'handleWebEvent'];
  trackingMethods.forEach(method => {
    assert.equal(typeof context.AST.Messaging.tracking[method], 'function');
  });

  const logMethods = ['list', 'get', 'delete'];
  logMethods.forEach(method => {
    assert.equal(typeof context.AST.Messaging.logs[method], 'function');
  });
});
