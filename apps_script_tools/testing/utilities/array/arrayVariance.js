ARRAY_VARIANCE_TESTS = [
  {
    description: 'arrayVariance() should calculate the variance of a numeric array',
    test: () => {
      const array = [10, 20, 30, 40, 50];
      const mean = 30;
      const expectedVariance = ((10 - mean) ** 2 + (20 - mean) ** 2 + (30 - mean) ** 2 + (40 - mean) ** 2 + (50 - mean) ** 2) / 4;
      const result = arrayVariance(array);

      if (result !== expectedVariance) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayVariance() should return NaN for an empty array',
    test: () => {
      const array = [];
      const result = arrayVariance(array);

      if (result !== null) {
        throw new Error(`Expected NaN, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayVariance() should calculate the variance of an array with negative numbers',
    test: () => {
      const array = [-10, -20, -30, -40, -50];
      const mean = -30;
      const expectedVariance = ((-10 - mean) ** 2 + (-20 - mean) ** 2 + (-30 - mean) ** 2 + (-40 - mean) ** 2 + (-50 - mean) ** 2) / 4;
      const result = arrayVariance(array);

      if (result !== expectedVariance) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayVariance() should handle an array with mixed types',
    test: () => {
      const array = [10, "20", null, undefined, NaN, 30, true]; // Valid numbers: [10, 20, 30, 1]
      const mean = (10 + 20 + 30 + 1) / 4; // Mean = 15.25
      const expectedVariance =
        ((10 - mean) ** 2 + (20 - mean) ** 2 + (30 - mean) ** 2 + (1 - mean) ** 2) / 3; // Variance
  
      const result = arrayVariance(array);
  
      if (Math.abs(result - expectedVariance) > 1e-10) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayVariance() should return 0 for an array with identical values',
    test: () => {
      const array = [5, 5, 5, 5, 5];
      const expectedVariance = 0; // No variation
      const result = arrayVariance(array);

      if (result !== expectedVariance) {
        throw new Error(`Expected ${expectedVariance}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayVariance() should handle a large numeric array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const mean = largeArray.reduce((sum, num) => sum + num, 0) / largeArray.length;
  
      const variance =
        largeArray.reduce((sum, num) => sum + (num - mean) ** 2, 0) /
        (largeArray.length - 1);
  
      const result = arrayVariance(largeArray);
  
      if (Math.abs(result - variance) > 1e-10) {
        throw new Error(`Expected ${variance}, but got ${result}`);
      }
    }
  }
];
