SERIES_NUNIQUE_TESTS = [
  {
    description: 'Series.nunique() should return the count of unique elements in the Series',
    test: () => {
      const series = new Series([10, 20, 10, 30], 'values');
      const result = series.nunique();

      const expectedCount = 3; // Unique values: [10, 20, 30]
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.nunique() should count unique elements in a Series with mixed types',
    test: () => {
      const series = new Series([10, "10", 20, "text", null, "text"], 'values');
      const result = series.nunique();

      const expectedCount = 5; // Unique values: [10, "10", 20, "text", null]
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.nunique() should return 1 for a Series with all identical elements',
    test: () => {
      const series = new Series([10, 10, 10, 10], 'values');
      const result = series.nunique();

      const expectedCount = 1; // Unique values: [10]
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.nunique() should return 0 for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.nunique();

      const expectedCount = 0; // No elements, so no unique values
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.nunique() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // 100 repeating values
      const series = new Series(largeArray, 'large');
      const result = series.nunique();

      const expectedCount = 100; // Unique values: 0 to 99
      if (result !== expectedCount) {
        throw new Error(`Expected ${expectedCount}, but got ${result}`);
      }
    },
  },
];
