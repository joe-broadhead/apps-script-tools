import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadCoreDataContext } from './helpers.mjs';

function createContext() {
  const context = createGasContext({
    astLoadDatabricksTable: () => {},
    astLoadBigQueryTable: () => {}
  });
  loadCoreDataContext(context);
  return context;
}

test('DataFrame.join defaults to index join and applies deterministic suffix handling', () => {
  const context = createContext();

  const left = context.DataFrame.fromRecords([
    { id: 1, value: 10 },
    { id: 2, value: 20 }
  ]);
  left.index = ['a', 'b'];

  const right = context.DataFrame.fromRecords([
    { value: 100, flag: true },
    { value: 200, flag: false }
  ]);
  right.index = ['a', 'c'];

  const out = left.join(right, {
    how: 'outer',
    lsuffix: '_l',
    rsuffix: '_r'
  });

  assert.equal(JSON.stringify(out.columns), JSON.stringify(['id', 'value_l', 'value_r', 'flag']));
  assert.equal(JSON.stringify(out.index), JSON.stringify(['a', 'b', 'c']));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { id: 1, value_l: 10, value_r: 100, flag: true },
    { id: 2, value_l: 20, value_r: null, flag: null },
    { id: null, value_l: null, value_r: 200, flag: false }
  ]));
});

test('DataFrame.join supports explicit on-column joins', () => {
  const context = createContext();

  const left = context.DataFrame.fromRecords([
    { user_id: 1, city: 'AMS' },
    { user_id: 2, city: 'PAR' },
    { user_id: 3, city: 'MAD' }
  ]);

  const right = context.DataFrame.fromRecords([
    { user_id: 1, tier: 'gold' },
    { user_id: 3, tier: 'silver' }
  ]);

  const out = left.join(right, {
    how: 'inner',
    on: 'user_id'
  });

  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { user_id: 1, city: 'AMS', tier: 'gold' },
    { user_id: 3, city: 'MAD', tier: 'silver' }
  ]));
});

test('DataFrame.join rejects overlapping columns when suffixes are identical', () => {
  const context = createContext();

  const left = context.DataFrame.fromRecords([{ key: 1, value: 'L' }]);
  const right = context.DataFrame.fromRecords([{ key: 1, value: 'R' }]);

  assert.throws(
    () => left.join(right, { on: 'key', lsuffix: '_dup', rsuffix: '_dup' }),
    /requires different lsuffix\/rsuffix/
  );
});

test('DataFrame.join treats undefined key options as omitted and defaults to index join', () => {
  const context = createContext();

  const left = context.DataFrame.fromRecords([
    { id: 1, left_value: 'L1' },
    { id: 2, left_value: 'L2' }
  ]);
  left.index = ['i1', 'i2'];

  const right = context.DataFrame.fromRecords([
    { id: 10, right_value: 'R1' },
    { id: 20, right_value: 'R2' }
  ]);
  right.index = ['i1', 'i3'];

  const out = left.join(right, {
    on: undefined,
    leftOn: undefined,
    rightOn: undefined,
    lsuffix: '_l',
    rsuffix: '_r'
  });

  assert.equal(JSON.stringify(out.index), JSON.stringify(['i1', 'i2']));
  assert.deepEqual(JSON.parse(JSON.stringify(out.toRecords())), [
    { id_l: 1, left_value: 'L1', id_r: 10, right_value: 'R1' },
    { id_l: 2, left_value: 'L2', id_r: null, right_value: null }
  ]);
});

test('DataFrame.join index semantics distinguish null/undefined/symbol and support invalid Date labels', () => {
  const context = createContext();

  const left = context.DataFrame.fromRecords([
    { left_value: 'L-null' },
    { left_value: 'L-undef' },
    { left_value: 'L-symbol' },
    { left_value: 'L-invalid-date' }
  ]);
  const right = context.DataFrame.fromRecords([
    { right_value: 'R-null' },
    { right_value: 'R-undef' },
    { right_value: 'R-symbol' },
    { right_value: 'R-invalid-date' }
  ]);

  const leftSymbol = Symbol('k');
  const rightSymbol = Symbol('k');
  const leftInvalidDate = new Date('invalid-left');
  const rightInvalidDate = new Date('invalid-right');
  left.index = [null, undefined, leftSymbol, leftInvalidDate];
  right.index = [null, undefined, rightSymbol, rightInvalidDate];

  const out = left.join(right, { how: 'inner' });
  const records = JSON.parse(JSON.stringify(out.toRecords()));

  assert.equal(out.len(), 3);
  assert.equal(out.index[0], null);
  assert.equal(out.index[1], undefined);
  assert.equal(Number.isNaN(out.index[2].getTime()), true);
  assert.deepEqual(records, [
    { left_value: 'L-null', right_value: 'R-null' },
    { left_value: 'L-undef', right_value: 'R-undef' },
    { left_value: 'L-invalid-date', right_value: 'R-invalid-date' }
  ]);
});

