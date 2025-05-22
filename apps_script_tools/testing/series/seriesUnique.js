SERIES_UNIQUE_TESTS = [
  {
    description: 'Series.unique() should return distinct numeric values',
    test: () => {
      const series = new Series([10, 20, 10, 30], 'values');
      const result = series.unique();

      const expectedUnique = [10, 20, 30]; // Distinct values in the order of first appearance
      if (JSON.stringify(result) !== JSON.stringify(expectedUnique)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnique)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.unique() should handle a mix of data types',
    test: () => {
      const series = new Series([10, "10", 20, 30, "30", true, false, true], 'values');
      const result = series.unique();

      const expectedUnique = [10, "10", 20, 30, "30", true, false]; // Distinct values as they appear
      if (JSON.stringify(result) !== JSON.stringify(expectedUnique)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnique)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.unique() should return an empty array for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.unique();

      const expectedUnique = []; // Empty input results in an empty output
      if (JSON.stringify(result) !== JSON.stringify(expectedUnique)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnique)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.unique() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // Repeating values 0 to 99
      const series = new Series(largeArray, 'large');
      const result = series.unique();

      const expectedUnique = Array.from({ length: 100 }, (_, i) => i); // Unique values 0 to 99
      if (JSON.stringify(result) !== JSON.stringify(expectedUnique)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnique)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.unique() should handle case sensitivity for strings',
    test: () => {
      const series = new Series(["a", "A", "b", "B", "a"], 'values');
      const result = series.unique();

      const expectedUnique = ["a", "A", "b", "B"]; // Case-sensitive unique values
      if (JSON.stringify(result) !== JSON.stringify(expectedUnique)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnique)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
