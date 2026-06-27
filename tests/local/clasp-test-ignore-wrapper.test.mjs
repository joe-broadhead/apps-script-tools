import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTestClaspArgs,
  validateTestScriptBinding
} from '../../scripts/with-test-claspignore.mjs';

test('validateTestScriptBinding requires an explicit test script id', () => {
  const error = validateTestScriptBinding({
    activeScriptId: 'test-script',
    expectedTestScriptId: '',
    productionScriptId: 'prod-script'
  });

  assert.match(error, /GAS_TEST_SCRIPT_ID/);
});

test('validateTestScriptBinding requires an explicit production script id', () => {
  const error = validateTestScriptBinding({
    activeScriptId: 'test-script',
    expectedTestScriptId: 'test-script',
    productionScriptId: ''
  });

  assert.match(error, /GAS_PRODUCTION_SCRIPT_ID|GAS_SCRIPT_ID/);
});

test('validateTestScriptBinding rejects mismatched active clasp binding', () => {
  const error = validateTestScriptBinding({
    activeScriptId: 'prod-script',
    expectedTestScriptId: 'test-script',
    productionScriptId: 'prod-script'
  });

  assert.match(error, /must match GAS_TEST_SCRIPT_ID/);
});

test('validateTestScriptBinding rejects shared production and test projects', () => {
  const error = validateTestScriptBinding({
    activeScriptId: 'prod-script',
    expectedTestScriptId: 'prod-script',
    productionScriptId: 'prod-script'
  });

  assert.match(error, /separate Apps Script project/);
});

test('validateTestScriptBinding accepts a distinct active test project', () => {
  const error = validateTestScriptBinding({
    activeScriptId: 'test-script',
    expectedTestScriptId: 'test-script',
    productionScriptId: 'prod-script'
  });

  assert.equal(error, null);
});

test('buildTestClaspArgs passes the test ignore file as a clasp global option', () => {
  assert.deepEqual(
    buildTestClaspArgs('clasp', ['push', '--force'], '.claspignore.test'),
    ['--ignore', '.claspignore.test', 'push', '--force']
  );
});

test('buildTestClaspArgs leaves non-clasp commands unchanged', () => {
  assert.deepEqual(
    buildTestClaspArgs('node', ['script.mjs'], '.claspignore.test'),
    ['script.mjs']
  );
});
