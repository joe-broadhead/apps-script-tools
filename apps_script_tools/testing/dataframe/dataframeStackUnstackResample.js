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

      const duplicateIndexDf = DataFrame.fromRecords([
        { a: 1, b: 10 },
        { a: 2, b: 20 }
      ]);
      duplicateIndexDf.index = ['r1', 'r1'];
      const duplicateRoundTrip = duplicateIndexDf.stack({ dropNulls: false }).unstack();
      if (duplicateRoundTrip.len() !== 2) {
        throw new Error(`Expected duplicate-index round-trip to preserve 2 rows, got ${duplicateRoundTrip.len()}`);
      }
      if (JSON.stringify(duplicateRoundTrip.index) !== JSON.stringify(['r1', 'r1'])) {
        throw new Error(`Expected duplicate index labels preserved: ${JSON.stringify(duplicateRoundTrip.index)}`);
      }
      if (JSON.stringify(duplicateRoundTrip.toRecords()) !== JSON.stringify([
        { a: 1, b: 10 },
        { a: 2, b: 20 }
      ])) {
        throw new Error(`Unexpected duplicate-index unstack records: ${JSON.stringify(duplicateRoundTrip.toRecords())}`);
      }

      const empty = DataFrame.fromColumns({
        a: [],
        b: []
      });
      empty.index = [];
      const emptyRoundTrip = empty.stack({ dropNulls: false }).unstack();
      if (emptyRoundTrip.len() !== 0) {
        throw new Error(`Expected empty round-trip to preserve zero rows, got ${emptyRoundTrip.len()}`);
      }
      if (JSON.stringify(emptyRoundTrip.columns) !== JSON.stringify(['a', 'b'])) {
        throw new Error(`Expected empty round-trip to preserve schema ['a','b'], got ${JSON.stringify(emptyRoundTrip.columns)}`);
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

      let stackBooleanErr = null;
      try {
        df.stack({ dropNulls: 'false' });
      } catch (error) {
        stackBooleanErr = error;
      }
      if (!stackBooleanErr || !String(stackBooleanErr.message || stackBooleanErr).includes('dropNulls must be boolean')) {
        throw new Error('Expected stack to reject non-boolean dropNulls values');
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

      const spacedLong = DataFrame.fromRecords([
        { row_index: 'r1', column: 'a', value: 1 },
        { row_index: 'r1', column: ' a ', value: 2 }
      ]);
      const spacedOut = spacedLong.unstack({ agg: 'first' });
      if (JSON.stringify(spacedOut.columns) !== JSON.stringify(['a', ' a '])) {
        throw new Error(`Expected unstack to preserve label spacing: ${JSON.stringify(spacedOut.columns)}`);
      }
      if (spacedOut.data.a.array[0] !== 1 || spacedOut.data[' a '].array[0] !== 2) {
        throw new Error(`Unexpected unstack values for spaced labels: ${JSON.stringify(spacedOut.toColumns())}`);
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

      let unstackBooleanErr = null;
      try {
        dangerousLong.unstack({ dropIndexColumn: 'false' });
      } catch (error) {
        unstackBooleanErr = error;
      }
      if (!unstackBooleanErr || !String(unstackBooleanErr.message || unstackBooleanErr).includes('dropIndexColumn must be boolean')) {
        throw new Error('Expected unstack to reject non-boolean dropIndexColumn values');
      }

      let preserveBooleanErr = null;
      try {
        dangerousLong.unstack({ preserveIndex: 1 });
      } catch (error) {
        preserveBooleanErr = error;
      }
      if (!preserveBooleanErr || !String(preserveBooleanErr.message || preserveBooleanErr).includes('preserveIndex must be boolean')) {
        throw new Error('Expected unstack to reject non-boolean preserveIndex values');
      }

      const indexA = { id: 1 };
      const indexB = { id: 1 };
      const objectIndexLong = DataFrame.fromRecords([
        { row_index: indexA, column: 'value', value: 10 },
        { row_index: indexB, column: 'value', value: 20 }
      ]);
      const objectIndexOut = objectIndexLong.unstack({ agg: 'first' });
      if (objectIndexOut.len() !== 2) {
        throw new Error(`Expected 2 rows for distinct object index labels, got ${objectIndexOut.len()}`);
      }
      if (objectIndexOut.data.value.array[0] !== 10 || objectIndexOut.data.value.array[1] !== 20) {
        throw new Error(`Unexpected object index unstack values: ${JSON.stringify(objectIndexOut.toRecords())}`);
      }
      if (objectIndexOut.index[0] !== indexA || objectIndexOut.index[1] !== indexB) {
        throw new Error('Expected unstack output index to preserve object label identity');
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

      const statusDf = DataFrame.fromRecords([
        { ts: '2026-03-03T10:01:00Z', status: 'pending' },
        { ts: '2026-03-03T10:45:00Z', status: 'approved' },
        { ts: '2026-03-03T11:02:00Z', status: 'review' }
      ]);
      const statusMin = statusDf.resample('1h', {
        on: 'ts',
        columns: ['status'],
        agg: 'min'
      });
      const statusMax = statusDf.resample('1h', {
        on: 'ts',
        columns: ['status'],
        agg: 'max'
      });
      if (JSON.stringify(statusMin.toRecords()) !== JSON.stringify([
        { status: 'approved' },
        { status: 'review' }
      ])) {
        throw new Error(`Unexpected status min resample output: ${JSON.stringify(statusMin.toRecords())}`);
      }
      if (JSON.stringify(statusMax.toRecords()) !== JSON.stringify([
        { status: 'pending' },
        { status: 'review' }
      ])) {
        throw new Error(`Unexpected status max resample output: ${JSON.stringify(statusMax.toRecords())}`);
      }

      const sparseDf = DataFrame.fromRecords([
        { ts: '2026-03-01T10:01:00Z', value: 10 },
        { ts: '2026-03-03T09:15:00Z', value: 30 }
      ]);
      const sparseOut = sparseDf.resample('1d', {
        on: 'ts',
        columns: ['value'],
        agg: 'sum',
        fillValue: 0
      });
      if (sparseOut.len() !== 3) {
        throw new Error(`Expected sparse resample to materialize 3 buckets, got ${sparseOut.len()}`);
      }
      if (JSON.stringify(sparseOut.toRecords()) !== JSON.stringify([
        { value: 10 },
        { value: 0 },
        { value: 30 }
      ])) {
        throw new Error(`Unexpected sparse resample output: ${JSON.stringify(sparseOut.toRecords())}`);
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

      let invalidAggObjectErr = null;
      try {
        df.resample('1h', {
          on: 'ts',
          columns: ['value'],
          agg: new Date()
        });
      } catch (error) {
        invalidAggObjectErr = error;
      }
      if (!invalidAggObjectErr || !String(invalidAggObjectErr.message || invalidAggObjectErr).includes('agg object must be a plain object')) {
        throw new Error('Expected resample to reject non-plain agg objects');
      }
    }
  }
];