test('DataFrame.join preserves right-side overlaps when using leftOn/rightOn keys', () => {
  const context = createContext();

  const left = context.DataFrame.fromRecords([
    { id: 1, left_value: 'L1' },
    { id: 2, left_value: 'L2' }
  ]);
  const right = context.DataFrame.fromRecords([
    { user_id: 1, id: 'RID1', right_value: 'R1' },
    { user_id: 2, id: 'RID2', right_value: 'R2' }
  ]);

  const out = left.join(right, {
    how: 'inner',
    leftOn: 'id',
    rightOn: 'user_id',
    lsuffix: '_l',
    rsuffix: '_r'
  });

  assert.deepEqual(JSON.parse(JSON.stringify(out.toRecords())), [
    { left_value: 'L1', id_l: 1, id_r: 'RID1', user_id: 1, right_value: 'R1' },
    { left_value: 'L2', id_l: 2, id_r: 'RID2', user_id: 2, right_value: 'R2' }
  ]);
});

test('DataFrame.join validates identical suffixes for leftOn/rightOn overlap cases', () => {
  const context = createContext();

  const left = context.DataFrame.fromRecords([
    { id: 1, left_value: 'L1' }
  ]);
  const right = context.DataFrame.fromRecords([
    { user_id: 1, id: 'RID1', right_value: 'R1' }
  ]);

  assert.throws(
    () => left.join(right, {
      how: 'inner',
      leftOn: 'id',
      rightOn: 'user_id',
      lsuffix: '_dup',
      rsuffix: '_dup'
    }),
    /requires different lsuffix\/rsuffix/
  );
});

test('DataFrame.pivotTable min aggregation handles mixed valid/invalid Date values deterministically', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { group: 'g1', bucket: 'b1', event_date: new Date('invalid') },
    { group: 'g1', bucket: 'b1', event_date: new Date('2024-01-01T00:00:00Z') }
  ]);

  const out = df.pivotTable({
    index: ['group'],
    columns: 'bucket',
    values: ['event_date'],
    aggFunc: 'min'
  });

  const valueColumn = out.columns.find(column => column !== 'group');
  const minValue = out.toRecords()[0][valueColumn];

  assert.equal(minValue instanceof Date, true);
  assert.equal(Number.isNaN(minValue.getTime()), false);
  assert.equal(minValue.toISOString(), '2024-01-01T00:00:00.000Z');
});

test('DataFrame.melt supports idVars/valueVars and can retain source index as a column', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 'u1', jan: 10, feb: 20 },
    { id: 'u2', jan: 30, feb: 40 }
  ]);
  df.index = ['row_a', 'row_b'];

  const out = df.melt({
    idVars: ['id'],
    valueVars: ['jan', 'feb'],
    varName: 'month',
    valueName: 'sales',
    ignoreIndex: false,
    indexName: 'source_index'
  });

  assert.equal(JSON.stringify(out.columns), JSON.stringify(['source_index', 'id', 'month', 'sales']));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { source_index: 'row_a', id: 'u1', month: 'jan', sales: 10 },
    { source_index: 'row_a', id: 'u1', month: 'feb', sales: 20 },
    { source_index: 'row_b', id: 'u2', month: 'jan', sales: 30 },
    { source_index: 'row_b', id: 'u2', month: 'feb', sales: 40 }
  ]));
});

test('DataFrame.melt defaults valueVars to non-id columns and preserves sparse values', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 'a', one: 1 },
    { id: 'b', two: 2 }
  ]);

  const out = df.melt({ idVars: 'id' });
  const records = out.toRecords();

  assert.equal(out.len(), 4);
  assert.equal(records[0].variable, 'one');
  assert.equal(records[1].variable, 'two');
  assert.equal(records[2].variable, 'one');
  assert.equal(records[3].variable, 'two');
  assert.equal(records[1].value, null);
  assert.equal(records[2].value, null);
});

