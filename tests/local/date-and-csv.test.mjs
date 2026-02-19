import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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

test('date utilities accept cross-context Date objects', () => {
  const context = createGasContext();
  loadScripts(context, [
    'apps_script_tools/utilities/date/convertDateToUnixTimestamp.js',
    'apps_script_tools/utilities/date/convertIntervalToDurationInMilliseconds.js',
    'apps_script_tools/utilities/date/convertMillisecondsToInterval.js',
    'apps_script_tools/utilities/date/dateAdd.js',
    'apps_script_tools/utilities/date/dateSub.js',
    'apps_script_tools/utilities/date/dateDiff.js'
  ]);

  const foreignDateA = vm.runInNewContext('new Date("2026-01-01T00:00:00Z")');
  const foreignDateB = vm.runInNewContext('new Date("2025-12-31T00:00:00Z")');
  assert.equal(foreignDateA instanceof Date, false);

  const timestamp = context.convertDateToUnixTimestamp(foreignDateA);
  const added = context.dateAdd(foreignDateA, 1, 'days');
  const subtracted = context.dateSub(foreignDateA, 1, 'days');
  const diff = context.dateDiff(foreignDateA, foreignDateB, 'days');

  assert.equal(timestamp, foreignDateA.getTime());
  assert.equal(added.toISOString(), '2026-01-02T00:00:00.000Z');
  assert.equal(subtracted.toISOString(), '2025-12-31T00:00:00.000Z');
  assert.equal(diff, 1);
});

test('convertRecordsToCsvFormat preserves falsy values', () => {
  const context = createGasContext();
  loadScripts(context, ['apps_script_tools/utilities/records/convertRecordsToCsvFormat.js']);

  const csv = context.convertRecordsToCsvFormat([{ id: 0, active: false, name: '' }]);

  assert.match(csv, /0/);
  assert.match(csv, /false/);
  assert.match(csv, /""/);
});
