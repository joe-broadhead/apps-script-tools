SERIES_APPLY_TESTS = [
  {
    description: 'Series.apply() should return the Series unchanged when using the default function',
    test: () => {
      const series = new Series([1, 2, 3], 'values');
      const result = series.apply();

      const expectedValues = [1, 2, 3]; // No transformation applied
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.apply() should correctly apply a function that squares each element',
    test: () => {
      const series = new Series([1, 2, 3], 'values');
      const result = series.apply(value => value ** 2);

      const expectedValues = [1, 4, 9]; // Squared values
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.apply() should transform numeric values into strings',
    test: () => {
      const series = new Series([1, 2, 3], 'values');
      const result = series.apply(value => `Value: ${value}`);

      const expectedValues = ['Value: 1', 'Value: 2', 'Value: 3']; // String transformation
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.apply() should return an empty Series for an empty input',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.apply(value => value ** 2);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.apply() should handle a Series with mixed types',
    test: () => {
      const series = new Series([1, "2", true, null], 'mixed');
      const result = series.apply(value => (value ? String(value) : "null"));

      const expectedValues = ["1", "2", "true", "null"]; // Transform all values to strings
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.apply() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'large');
      const result = series.apply(value => value * 2);

      const expectedValues = largeArray.map(value => value * 2); // Double each value
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
];
