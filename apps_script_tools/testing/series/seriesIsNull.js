SERIES_IS_NULL_TESTS = [
  {
    description: 'Series.isNull() should correctly identify null and undefined values',
    test: () => {
      const series = new Series([10, null, undefined, 20], 'A');
      const result = series.isNull();

      const expectedValues = [false, true, true, false]; // 10: false, null: true, undefined: true, 20: false
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isNull() should return an empty Series when applied to an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.isNull();

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isNull() should return false for all non-null and non-undefined elements',
    test: () => {
      const series = new Series([10, "hello", true, 0], 'A');
      const result = series.isNull();

      const expectedValues = [false, false, false, false]; // None of these values are null or undefined
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isNull() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, null, "hello", undefined, true], 'A');
      const result = series.isNull();

      const expectedValues = [false, true, false, true, false]; // 10: false, null: true, etc.
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.isNull() should handle a large Series with null and undefined efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => (i % 3 === 0 ? null : i % 5 === 0 ? undefined : i));
      const series = new Series(largeArray, 'A');
      const result = series.isNull();

      const expectedValues = largeArray.map(value => value === null || value === undefined); // true for null/undefined, false otherwise
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with null and undefined');
      }
    },
  },
];
