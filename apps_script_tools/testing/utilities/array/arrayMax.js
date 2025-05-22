ARRAY_MAX_TESTS = [
  {
    description: 'arrayMax() should correctly identify the maximum value in an array of numbers',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayMax(array);

      const expectedMax = 5;
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMax() should ignore non-numeric values and calculate the maximum correctly',
    test: () => {
      const array = [1, "2", "text", null, undefined, 4, NaN, true];
      const result = arrayMax(array);

      const expectedMax = 4;
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMax() should return undefined for an empty array',
    test: () => {
      const array = [];
      const result = arrayMax(array);

      const expectedMax = undefined;
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMax() should return undefined for an array with only non-numeric values',
    test: () => {
      const array = ["text", null, undefined, NaN, false];
      const result = arrayMax(array);

      const expectedMax = 0;
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMax() should correctly identify the maximum value in an array of negative numbers',
    test: () => {
      const array = [-1, -2, -3, -4, -5];
      const result = arrayMax(array);

      const expectedMax = -1;
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMax() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayMax(largeArray);

      const expectedMax = 10000;
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMax() should correctly identify the maximum value in an array with mixed signs',
    test: () => {
      const array = [-10, -20, 0, 15, 5];
      const result = arrayMax(array);

      const expectedMax = 15;
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    }
  }
];
