SERIES_DUPLICATED_TESTS = [
  {
    description: 'Series.duplicated() should correctly identify duplicate elements',
    test: () => {
      const series = new Series([10, 20, 10, 30, 20, 40], 'A');
      const result = series.duplicated();

      const expectedValues = [true, true, true, false, true, false]; // 10 and 20 appear more than once, 30 and 40 do not
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.duplicated() should return false for all elements in a Series with no duplicates',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'A');
      const result = series.duplicated();

      const expectedValues = [false, false, false, false]; // No duplicates
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.duplicated() should return an empty Series when applied to an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.duplicated();

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.duplicated() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "10", 20, NaN, NaN, 10], 'A');
      const result = series.duplicated();

      const expectedValues = [true, true, false, true, true, true]; // 10 and NaN are duplicated
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.duplicated() should handle a large Series with duplicates efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // Each number appears 100 times
      const series = new Series(largeArray, 'A');
      const result = series.duplicated();

      const expectedValues = largeArray.map(() => true); // All values are duplicates
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with duplicates');
      }
    },
  },
];
