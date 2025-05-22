SERIES_NOT_NULL_TESTS = [
  {
    description: 'Series.notNull() should correctly identify non-null and non-undefined values',
    test: () => {
      const series = new Series([10, null, undefined, 20], 'A');
      const result = series.notNull();

      const expectedValues = [true, false, false, true]; // 10: true, null: false, undefined: false, 20: true
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.notNull() should return an empty Series when applied to an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.notNull();

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.notNull() should return true for all non-null and non-undefined elements',
    test: () => {
      const series = new Series([10, "hello", true, 0], 'A');
      const result = series.notNull();

      const expectedValues = [true, true, true, true]; // None of these values are null or undefined
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.notNull() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, null, "hello", undefined, true], 'A');
      const result = series.notNull();

      const expectedValues = [true, false, true, false, true]; // 10: true, null: false, etc.
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.notNull() should handle a large Series with null and undefined efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => (i % 3 === 0 ? null : i % 5 === 0 ? undefined : i));
      const series = new Series(largeArray, 'A');
      const result = series.notNull();

      const expectedValues = largeArray.map(value => value !== null && value !== undefined); // true for non-null/non-undefined, false otherwise
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with null and undefined');
      }
    },
  },
];
