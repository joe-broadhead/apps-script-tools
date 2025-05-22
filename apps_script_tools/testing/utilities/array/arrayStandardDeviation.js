ARRAY_STANDARD_DEVIATION_TESTS = [
  {
    description: 'arrayStandardDeviation() should calculate the standard deviation of a numeric array',
    test: () => {
      const array = [10, 20, 30, 40, 50];
      const mean = 30;
      const variance = ((10 - mean) ** 2 + (20 - mean) ** 2 + (30 - mean) ** 2 + (40 - mean) ** 2 + (50 - mean) ** 2) / 4;
      const expectedStdDev = Math.sqrt(variance);
      const result = arrayStandardDeviation(array);

      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayStandardDeviation() should return NaN for an empty array',
    test: () => {
      const array = [];
      const result = arrayStandardDeviation(array);

      if (result !== null) {
        throw new Error(`Expected null, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayStandardDeviation() should calculate the standard deviation of an array with negative numbers',
    test: () => {
      const array = [-10, -20, -30, -40, -50];
      const mean = -30;
      const variance = ((-10 - mean) ** 2 + (-20 - mean) ** 2 + (-30 - mean) ** 2 + (-40 - mean) ** 2 + (-50 - mean) ** 2) / 4;
      const expectedStdDev = Math.sqrt(variance);
      const result = arrayStandardDeviation(array);

      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayStandardDeviation() should calculate the standard deviation of an array with mixed types',
    test: () => {
      const array = [10, "20", null, undefined, NaN, 30, true]; // Valid numbers: [10, 20, 30, 1]
      const mean = (10 + 20 + 30 + 1) / 4; // Mean = 15.25
      const variance = ((10 - mean) ** 2 + (20 - mean) ** 2 + (30 - mean) ** 2 + (1 - mean) ** 2) / 3;
      const expectedStdDev = Math.sqrt(variance);
      const result = arrayStandardDeviation(array);

      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayStandardDeviation() should return 0 for an array with identical values',
    test: () => {
      const array = [5, 5, 5, 5, 5];
      const expectedStdDev = 0; // No variation
      const result = arrayStandardDeviation(array);

      if (result !== expectedStdDev) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayStandardDeviation() should handle a large numeric array efficiently',
    test: () => {
      const n = 10000;
      const mean = (n * (n + 1)) / (2 * n); // Mean
      const sumOfSquares = (n * (n + 1) * (2 * n + 1)) / 6;
      const variance = (sumOfSquares - n * mean ** 2) / (n - 1); // Variance
      const expectedStdDev = Math.sqrt(variance);
  
      const largeArray = Array.from({ length: n }, (_, i) => i + 1);
      const result = arrayStandardDeviation(largeArray);
  
      if (Math.abs(result - expectedStdDev) > 1e-10) {
        throw new Error(`Expected ${expectedStdDev}, but got ${result}`);
      }  
    }
  }
];
