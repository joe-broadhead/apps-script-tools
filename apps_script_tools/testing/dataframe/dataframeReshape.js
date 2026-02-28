DATAFRAME_RESHAPE_TESTS = [
  {
    description: 'DataFrame.join() should default to index join and preserve index labels',
    test: () => {
      const left = DataFrame.fromRecords([
        { id: 1, value: 10 },
        { id: 2, value: 20 }
      ]);
      left.index = ['a', 'b'];

      const right = DataFrame.fromRecords([
        { value: 100, flag: true },
        { value: 200, flag: false }
      ]);
      right.index = ['a', 'c'];

      const out = left.join(right, {
        how: 'outer',
        lsuffix: '_l',
        rsuffix: '_r'
      });

      if (JSON.stringify(out.index) !== JSON.stringify(['a', 'b', 'c'])) {
        throw new Error(`Unexpected join index: ${JSON.stringify(out.index)}`);
      }

      if (JSON.stringify(out.toRecords()) !== JSON.stringify([
        { id: 1, value_l: 10, value_r: 100, flag: true },
        { id: 2, value_l: 20, value_r: null, flag: null },
        { id: null, value_l: null, value_r: 200, flag: false }
      ])) {
        throw new Error(`Unexpected join output: ${JSON.stringify(out.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame.join() should support on-column joins',
    test: () => {
      const left = DataFrame.fromRecords([
        { user_id: 1, city: 'AMS' },
        { user_id: 2, city: 'PAR' },
        { user_id: 3, city: 'MAD' }
      ]);
      const right = DataFrame.fromRecords([
        { user_id: 1, tier: 'gold' },
        { user_id: 3, tier: 'silver' }
      ]);

      const out = left.join(right, {
        how: 'inner',
        on: 'user_id'
      });

      if (JSON.stringify(out.toRecords()) !== JSON.stringify([
        { user_id: 1, city: 'AMS', tier: 'gold' },
        { user_id: 3, city: 'MAD', tier: 'silver' }
      ])) {
        throw new Error(`Unexpected join(on) output: ${JSON.stringify(out.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame.join() should treat undefined key options as omitted and default to index join',
    test: () => {
      const left = DataFrame.fromRecords([
        { id: 1, left_value: 'L1' },
        { id: 2, left_value: 'L2' }
      ]);
      left.index = ['i1', 'i2'];

      const right = DataFrame.fromRecords([
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

      if (JSON.stringify(out.index) !== JSON.stringify(['i1', 'i2'])) {
        throw new Error(`Unexpected join index: ${JSON.stringify(out.index)}`);
      }

      const records = out.toRecords();
      if (records.length !== 2) {
        throw new Error(`Unexpected undefined-key join row count: ${records.length}`);
      }

      if (
        records[0].id_l !== 1 ||
        records[0].left_value !== 'L1' ||
        records[0].id_r !== 10 ||
        records[0].right_value !== 'R1'
      ) {
        throw new Error(`Unexpected undefined-key join first row: ${JSON.stringify(records[0])}`);
      }

      if (
        records[1].id_l !== 2 ||
        records[1].left_value !== 'L2' ||
        records[1].id_r !== null ||
        records[1].right_value !== null
      ) {
        throw new Error(`Unexpected undefined-key join second row: ${JSON.stringify(records[1])}`);
      }
    }
  },
  {
    description: 'DataFrame.join() should preserve index-label equality semantics for null/undefined/symbol/invalid-date',
    test: () => {
      const left = DataFrame.fromRecords([
        { left_value: 'L-null' },
        { left_value: 'L-undef' },
        { left_value: 'L-symbol' },
        { left_value: 'L-invalid-date' }
      ]);
      const right = DataFrame.fromRecords([
        { right_value: 'R-null' },
        { right_value: 'R-undef' },
        { right_value: 'R-symbol' },
        { right_value: 'R-invalid-date' }
      ]);

      left.index = [null, undefined, Symbol('k'), new Date('invalid-left')];
      right.index = [null, undefined, Symbol('k'), new Date('invalid-right')];

      const out = left.join(right, { how: 'inner' });
      const records = out.toRecords();

      if (out.len() !== 3) {
        throw new Error(`Unexpected index join row count: ${out.len()}`);
      }

      if (out.index[0] !== null) {
        throw new Error(`Expected first index label null, got ${String(out.index[0])}`);
      }

      if (out.index[1] !== undefined) {
        throw new Error(`Expected second index label undefined, got ${String(out.index[1])}`);
      }

      if (!(out.index[2] instanceof Date) || !Number.isNaN(out.index[2].getTime())) {
        throw new Error(`Expected third index label to be Invalid Date, got ${String(out.index[2])}`);
      }

      if (
        records[0].left_value !== 'L-null'
        || records[0].right_value !== 'R-null'
        || records[1].left_value !== 'L-undef'
        || records[1].right_value !== 'R-undef'
        || records[2].left_value !== 'L-invalid-date'
        || records[2].right_value !== 'R-invalid-date'
      ) {
        throw new Error(`Unexpected index-label join records: ${JSON.stringify(records)}`);
      }
    }
  },
  {
    description: 'DataFrame.join() should preserve right overlaps when using leftOn/rightOn keys',
    test: () => {
      const left = DataFrame.fromRecords([
        { id: 1, left_value: 'L1' },
        { id: 2, left_value: 'L2' }
      ]);
      const right = DataFrame.fromRecords([
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
      const records = out.toRecords();

      if (records.length !== 2) {
        throw new Error(`Unexpected leftOn/rightOn join row count: ${records.length}`);
      }

      if (records[0].id_l !== 1 || records[0].id_r !== 'RID1' || records[0].user_id !== 1) {
        throw new Error(`Unexpected leftOn/rightOn join first row: ${JSON.stringify(records[0])}`);
      }

      if (records[1].id_l !== 2 || records[1].id_r !== 'RID2' || records[1].user_id !== 2) {
        throw new Error(`Unexpected leftOn/rightOn join second row: ${JSON.stringify(records[1])}`);
      }
    }
  },
  {
    description: 'DataFrame.join() should reject identical suffixes for leftOn/rightOn overlap cases',
    test: () => {
      const left = DataFrame.fromRecords([
        { id: 1, left_value: 'L1' }
      ]);
      const right = DataFrame.fromRecords([
        { user_id: 1, id: 'RID1', right_value: 'R1' }
      ]);

      let threw = false;
      try {
        left.join(right, {
          how: 'inner',
          leftOn: 'id',
          rightOn: 'user_id',
          lsuffix: '_dup',
          rsuffix: '_dup'
        });
      } catch (error) {
        threw = /requires different lsuffix\/rsuffix/.test(error.message);
      }

      if (!threw) {
        throw new Error('Expected identical suffix collision error for leftOn/rightOn overlap');
      }
    }
  },
  {
    description: 'DataFrame.join() should reject index-join output column name collisions from suffix expansion',
    test: () => {
      const left = DataFrame.fromRecords([
        { value: 1, value_x: 10 }
      ]);
      left.index = ['row1'];

      const right = DataFrame.fromRecords([
        { value: 2 }
      ]);
      right.index = ['row1'];

      let threw = false;
      try {
        left.join(right, {
          how: 'inner',
          lsuffix: '_x',
          rsuffix: '_y'
        });
      } catch (error) {
        threw = /duplicate output column name 'value_x'/.test(error.message);
      }

      if (!threw) {
        throw new Error('Expected index-join output column collision error');
      }
    }
  },
  {
    description: 'DataFrame.join() should reject column-join output column name collisions from suffix expansion',
    test: () => {
      const left = DataFrame.fromRecords([
        { key: 1, value: 1, value_x: 10 }
      ]);
      const right = DataFrame.fromRecords([
        { key: 1, value: 2 }
      ]);

      let threw = false;
      try {
        left.join(right, {
          how: 'inner',
          on: 'key',
          lsuffix: '_x',
          rsuffix: '_y'
        });
      } catch (error) {
        threw = /duplicate output column name 'value_x'/.test(error.message);
      }

      if (!threw) {
        throw new Error('Expected column-join output column collision error');
      }
    }
  },
  {
    description: 'DataFrame.pivotTable() min aggregation should prefer valid Date over Invalid Date',
    test: () => {
      const df = DataFrame.fromRecords([
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

      if (!(minValue instanceof Date)) {
        throw new Error(`Expected Date output for pivot min, got ${String(minValue)}`);
      }

      if (Number.isNaN(minValue.getTime())) {
        throw new Error('Expected valid Date for pivot min with mixed valid/invalid Date values');
      }

      if (minValue.toISOString() !== '2024-01-01T00:00:00.000Z') {
        throw new Error(`Unexpected pivot min date: ${minValue.toISOString()}`);
      }
    }
  },
  {
    description: 'DataFrame.melt() should unpivot with custom var/value names',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 'u1', jan: 10, feb: 20 },
        { id: 'u2', jan: 30, feb: 40 }
      ]);

      const out = df.melt({
        idVars: ['id'],
        valueVars: ['jan', 'feb'],
        varName: 'month',
        valueName: 'sales'
      });

      if (JSON.stringify(out.toRecords()) !== JSON.stringify([
        { id: 'u1', month: 'jan', sales: 10 },
        { id: 'u1', month: 'feb', sales: 20 },
        { id: 'u2', month: 'jan', sales: 30 },
        { id: 'u2', month: 'feb', sales: 40 }
      ])) {
        throw new Error(`Unexpected melt output: ${JSON.stringify(out.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame.melt() should reject varName collisions with idVars',
    test: () => {
      const df = DataFrame.fromRecords([
        { variable: 'keep', one: 1 }
      ]);

      let threw = false;
      try {
        df.melt({ idVars: 'variable' });
      } catch (error) {
        threw = /conflict on 'variable'/.test(error.message);
      }

      if (!threw) {
        throw new Error('Expected varName/idVars collision error');
      }
    }
  },
  {
    description: 'DataFrame.explode() should expand arrays and preserve empty/null semantics',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, tags: ['a', 'b'] },
        { id: 2, tags: [] },
        { id: 3, tags: null }
      ]);
      df.index = ['r1', 'r2', 'r3'];

      const out = df.explode('tags');
      if (JSON.stringify(out.index) !== JSON.stringify(['r1', 'r1', 'r2', 'r3'])) {
        throw new Error(`Unexpected explode index: ${JSON.stringify(out.index)}`);
      }

      if (JSON.stringify(out.toRecords()) !== JSON.stringify([
        { id: 1, tags: 'a' },
        { id: 1, tags: 'b' },
        { id: 2, tags: null },
        { id: 3, tags: null }
      ])) {
        throw new Error(`Unexpected explode output: ${JSON.stringify(out.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame.pivotTable() should aggregate and fill missing combinations',
    test: () => {
      const df = DataFrame.fromRecords([
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

      if (JSON.stringify(out.toRecords()) !== JSON.stringify([
        { region: 'EU', string_q1_sales: 10, string_q1_units: 1, string_q2_sales: 20, string_q2_units: 2 },
        { region: 'US', string_q1_sales: 5, string_q1_units: 3, string_q2_sales: 0, string_q2_units: 0 }
      ])) {
        throw new Error(`Unexpected pivotTable output: ${JSON.stringify(out.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame.pivotTable() should support aggFunc mapping with default fallback',
    test: () => {
      const df = DataFrame.fromRecords([
        { region: 'EU', quarter: 'Q1', sales: 10, units: 1 },
        { region: 'EU', quarter: 'Q1', sales: 30, units: 4 }
      ]);

      const out = df.pivotTable({
        index: 'region',
        columns: 'quarter',
        values: ['sales', 'units'],
        aggFunc: { sales: 'mean', default: 'count' }
      });

      if (JSON.stringify(out.toRecords()) !== JSON.stringify([
        { region: 'EU', string_q1_sales: 20, string_q1_units: 2 }
      ])) {
        throw new Error(`Unexpected pivotTable agg map output: ${JSON.stringify(out.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame.pivotTable() should return empty result for indexed empty input',
    test: () => {
      const df = DataFrame.fromColumns({
        region: [],
        quarter: [],
        sales: []
      });

      const out = df.pivotTable({
        index: 'region',
        columns: 'quarter',
        values: 'sales',
        aggFunc: 'sum'
      });

      if (out.len() !== 0) {
        throw new Error(`Expected empty result, got len=${out.len()}`);
      }
    }
  },
  {
    description: 'DataFrame.pivotTable() should reject duplicate output names after normalization',
    test: () => {
      const df = DataFrame.fromRecords([
        { region: 'EU', quarter: 'A-B', sales: 10 },
        { region: 'EU', quarter: 'A_B', sales: 20 }
      ]);

      let threw = false;
      try {
        df.pivotTable({
          index: 'region',
          columns: 'quarter',
          values: 'sales',
          aggFunc: 'sum'
        });
      } catch (error) {
        threw = /duplicate output column name/.test(error.message);
      }

      if (!threw) {
        throw new Error('Expected duplicate pivot output column name error');
      }
    }
  }
];
