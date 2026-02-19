DATAFRAME_COLUMNS_TESTS = [
  {
    description: 'DataFrame.fromColumns() should create a DataFrame with expected shape',
    test: () => {
      const df = DataFrame.fromColumns({
        id: [1, 2, 3],
        region: ['east', 'west', 'east'],
        amount: [10, 20, 30]
      });

      if (df.len() !== 3) {
        throw new Error(`Expected 3 rows, but got ${df.len()}`);
      }

      if (JSON.stringify(df.columns) !== JSON.stringify(['id', 'region', 'amount'])) {
        throw new Error(`Expected columns ['id', 'region', 'amount'], but got ${JSON.stringify(df.columns)}`);
      }
    }
  },
  {
    description: 'DataFrame.toColumns() should return column-oriented arrays',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, amount: 10 },
        { id: 2, amount: 20 }
      ]);

      const columns = df.toColumns();
      const expected = {
        id: [1, 2],
        amount: [10, 20]
      };

      if (JSON.stringify(columns) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(columns)}`);
      }
    }
  },
  {
    description: 'DataFrame.toArrays() should not require toRecords() conversion',
    test: () => {
      DataFrame.__resetPerfCounters();

      const df = DataFrame.fromColumns({
        id: [1, 2],
        amount: [10, 20]
      });

      const arrays = df.toArrays();
      const counters = DataFrame.__getPerfCounters();

      const expected = [
        ['id', 'amount'],
        [1, 10],
        [2, 20]
      ];

      if (JSON.stringify(arrays) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(arrays)}`);
      }

      if (counters.toRecords !== 0) {
        throw new Error(`Expected toRecords counter to remain 0, but got ${counters.toRecords}`);
      }
    }
  }
];
