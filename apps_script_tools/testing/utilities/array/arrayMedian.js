ARRAY_MEDIAN_TESTS = [
  {
    description: 'arrayMedian() should calculate the median of an array of numbers with odd length',
    test: () => {
      const array = [1, 3, 5, 7, 9];
      const result = arrayMedian(array);

      const expectedMedian = 5; // Middle value of [1, 3, 5, 7, 9]
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMedian() should calculate the median of an array of numbers with even length',
    test: () => {
      const array = [1, 3, 5, 7];
      const result = arrayMedian(array);

      const expectedMedian = 4; // Average of [3, 5]: (3 + 5) / 2
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMedian() should ignore non-numeric values in the array',
    test: () => {
      const array = [1, "2", "text", null, undefined, 4, NaN, true];
      const result = arrayMedian(array);

      const validNumbers = [1, 2, 4, 1];
      const sorted = validNumbers.sort((a, b) => a - b); // [1, 2, 4, 1]
      const expectedMedian = 1.5; // Median of [1, 2, 4, 1]

      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMedian() should return null for an empty array',
    test: () => {
      const array = [];
      const result = arrayMedian(array);

      const expectedMedian = null; // No elements in the array
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMedian() should calculate the median of an array with negative numbers',
    test: () => {
      const array = [-10, -20, -30, -40, -50];
      const result = arrayMedian(array);

      const expectedMedian = -30; // Middle value of [-50, -40, -30, -20, -10]
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMedian() should calculate the median of an array with mixed positive and negative numbers',
    test: () => {
      const array = [-10, -5, 0, 5, 10];
      const result = arrayMedian(array);

      const expectedMedian = 0; // Middle value of [-10, -5, 0, 5, 10]
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMedian() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayMedian(largeArray);

      const expectedMedian = 5000.5; // Median of numbers 1 to 10,000
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    }
  }
];
