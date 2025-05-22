ARRAY_MIN_TESTS = [
  {
    description: 'arrayMin() should correctly identify the minimum value in an array of numbers',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayMin(array);

      const expectedMin = 1; // Minimum value in the array
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMin() should ignore non-numeric values and calculate the minimum correctly',
    test: () => {
      const array = [1, "2", "text", null, undefined, 4, NaN, true];
      const result = arrayMin(array);

      const expectedMin = 1; // Numeric values are [1, 2, 4, 1]; true is treated as 1
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMin() should return undefined for an empty array',
    test: () => {
      const array = [];
      const result = arrayMin(array);

      const expectedMin = undefined; // No elements to evaluate
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMin() should return undefined for an array with only non-numeric values',
    test: () => {
      const array = ["text", null, undefined, NaN, false];
      const result = arrayMin(array);

      const expectedMin = 0;
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMin() should correctly identify the minimum value in an array of negative numbers',
    test: () => {
      const array = [-1, -2, -3, -4, -5];
      const result = arrayMin(array);

      const expectedMin = -5; // Minimum value in the array
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMin() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayMin(largeArray);

      const expectedMin = 1; // Minimum value in the array
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMin() should correctly identify the minimum value in an array with mixed signs',
    test: () => {
      const array = [-10, -5, 0, 5, 10];
      const result = arrayMin(array);

      const expectedMin = -10; // Minimum value in the array
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    }
  }
];
