SERIES_GREATER_THAN_TESTS = [
  {
    description: 'Series.greaterThan() should compare each element with the corresponding element in another Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([15, 10, 25], 'B');
      const result = seriesA.greaterThan(seriesB);

      const expectedValues = [false, true, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThan() should compare each element with a scalar value',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.greaterThan(15);

      const expectedValues = [false, true, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThan() should return an empty Series when comparing an empty Series against a scalar',
    test: () => {
      const series = new Series([], 'A');
      const result = series.greaterThan(15);

      const expectedValues = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThan() should throw an error when comparing Series of different lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([15, 10], 'B');

      try {
        seriesA.greaterThan(seriesB);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All elements in seriesArray must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.greaterThan() should handle comparisons with mixed data types',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.greaterThan(5);

      const expectedValues = [true, true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThan() should handle large Series compared against a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = series.greaterThan(5000);

      const expectedValues = largeArray.map(value => value > 5000);
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
