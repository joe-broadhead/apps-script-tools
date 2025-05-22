SERIES_LESS_THAN_OR_EQUAL_TO_TESTS = [
  {
    description: 'Series.lessThanOrEqual() should compare each element with the corresponding element in another Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([15, 20, 25], 'B');
      const result = seriesA.lessThanOrEqual(seriesB);

      const expectedValues = [true, true, false]; // Compare: 10<=15=true, 20<=20=true, 30<=25=false
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.lessThanOrEqual() should compare each element with a scalar value',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.lessThanOrEqual(20);

      const expectedValues = [true, true, false]; // Compare: 10<=20=true, 20<=20=true, 30<=20=false
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.lessThanOrEqual() should return an empty Series when comparing an empty Series against a scalar',
    test: () => {
      const series = new Series([], 'A');
      const result = series.lessThanOrEqual(20);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.lessThanOrEqual() should throw an error when comparing Series of different lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([15, 20], 'B'); // Shorter length

      try {
        seriesA.lessThanOrEqual(seriesB);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All elements in seriesArray must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.lessThanOrEqual() should handle comparisons with mixed data types',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.lessThanOrEqual(10);

      const expectedValues = [true, false, true, true]; // Compare: 10<=10=true, "20"<=10=false, true(1)<=10=true, null<=10=true
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.lessThanOrEqual() should handle large Series compared against a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = series.lessThanOrEqual(5000);

      const expectedValues = largeArray.map(value => value <= 5000); // Compare each element with scalar 5000
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
