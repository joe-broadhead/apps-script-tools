SERIES_MEAN_TESTS = [
  {
    description: 'Series.mean() should compute the mean of numeric values',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.mean();

      const expectedMean = 20; // (10 + 20 + 30) / 3
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should compute the mean while ignoring non-numeric elements',
    test: () => {
      const series = new Series([10, "20", true, null, undefined, "text"], 'values');
      const result = series.mean();

      const expectedMean = 10.333333333333334; // (10 + 20 + 1) / 3
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should return null for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.mean();

      if (result !== null) {
        throw new Error(`Expected null, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should skip NaN values and compute the mean of valid numeric elements',
    test: () => {
      const series = new Series([10, NaN, 20, "30"], 'values');
      const result = series.mean();

      const expectedMean = 20; // (10 + 20 + 30) / 3
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should include null and undefined values when specified',
    test: () => {
      const series = new Series([10, null, 20, undefined, 30], 'values');
      const result = series.mean(false);

      const expectedMean = 12; // (10 + 0 + 20 + 0 + 30) / 5
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // 100 unique values repeated
      const series = new Series(largeArray, 'large');
      const result = series.mean();

      const expectedMean = 49.5; // Mean of numbers from 0 to 99
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should return null for a Series with only null or undefined values',
    test: () => {
      const series = new Series([null, undefined, null], 'empty');
      const result = series.mean();

      if (result !== null) {
        throw new Error(`Expected null, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should compute the mean for a Series with negative values',
    test: () => {
      const series = new Series([-10, -20, -30], 'values');
      const result = series.mean();

      const expectedMean = -20; // (-10 + -20 + -30) / 3
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should compute the mean for a Series with decimal values',
    test: () => {
      const series = new Series([1.5, 2.5, 3.5], 'values');
      const result = series.mean();

      const expectedMean = 2.5; // (1.5 + 2.5 + 3.5) / 3
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mean() should return the single value for a Series with one element',
    test: () => {
      const series = new Series([10], 'values');
      const result = series.mean();

      const expectedMean = 10; // Single value is the mean
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    },
  },
];
