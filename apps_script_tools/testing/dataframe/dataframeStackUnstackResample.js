DATAFRAME_STACK_UNSTACK_RESAMPLE_TESTS = [
  {
    description: 'DataFrame.stack/unstack should round-trip stacked output with index preservation',
    test: () => {
      const df = DataFrame.fromRecords([
        { a: 1, b: 10 },
        { a: 2, b: null }
      ]);
      df.index = ['r1', 'r2'];

      const stacked = df.stack({ dropNulls: false });
      const unstacked = stacked.unstack();

      if (JSON.stringify(unstacked.index) !== JSON.stringify(['r1', 'r2'])) {
        throw new Error(`Unexpected unstacked index: ${JSON.stringify(unstacked.index)}`);
      }

      if (JSON.stringify(unstacked.toRecords()) !== JSON.stringify([
        { a: 1, b: 10 },
        { a: 2, b: null }
      ])) {
        throw new Error(`Unexpected unstacked records: ${JSON.stringify(unstacked.toRecords())}`);
      }

      let stackErr = null;
      try {
        df.stack({ indexName: '__proto__' });
      } catch (error) {
        stackErr = error;
      }
      if (!stackErr || !String(stackErr.message || stackErr).includes('must not be one of')) {
        throw new Error('Expected stack to reject dangerous output names');
      }

      const textLong = DataFrame.fromRecords([
        { row_index: 'r1', column: 'city', value: 'zurich' },
        { row_index: 'r1', column: 'city', value: 'amsterdam' }
      ]);
      const minText = textLong.unstack({ agg: 'min' });
      const maxText = textLong.unstack({ agg: 'max' });
      if (minText.toRecords()[0].city !== 'amsterdam' || maxText.toRecords()[0].city !== 'zurich') {
        throw new Error(`Unexpected text unstack min/max: min=${minText.toRecords()[0].city} max=${maxText.toRecords()[0].city}`);
      }

      const dangerousLong = DataFrame.fromRecords([
        { row_index: 'r1', column: '__proto__', value: 1 }
      ]);
      let dangerousErr = null;
      try {
        dangerousLong.unstack();
      } catch (error) {
        dangerousErr = error;
      }
      if (!dangerousErr || !String(dangerousErr.message || dangerousErr).includes('unsupported output column name')) {
        throw new Error('Expected unstack to reject dangerous output column names');
      }
    }
  },
  {
    description: 'DataFrame.resample should bucket timestamps and aggregate values deterministically',
    test: () => {
      const df = DataFrame.fromRecords([
        { ts: '2026-03-03T10:01:00Z', value: 10, qty: 1 },
        { ts: '2026-03-03T10:45:00Z', value: 20, qty: 2 },
        { ts: '2026-03-03T11:02:00Z', value: 40, qty: 3 }
      ]);

      const out = df.resample('1h', {
        on: 'ts',
        columns: ['value', 'qty'],
        agg: 'mean'
      });

      if (out.len() !== 2) {
        throw new Error(`Expected 2 buckets, got ${out.len()}`);
      }

      if (out.index[0].toISOString() !== '2026-03-03T10:00:00.000Z') {
        throw new Error(`Unexpected first bucket index: ${out.index[0].toISOString()}`);
      }

      if (JSON.stringify(out.toRecords()) !== JSON.stringify([
        { value: 15, qty: 1.5 },
        { value: 40, qty: 3 }
      ])) {
        throw new Error(`Unexpected resample output: ${JSON.stringify(out.toRecords())}`);
      }

      const dfInvalidTs = DataFrame.fromRecords([
        { ts: null, value: 10 },
        { ts: false, value: 20 }
      ]);
      let invalidTsErr = null;
      try {
        dfInvalidTs.resample('1h', {
          on: 'ts',
          columns: ['value'],
          agg: 'sum'
        });
      } catch (error) {
        invalidTsErr = error;
      }
      if (!invalidTsErr || !String(invalidTsErr.message || invalidTsErr).includes('non-date timestamp value')) {
        throw new Error('Expected resample to reject null/boolean timestamp values');
      }
    }
  }
];
