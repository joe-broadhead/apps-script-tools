SERIES_GREATER_THAN_OR_EQUAL_TO_TESTS = [
  {
    description: 'Series.greaterThanOrEqual() should compare each element with the corresponding element in another Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([10, 25, 30], 'B');
      const result = seriesA.greaterThanOrEqual(seriesB);

      const expectedValues = [true, false, true]; // Compare: 10>=10=true, 20>=25=false, 30>=30=true
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThanOrEqual() should compare each element with a scalar value',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.greaterThanOrEqual(20);

      const expectedValues = [false, true, true]; // Compare: 10>=20=false, 20>=20=true, 30>=20=true
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThanOrEqual() should return an empty Series when comparing an empty Series against a scalar',
    test: () => {
      const series = new Series([], 'A');
      const result = series.greaterThanOrEqual(20);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThanOrEqual() should throw an error when comparing Series of different lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([10, 25], 'B'); // Shorter length

      try {
        seriesA.greaterThanOrEqual(seriesB);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All elements in seriesArray must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.greaterThanOrEqual() should handle comparisons with mixed data types',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.greaterThanOrEqual(10);

      const expectedValues = [true, true, false, false]; // Compare: 10>=10=true, "20">=10=true, true(1)>=10=false, null>=10=false
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.greaterThanOrEqual() should handle large Series compared against a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = series.greaterThanOrEqual(5000);

      const expectedValues = largeArray.map(value => value >= 5000); // Compare each element with scalar 5000
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
