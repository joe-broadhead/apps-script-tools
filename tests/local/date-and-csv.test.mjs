import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadScripts } from './helpers.mjs';

test('dateSub subtracts interval from date', () => {
  const context = createGasContext();
  loadScripts(context, [
    'apps_script_tools/utilities/date/convertDateToUnixTimestamp.js',
    'apps_script_tools/utilities/date/convertIntervalToDurationInMilliseconds.js',
    'apps_script_tools/utilities/date/dateSub.js'
  ]);

  const date = new context.Date('2024-01-03T00:00:00Z');
  const result = context.dateSub(date, 2, 'days');

  assert.equal(result.toISOString(), '2024-01-01T00:00:00.000Z');
});

test('convertRecordsToCsvFormat preserves falsy values', () => {
  const context = createGasContext();
  loadScripts(context, ['apps_script_tools/utilities/records/convertRecordsToCsvFormat.js']);

  const csv = context.convertRecordsToCsvFormat([{ id: 0, active: false, name: '' }]);

  assert.match(csv, /0/);
  assert.match(csv, /false/);
  assert.match(csv, /""/);
});
