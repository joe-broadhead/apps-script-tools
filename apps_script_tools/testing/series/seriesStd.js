SERIES_STD_TESTS = [
  {
    description: 'Series.std() should calculate the standard deviation of a numeric Series',
    test: () => {
      const series = new Series([10, 20, 30, 40, 50], 'numeric');
      const mean = 30;
      const variance = ((10 - mean) ** 2 + (20 - mean) ** 2 + (30 - mean) ** 2 + (40 - mean) ** 2 + (50 - mean) ** 2) / 4;
      const expectedStdDev = Math.sqrt(variance);
      const result = series.std();

      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.std() should return NaN for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.std();

      if (result !== null) {
        throw new Error(`Expected null, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.std() should calculate the standard deviation of a Series with negative numbers',
    test: () => {
      const series = new Series([-10, -20, -30, -40, -50], 'negative');
      const mean = -30;
      const variance = ((-10 - mean) ** 2 + (-20 - mean) ** 2 + (-30 - mean) ** 2 + (-40 - mean) ** 2 + (-50 - mean) ** 2) / 4;
      const expectedStdDev = Math.sqrt(variance);
      const result = series.std();

      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.std() should calculate the standard deviation of a Series with mixed types',
    test: () => {
      const series = new Series([10, "20", null, undefined, NaN, 30, true], 'mixed');
      const validNumbers = [10, 20, 30, 1];
      const mean = validNumbers.reduce((sum, val) => sum + val, 0) / validNumbers.length;
      const variance = validNumbers.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (validNumbers.length - 1);
      const expectedStdDev = Math.sqrt(variance);
      const result = series.std();

      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.std() should return 0 for a Series with identical values',
    test: () => {
      const series = new Series([5, 5, 5, 5, 5], 'identical');
      const expectedStdDev = 0; // No variation
      const result = series.std();

      if (result !== expectedStdDev) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.std() should handle a large numeric Series efficiently',
    test: () => {
      const n = 10000;
      const series = new Series(Array.from({ length: n }, (_, i) => i + 1), 'large');
      const mean = (n * (n + 1)) / (2 * n); // Mean
      const sumOfSquares = (n * (n + 1) * (2 * n + 1)) / 6;
      const variance = (sumOfSquares - n * mean ** 2) / (n - 1); // Variance
      const expectedStdDev = Math.sqrt(variance);
      const result = series.std();

      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  }
];
