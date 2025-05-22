SERIES_ISIN_TESTS = [
  {
    description: 'Series.isIn() should check membership against an array',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'A');
      const result = series.isIn([10, 30, 50]);

      const expectedValues = [true, false, true, false]; // 10: true, 20: false, 30: true, 40: false
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isIn() should check membership against another Series',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'A');
      const otherSeries = new Series([10, 30, 50], 'B');
      const result = series.isIn(otherSeries);

      const expectedValues = [true, false, true, false]; // 10: true, 20: false, etc.
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isIn() should return an empty Series when applied to an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.isIn([10, 30, 50]);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isIn() should return false for all elements when the collection is empty',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'A');
      const result = series.isIn([]);

      const expectedValues = [false, false, false, false]; // No elements can be found in an empty collection
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isIn() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.isIn([10, null, true]);

      const expectedValues = [true, false, true, true]; // 10: true, "20": false, true: true, null: true
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isIn() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const collection = Array.from({ length: 5000 }, (_, i) => i * 2); // Even numbers
      const series = new Series(largeArray, 'A');
      const result = series.isIn(collection);

      const expectedValues = largeArray.map(value => collection.includes(value)); // Check membership
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with collection');
      }
    },
  },
];
