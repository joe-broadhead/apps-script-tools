ARRAY_MEAN_TESTS = [
  {
    description: 'arrayMean() should calculate the mean of an array of numbers',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayMean(array);

      const expectedMean = 3; // (1 + 2 + 3 + 4 + 5) / 5
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMean() should ignore null and undefined values by default',
    test: () => {
      const array = [1, null, 3, undefined, 5];
      const result = arrayMean(array);

      const expectedMean = 3; // (1 + 3 + 5) / 3
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMean() should include null and undefined values as 0 when excludeNulls is false',
    test: () => {
      const array = [1, null, 3, undefined, 5];
      const result = arrayMean(array, false);

      const expectedMean = 1.8; // (1 + 0 + 3 + 0 + 5) / 5
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMean() should return null for an empty array',
    test: () => {
      const array = [];
      const result = arrayMean(array);

      const expectedMean = null; // No elements to calculate mean
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMean() should handle an array with only null and undefined values when excludeNulls is true',
    test: () => {
      const array = [null, undefined];
      const result = arrayMean(array);

      const expectedMean = null; // Excludes all elements
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMean() should handle an array with only null and undefined values when excludeNulls is false',
    test: () => {
      const array = [null, undefined];
      const result = arrayMean(array, false);

      const expectedMean = 0; // (0 + 0) / 2
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMean() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayMean(largeArray);

      const expectedMean = 5000.5; // Mean of numbers 1 to 10,000
      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMean() should calculate the mean of an array with mixed types',
    test: () => {
      const array = [1, "2", "three", null, undefined, 4, NaN, true];
      const result = arrayMean(array);

      const validNumbers = [1, 2, 4, 1]; // true is treated as 1
      const expectedMean = validNumbers.reduce((sum, num) => sum + num, 0) / validNumbers.length;

      if (result !== expectedMean) {
        throw new Error(`Expected ${expectedMean}, but got ${result}`);
      }
    }
  }
];
  