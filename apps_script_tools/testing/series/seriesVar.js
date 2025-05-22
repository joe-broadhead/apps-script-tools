SERIES_VAR_TESTS = [
  {
    description: 'Series.var() should calculate the variance of a numeric Series',
    test: () => {
      const series = new Series([10, 20, 30, 40, 50], 'numeric');
      const mean = 30;
      const expectedVariance = ((10 - mean) ** 2 + (20 - mean) ** 2 + (30 - mean) ** 2 + (40 - mean) ** 2 + (50 - mean) ** 2) / 4;
      const result = series.var();

      if (result !== expectedVariance) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.var() should return NaN for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.var();

      if (result !== null) {
        throw new Error(`Expected NaN, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.var() should calculate the variance of a Series with negative numbers',
    test: () => {
      const series = new Series([-10, -20, -30, -40, -50], 'negative');
      const mean = -30;
      const expectedVariance = ((-10 - mean) ** 2 + (-20 - mean) ** 2 + (-30 - mean) ** 2 + (-40 - mean) ** 2 + (-50 - mean) ** 2) / 4;
      const result = series.var();

      if (result !== expectedVariance) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.var() should handle a Series with mixed types',
    test: () => {
      const series = new Series([10, "20", null, undefined, NaN, 30, true], 'mixed');
      const validNumbers = [10, 20, 30, 1];
      const mean = validNumbers.reduce((sum, val) => sum + val, 0) / validNumbers.length;
      const expectedVariance = validNumbers.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (validNumbers.length - 1);

      const result = series.var();

      if (Math.abs(result - expectedVariance) > 1e-10) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.var() should return 0 for a Series with identical values',
    test: () => {
      const series = new Series([5, 5, 5, 5, 5], 'identical');
      const expectedVariance = 0; // No variation
      const result = series.var();

      if (result !== expectedVariance) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.var() should handle a large numeric Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const series = new Series(largeArray, 'large');
      const mean = largeArray.reduce((sum, num) => sum + num, 0) / largeArray.length;

      const expectedVariance =
        largeArray.reduce((sum, num) => sum + (num - mean) ** 2, 0) /
        (largeArray.length - 1);

      const result = series.var();

      if (Math.abs(result - expectedVariance) > 1e-10) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  }
];
