SERIES_SUM_TESTS = [
  {
    description: 'Series.sum() should compute the sum of numeric values',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.sum();

      const expectedSum = 60; // 10 + 20 + 30
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      };
    },
  },
  {
    description: 'Series.sum() should handle numeric strings correctly',
    test: () => {
      const series = new Series(["10", "20", "30"], 'values');
      const result = series.sum();

      const expectedSum = 60; // 10 + 20 + 30 (numeric strings converted to numbers)
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      };
    },
  },
  {
    description: 'Series.sum() should skip non-numeric elements and compute the sum of numeric values',
    test: () => {
      const series = new Series([10, "20", true, null, "text"], 'values');
      const result = series.sum();

      const expectedSum = 31; // 10 + 20 + 1 (true); null, and "text" are ignored
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      };
    },
  },
  {
    description: 'Series.sum() should return 0 for an empty Series',
    test: () => {
      const series = new Series([], 'values');
      const result = series.sum();

      const expectedSum = 0; // No elements to sum
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      };
    },
  },
  {
    description: 'Series.sum() should skip NaN values and compute the sum of numeric elements',
    test: () => {
      const series = new Series([10, NaN, 20, "30"], 'values');
      const result = series.sum();

      const expectedSum = 60; // 10 + 20 + 30; NaN is ignored
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      };
    },
  },
  {
    description: 'Series.sum() should handle large numbers correctly',
    test: () => {
      const series = new Series([1e10, 2e10, 3e10], 'values');
      const result = series.sum();

      const expectedSum = 6e10; // Sum of large numbers
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      };
    },
  },
];
