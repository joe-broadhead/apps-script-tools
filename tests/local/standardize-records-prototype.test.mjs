import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadCoreDataContext } from './helpers.mjs';

test('standardizeRecords ignores inherited enumerable properties', () => {
  const context = createGasContext({
    loadDatabricksTable: () => {},
    loadBigQueryTable: () => {}
  });

  loadCoreDataContext(context);

  const proto = { inherited: 'ignore-me' };
  const rec1 = Object.create(proto);
  rec1.id = 1;

  const rec2 = { id: 2 };
  const standardized = context.standardizeRecords([rec1, rec2]);

  assert.equal(JSON.stringify(Object.keys(standardized[0])), JSON.stringify(['id']));
  assert.equal(JSON.stringify(Object.keys(standardized[1])), JSON.stringify(['id']));
  assert.equal(Object.prototype.hasOwnProperty.call(standardized[0], 'inherited'), false);
});