test('DataFrame.melt rejects varName collisions with idVars', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { variable: 'keep', one: 1 }
  ]);

  assert.throws(
    () => df.melt({ idVars: 'variable' }),
    /conflict on 'variable'/
  );
});

test('DataFrame.explode preserves non-target columns and index semantics', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1, tags: ['a', 'b'] },
    { id: 2, tags: [] },
    { id: 3, tags: null }
  ]);
  df.index = ['r1', 'r2', 'r3'];

  const out = df.explode('tags');

  assert.equal(JSON.stringify(out.index), JSON.stringify(['r1', 'r1', 'r2', 'r3']));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { id: 1, tags: 'a' },
    { id: 1, tags: 'b' },
    { id: 2, tags: null },
    { id: 3, tags: null }
  ]));
});

test('DataFrame.explode supports ignoreIndex and preserveEmpty=false', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { id: 1, tags: ['a', 'b'] },
    { id: 2, tags: [] },
    { id: 3, tags: null }
  ]);

  const out = df.explode('tags', { ignoreIndex: true, preserveEmpty: false });

  assert.equal(JSON.stringify(out.index), JSON.stringify([0, 1, 2]));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { id: 1, tags: 'a' },
    { id: 1, tags: 'b' },
    { id: 3, tags: null }
  ]));
});

test('DataFrame.pivotTable supports multi-value aggregation and fillValue', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { region: 'EU', quarter: 'Q1', sales: 10, units: 1 },
    { region: 'EU', quarter: 'Q2', sales: 20, units: 2 },
    { region: 'US', quarter: 'Q1', sales: 5, units: 3 }
  ]);

  const out = df.pivotTable({
    index: 'region',
    columns: 'quarter',
    values: ['sales', 'units'],
    aggFunc: 'sum',
    fillValue: 0
  });

  assert.equal(JSON.stringify(out.columns), JSON.stringify([
    'region',
    'string_q1_sales',
    'string_q1_units',
    'string_q2_sales',
    'string_q2_units'
  ]));
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { region: 'EU', string_q1_sales: 10, string_q1_units: 1, string_q2_sales: 20, string_q2_units: 2 },
    { region: 'US', string_q1_sales: 5, string_q1_units: 3, string_q2_sales: 0, string_q2_units: 0 }
  ]));
});

test('DataFrame.pivotTable supports aggFunc object with default fallback', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { region: 'EU', quarter: 'Q1', sales: 10, units: 1 },
    { region: 'EU', quarter: 'Q1', sales: 30, units: 4 }
  ]);

  const out = df.pivotTable({
    index: 'region',
    columns: 'quarter',
    values: ['sales', 'units'],
    aggFunc: { sales: 'mean', default: 'count' }
  });

  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { region: 'EU', string_q1_sales: 20, string_q1_units: 2 }
  ]));
});

test('DataFrame.pivotTable supports no index columns (global aggregation)', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { quarter: 'Q1', sales: 10 },
    { quarter: 'Q1', sales: 5 },
    { quarter: 'Q2', sales: 2 }
  ]);

  const out = df.pivotTable({
    columns: 'quarter',
    values: 'sales',
    aggFunc: 'sum',
    fillValue: 0
  });

  assert.equal(out.len(), 1);
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([
    { string_q1_sales: 15, string_q2_sales: 2 }
  ]));
});

test('DataFrame.pivotTable returns zero rows for empty inputs when index columns are provided', () => {
  const context = createContext();

  const df = context.DataFrame.fromColumns({
    region: [],
    quarter: [],
    sales: []
  });

  const out = df.pivotTable({
    index: 'region',
    columns: 'quarter',
    values: 'sales',
    aggFunc: 'sum',
    fillValue: 0
  });

  assert.equal(out.len(), 0);
  assert.equal(JSON.stringify(out.toRecords()), JSON.stringify([]));
});

test('DataFrame.pivotTable rejects duplicate output column names after normalization', () => {
  const context = createContext();

  const df = context.DataFrame.fromRecords([
    { region: 'EU', quarter: 'A-B', sales: 10 },
    { region: 'EU', quarter: 'A_B', sales: 20 }
  ]);

  assert.throws(
    () => df.pivotTable({
      index: 'region',
      columns: 'quarter',
      values: 'sales',
      aggFunc: 'sum'
    }),
    /duplicate output column name/
  );
});
