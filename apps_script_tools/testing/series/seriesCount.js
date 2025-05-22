SERIES_COUNT_TESTS = [
  {
    description: 'Series.count() should return the total number of elements in a Series of numeric values',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.count();

      const expectedCount = 3; // Total elements: [10, 20, 30]
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.count() should include null and undefined values in the total count',
    test: () => {
      const series = new Series([10, null, 20, undefined, 30], 'values');
      const result = series.count();

      const expectedCount = 5; // Total elements: [10, null, 20, undefined, 30]
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.count() should return 0 for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.count();

      const expectedCount = 0; // No elements in the Series
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.count() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // 10,000 elements
      const series = new Series(largeArray, 'large');
      const result = series.count();

      const expectedCount = 10000; // Total elements: 1 to 10,000
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
];
