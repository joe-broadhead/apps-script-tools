DATAFRAME_WINDOW_TESTS = [
  {
    description: 'DataFrame.window() should compute rowNumber/lag/running by partition order',
    test: () => {
      const df = DataFrame.fromRecords([
        { account: 'a', ts: 2, amount: 20 },
        { account: 'a', ts: 1, amount: 10 },
        { account: 'b', ts: 1, amount: 5 },
        { account: 'b', ts: 3, amount: 15 },
        { account: 'b', ts: 2, amount: null }
      ]);

      const windowed = df.window({
        partitionBy: ['account'],
        orderBy: [{ column: 'ts', ascending: true }]
      });

      const rowNumber = windowed.rowNumber();
      const lag = windowed.col('amount').lag(1);
      const runningSum = windowed.col('amount').running('sum');

      if (JSON.stringify(rowNumber) !== JSON.stringify([2, 1, 1, 3, 2])) {
        throw new Error(`Unexpected rowNumber output: ${JSON.stringify(rowNumber)}`);
      }

      if (JSON.stringify(lag) !== JSON.stringify([10, null, null, null, 5])) {
        throw new Error(`Unexpected lag output: ${JSON.stringify(lag)}`);
      }

      if (JSON.stringify(runningSum) !== JSON.stringify([30, 10, 5, 20, 5])) {
        throw new Error(`Unexpected running sum output: ${JSON.stringify(runningSum)}`);
      }
    }
  },
  {
    description: 'DataFrame.window().assign() should append computed columns and preserve index',
    test: () => {
      const df = DataFrame.fromRecords([
        { region: 'east', amount: 10 },
        { region: 'east', amount: 15 },
        { region: 'west', amount: 5 }
      ]);
      df.index = ['a', 'b', 'c'];

      const result = df.window({
        partitionBy: ['region'],
        orderBy: [{ column: 'amount', ascending: true }]
      }).assign({
        row_number: w => w.rowNumber(),
        amount_lag: w => w.col('amount').lag(1),
        amount_running_sum: w => w.col('amount').running('sum')
      });

      if (JSON.stringify(result.row_number.array) !== JSON.stringify([1, 2, 1])) {
        throw new Error(`Unexpected row_number values: ${JSON.stringify(result.row_number.array)}`);
      }

      if (JSON.stringify(result.amount_lag.array) !== JSON.stringify([null, 10, null])) {
        throw new Error(`Unexpected amount_lag values: ${JSON.stringify(result.amount_lag.array)}`);
      }

      if (JSON.stringify(result.amount_running_sum.array) !== JSON.stringify([10, 25, 5])) {
        throw new Error(`Unexpected amount_running_sum values: ${JSON.stringify(result.amount_running_sum.array)}`);
      }

      if (JSON.stringify(result.index) !== JSON.stringify(['a', 'b', 'c'])) {
        throw new Error(`Expected index to be preserved, got ${JSON.stringify(result.index)}`);
      }
    }
  },
  {
    description: 'DataFrame.window() should validate required orderBy',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, value: 10 }
      ]);

      try {
        df.window({ partitionBy: ['id'] });
        throw new Error('Expected window() to throw without orderBy');
      } catch (error) {
        if (!error.message.includes('window requires orderBy')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  }
];
