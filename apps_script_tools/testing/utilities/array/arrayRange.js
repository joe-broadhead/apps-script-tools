ARRAY_RANGE_TESTS = [
  {
    description: 'arrayRange() should calculate the range of an array of numbers',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayRange(array);

      const expectedRange = 4; // 5 - 1
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayRange() should ignore non-numeric values in the array',
    test: () => {
      const array = [1, "2", "text", null, undefined, 4, NaN, true];
      const result = arrayRange(array);

      const expectedRange = 3; // 4 - 1 (true is treated as 1)
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayRange() should return null for an empty array',
    test: () => {
      const array = [];
      const result = arrayRange(array);

      const expectedRange = null; // No numeric elements to evaluate
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayRange() should return null for an array with only non-numeric values',
    test: () => {
      const array = ["text", null, undefined, NaN, false];
      const result = arrayRange(array);

      const expectedRange = 0;
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayRange() should calculate the range of an array with negative numbers',
    test: () => {
      const array = [-10, -20, -30, -40, -50];
      const result = arrayRange(array);

      const expectedRange = 40; // -10 - (-50)
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayRange() should calculate the range of an array with mixed positive and negative numbers',
    test: () => {
      const array = [-10, -5, 0, 5, 10];
      const result = arrayRange(array);

      const expectedRange = 20; // 10 - (-10)
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayRange() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayRange(largeArray);

      const expectedRange = 9999; // 10000 - 1
      if (result !== expectedRange) {
        throw new Error(`Expected ${expectedRange}, but got ${result}`);
      }
    }
  }
];
