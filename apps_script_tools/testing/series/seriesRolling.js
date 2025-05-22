SERIES_ROLLING_TESTS = [
  {
    description: 'Series.rolling() should compute the rolling mean',
    test: () => {
      const series = new Series([10, 20, 30, 40, 50], 'values');
      const result = series.rolling(3, 'mean');

      const expectedRollingMean = [null, null, 20, 30, 40]; // First 2 elements are null; 3-element rolling mean
      if (JSON.stringify(result.array) !== JSON.stringify(expectedRollingMean)) {
        throw new Error(`Expected ${JSON.stringify(expectedRollingMean)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.rolling() should compute the rolling sum',
    test: () => {
      const series = new Series([10, 20, 30, 40, 50], 'values');
      const result = series.rolling(3, 'sum');

      const expectedRollingSum = [null, null, 60, 90, 120]; // First 2 elements are null; 3-element rolling sum
      if (JSON.stringify(result.array) !== JSON.stringify(expectedRollingSum)) {
        throw new Error(`Expected ${JSON.stringify(expectedRollingSum)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.rolling() should throw an error for unsupported operations',
    test: () => {
      const series = new Series([10, 20, 30, 40, 50], 'values');
      try {
        series.rolling(3, 'unsupported');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (error.message !== "Invalid operation. Choose 'mean', 'sum', 'min', or 'max'.") {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.rolling() should throw an error for invalid window size',
    test: () => {
      const series = new Series([10, 20, 30, 40, 50], 'values');
      try {
        series.rolling(-1, 'mean');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (error.message !== "Invalid window size") {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.rolling() should return an empty Series for an empty input',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.rolling(3, 'mean');

      const expectedRolling = []; // Empty Series
      if (JSON.stringify(result.array) !== JSON.stringify(expectedRolling)) {
        throw new Error(`Expected ${JSON.stringify(expectedRolling)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.rolling() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // Values 1 to 10,000
      const series = new Series(largeArray, 'large');
      const result = series.rolling(50, 'mean');

      const expectedRollingMean = largeArray.map((_, idx) => {
        if (idx < 49) return null;
        const window = largeArray.slice(idx - 49, idx + 1);
        return arrayMean(window);
      });

      if (JSON.stringify(result.array) !== JSON.stringify(expectedRollingMean)) {
        throw new Error('Rolling operation failed for large Series');
      }
    },
  },
];
