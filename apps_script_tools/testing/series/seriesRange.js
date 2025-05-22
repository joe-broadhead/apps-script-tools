SERIES_RANGE_TESTS = [
  {
    description: 'Series.range() should calculate the range of numeric values',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'values');
      const result = series.range();

      const expectedRange = 40 - 10; // Max: 40, Min: 10
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.range() should skip non-numeric values in the calculation',
    test: () => {
      const series = new Series([10, "20", null, undefined, "text", 40], 'values');
      const result = series.range();

      const expectedRange = 40 - 10; // Max: 40, Min: 10; Skipping non-numeric values
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.range() should return 0 for a Series with a single element',
    test: () => {
      const series = new Series([10], 'values');
      const result = series.range();

      const expectedRange = 0; // Max and Min are the same
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.range() should return null for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.range();

      if (result !== null) {
        throw new Error(`Expected null, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.range() should calculate the range for a Series with negative values',
    test: () => {
      const series = new Series([-10, -20, -5, -30], 'values');
      const result = series.range();

      const expectedRange = -5 - (-30); // Max: -5, Min: -30
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.range() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // Values 1 to 10,000
      const series = new Series(largeArray, 'large');
      const result = series.range();

      const expectedRange = 10000 - 1; // Max: 10,000, Min: 1
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    },
  },
];
