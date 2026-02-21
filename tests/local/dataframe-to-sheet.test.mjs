import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasContext, loadCoreDataContext } from './helpers.mjs';

function installEnhancedSheetMock(context) {
  const calls = [];

  context.EnhancedSheet = class EnhancedSheetMock {
    constructor(_sheet) {}

    overwriteSheet(values) {
      calls.push({ method: 'overwriteSheet', values });
      return this;
    }

    appendToSheet(values) {
      calls.push({ method: 'appendToSheet', values });
      return this;
    }

    prependToSheet(values, headerRows = 0) {
      calls.push({ method: 'prependToSheet', values, headerRows });
      return this;
    }

    overwriteRange(startRow, startCol, values) {
      calls.push({ method: 'overwriteRange', startRow, startCol, values });
      return this;
    }
  };

  return calls;
}

test('DataFrame.toSheet no-ops for empty DataFrame with no columns', () => {
  const context = createGasContext();
  loadCoreDataContext(context);
  const calls = installEnhancedSheetMock(context);

  const df = new context.DataFrame({});
  const out = df.toSheet({}, { mode: 'overwrite' });

  assert.equal(out, df);
  assert.equal(calls.length, 0);
});

test('DataFrame.toSheet append omits header by default', () => {
  const context = createGasContext();
  loadCoreDataContext(context);
  const calls = installEnhancedSheetMock(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);

  df.toSheet({}, { mode: 'append' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'appendToSheet');
  assert.equal(
    JSON.stringify(calls[0].values),
    JSON.stringify([
      [1, 'Alice'],
      [2, 'Bob']
    ])
  );
});

test('DataFrame.toSheet append can include header explicitly', () => {
  const context = createGasContext();
  loadCoreDataContext(context);
  const calls = installEnhancedSheetMock(context);

  const df = context.DataFrame.fromRecords([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);

  df.toSheet({}, { mode: 'append', includeHeader: true });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'appendToSheet');
  assert.equal(
    JSON.stringify(calls[0].values),
    JSON.stringify([
      ['id', 'name'],
      [1, 'Alice'],
      [2, 'Bob']
    ])
  );
});

test('DataFrame.toSheet overwrite writes header for columns with zero rows', () => {
  const context = createGasContext();
  loadCoreDataContext(context);
  const calls = installEnhancedSheetMock(context);

  const df = context.DataFrame.fromColumns({
    id: [],
    name: []
  });

  df.toSheet({}, { mode: 'overwrite' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'overwriteSheet');
  assert.equal(JSON.stringify(calls[0].values), JSON.stringify([['id', 'name']]));
});

test('DataFrame.toSheet overwriteRange requires start coordinates', () => {
  const context = createGasContext();
  loadCoreDataContext(context);
  installEnhancedSheetMock(context);

  const df = context.DataFrame.fromRecords([{ id: 1 }]);

  assert.throws(
    () => df.toSheet({}, { mode: 'overwriteRange' }),
    /requires 'startRow' and 'startCol'/
  );
});
