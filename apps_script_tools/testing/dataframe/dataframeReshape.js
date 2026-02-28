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
