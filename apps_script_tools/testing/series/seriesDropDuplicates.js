SERIES_DROP_DUPLICATES_TESTS = [
  {
    description: 'Series.dropDuplicates() should remove duplicate values and preserve order',
    test: () => {
      const series = new Series([10, 20, 10, 30, 20], 'values');
      const result = series.dropDuplicates();

      const expectedArray = [10, 20, 30]; // Unique values in the order of first occurrence
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== series.name) {
        throw new Error(`Expected name to be '${series.name}', but got '${result.name}'`);
      }
    },
  },
  {
    description: 'Series.dropDuplicates() should return the same Series if there are no duplicates',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.dropDuplicates();

      const expectedArray = [10, 20, 30]; // No duplicates, so the output is the same
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== series.name) {
        throw new Error(`Expected name to be '${series.name}', but got '${result.name}'`);
      }
    },
  },
  {
    description: 'Series.dropDuplicates() should handle an empty Series without errors',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.dropDuplicates();

      const expectedArray = []; // An empty Series remains empty
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array to be ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== series.name) {
        throw new Error(`Expected name to be '${series.name}', but got '${result.name}'`);
      }
    },
  },
  {
    description: 'Series.dropDuplicates() should handle Series with mixed types',
    test: () => {
      const series = new Series([10, '10', true, 10, '10', false], 'mixed');
      const result = series.dropDuplicates();

      const expectedArray = [10, '10', true, false]; // Only the first occurrence of each unique value
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.dropDuplicates() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // 100 unique values repeated
      const series = new Series(largeArray, 'large');
      const result = series.dropDuplicates();

      const expectedArray = Array.from({ length: 100 }, (_, i) => i); // 100 unique values
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
