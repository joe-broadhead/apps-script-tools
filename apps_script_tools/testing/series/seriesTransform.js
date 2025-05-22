SERIES_TRANSFORM_TESTS = [
  {
    description: 'Series.transform() should compute the element-wise sum of multiple Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2, 3], 'B');
      const result = seriesA.transform(values => values.reduce((a, b) => a + b), [seriesB]);

      const expectedValues = [11, 22, 33]; // Element-wise sum of seriesA and seriesB
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.transform() should compute the element-wise product of multiple Series',
    test: () => {
      const seriesA = new Series([2, 4, 6], 'A');
      const seriesB = new Series([3, 5, 7], 'B');
      const result = seriesA.transform(values => values.reduce((a, b) => a * b), [seriesB]);

      const expectedValues = [6, 20, 42]; // Element-wise product of seriesA and seriesB
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.transform() should compute a custom transformation across Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2, 3], 'B');
      const result = seriesA.transform(values => values.join('-'), [seriesB]);

      const expectedValues = ['10-1', '20-2', '30-3']; // Custom transformation as a string
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.transform() should throw an error for Series of different lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2], 'B'); // Shorter length

      try {
        seriesA.transform(values => values.reduce((a, b) => a + b), [seriesB]);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All elements in seriesArray must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.transform() should handle empty Series correctly',
    test: () => {
      const seriesA = new Series([], 'A');
      const seriesB = new Series([], 'B');
      const result = seriesA.transform(values => values.reduce((a, b) => a + b, 0), [seriesB]);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.transform() should handle large Series efficiently',
    test: () => {
      const largeArrayA = Array.from({ length: 10000 }, (_, i) => i);
      const largeArrayB = Array.from({ length: 10000 }, (_, i) => i * 2);
      const seriesA = new Series(largeArrayA, 'A');
      const seriesB = new Series(largeArrayB, 'B');
      const result = seriesA.transform(values => values.reduce((a, b) => a + b), [seriesB]);

      const expectedValues = largeArrayA.map((value, index) => value + largeArrayB[index]);
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
];
