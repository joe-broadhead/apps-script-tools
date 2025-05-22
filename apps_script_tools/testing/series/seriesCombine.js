SERIES_COMBINE_TESTS = [
  {
    description: 'Series.combine() should correctly combine multiple Series',
    test: () => {
      const seriesA = new Series([1, 2, 3], 'a');
      const seriesB = new Series([4, 5, 6], 'b');
      const seriesC = new Series([7, 8, 9], 'c');

      const result = seriesA.combine(seriesB, seriesC);

      const expectedValues = [
        { a: 1, b: 4, c: 7 },
        { a: 2, b: 5, c: 8 },
        { a: 3, b: 6, c: 9 }
      ];
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.combine() should correctly combine with a single Series',
    test: () => {
      const seriesA = new Series([1, 2, 3], 'a');
      const seriesB = new Series([4, 5, 6], 'b');

      const result = seriesA.combine(seriesB);

      const expectedValues = [
        { a: 1, b: 4 },
        { a: 2, b: 5 },
        { a: 3, b: 6 }
      ];
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.combine() should throw an error when Series have different lengths',
    test: () => {
      const seriesA = new Series([1, 2, 3], 'a');
      const seriesB = new Series([4, 5], 'b'); // Mismatched length

      try {
        seriesA.combine(seriesB);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All arguments must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.combine() should throw an error if a non-Series argument is provided',
    test: () => {
      const seriesA = new Series([1, 2, 3], 'a');
      const nonSeries = [4, 5, 6]; // Array instead of Series

      try {
        seriesA.combine(nonSeries);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All arguments must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.combine() should return an empty array when applied to an empty Series',
    test: () => {
      const seriesA = new Series([], 'a');
      const seriesB = new Series([], 'b');

      const result = seriesA.combine(seriesB);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.combine() should handle large Series efficiently',
    test: () => {
      const largeArray1 = Array.from({ length: 10000 }, (_, i) => i);
      const largeArray2 = Array.from({ length: 10000 }, (_, i) => i * 2);
      const seriesA = new Series(largeArray1, 'a');
      const seriesB = new Series(largeArray2, 'b');

      const result = seriesA.combine(seriesB);

      const expectedValues = largeArray1.map((value, index) => ({
        a: value,
        b: largeArray2[index]
      }));
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
];
