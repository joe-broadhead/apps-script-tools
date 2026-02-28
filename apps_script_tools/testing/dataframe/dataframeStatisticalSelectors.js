DATAFRAME_STATISTICAL_SELECTORS_TESTS = [
  {
    description: 'DataFrame.quantile() and describe() operate on numeric columns by default',
    test: () => {
      const df = DataFrame.fromRecords([
        { a: 1, b: 10, c: 'x' },
        { a: 2, b: null, c: 'y' },
        { a: 3, b: 30, c: 'z' }
      ]);

      const q = df.quantile(0.5);
      if (JSON.stringify(q.index) !== JSON.stringify(['a', 'b'])) {
        throw new Error(`Expected quantile index ['a','b'], got ${JSON.stringify(q.index)}`);
      }
      if (JSON.stringify(q.array) !== JSON.stringify([2, 20])) {
        throw new Error(`Expected quantile values [2,20], got ${JSON.stringify(q.array)}`);
      }

      const described = df.describe({ percentiles: [0.5] });
      if (JSON.stringify(described.index) !== JSON.stringify(['count', 'mean', 'std', 'min', '50%', 'max'])) {
        throw new Error(`Unexpected describe index: ${JSON.stringify(described.index)}`);
      }
      if (JSON.stringify(described.columns) !== JSON.stringify(['a', 'b'])) {
        throw new Error(`Expected describe columns ['a','b'], got ${JSON.stringify(described.columns)}`);
      }
    }
  },
  {
    description: 'DataFrame.nlargest()/nsmallest() are deterministic and tie-stable',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 'a', score: 10, weight: 1 },
        { id: 'b', score: 10, weight: 1 },
        { id: 'c', score: 9, weight: 5 },
        { id: 'd', score: null, weight: 100 }
      ]);

      const largest = df.nlargest(2, ['score', 'weight']);
      const smallest = df.nsmallest(2, ['score', 'weight']);

      if (largest.at(0).id !== 'a' || largest.at(1).id !== 'b') {
        throw new Error(`Unexpected nlargest ordering: ${JSON.stringify(largest.toRecords())}`);
      }
      if (smallest.at(0).id !== 'c' || smallest.at(1).id !== 'a') {
        throw new Error(`Unexpected nsmallest ordering: ${JSON.stringify(smallest.toRecords())}`);
      }
    }
  },
  {
    description: 'DataFrame statistical selector methods validate arguments',
    test: () => {
      const df = DataFrame.fromRecords([{ score: 1 }]);

      try {
        df.quantile(1.5);
        throw new Error('Expected DataFrame.quantile to reject out-of-range q');
      } catch (error) {
        if (!error.message.includes('between 0 and 1')) {
          throw new Error(`Unexpected quantile error message: ${error.message}`);
        }
      }

      try {
        df.nlargest(-1, 'score');
        throw new Error('Expected DataFrame.nlargest to reject negative n');
      } catch (error) {
        if (!error.message.includes('non-negative integer')) {
          throw new Error(`Unexpected nlargest error message: ${error.message}`);
        }
      }
    }
  }
];
