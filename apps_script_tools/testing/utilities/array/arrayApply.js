ARRAY_APPLY_TESTS = [
  {
    description: 'arrayApply() should apply a single function to all elements in the array',
    test: () => {
      const array = [1, 2, 3, 4];
      const funcsWithArgs = [[(value) => value * 2]]; // Multiply each element by 2
      const result = arrayApply(array, funcsWithArgs);

      const expected = [2, 4, 6, 8];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayApply() should apply multiple functions to all elements in the array',
    test: () => {
      const array = [1, 2, 3, 4];
      const funcsWithArgs = [
        [(value) => value * 2], // Multiply by 2
        [(value) => value + 1]  // Add 1
      ];
      const result = arrayApply(array, funcsWithArgs);

      const expected = [3, 5, 7, 9]; // (1*2)+1, (2*2)+1, etc.
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayApply() should handle functions with additional arguments',
    test: () => {
      const array = [1, 2, 3, 4];
      const funcsWithArgs = [
        [(value, factor) => value * factor, 3], // Multiply by 3
        [(value, increment) => value + increment, 2] // Add 2
      ];
      const result = arrayApply(array, funcsWithArgs);

      const expected = [5, 8, 11, 14]; // ((1*3)+2), ((2*3)+2), etc.
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayApply() should return the same array when no functions are provided',
    test: () => {
      const array = [1, 2, 3, 4];
      const funcsWithArgs = []; // No functions
      const result = arrayApply(array, funcsWithArgs);

      const expected = [1, 2, 3, 4];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayApply() should handle an empty array',
    test: () => {
      const array = [];
      const funcsWithArgs = [[(value) => value * 2]];
      const result = arrayApply(array, funcsWithArgs);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayApply() should correctly handle functions that return null',
    test: () => {
      const array = [1, 2, 3];
      const funcsWithArgs = [[(value) => (value > 2 ? null : value)]];
      const result = arrayApply(array, funcsWithArgs);

      const expected = [1, 2, null];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayApply() should handle a function that does not modify the input value',
    test: () => {
      const array = [1, 2, 3, 4];
      const funcsWithArgs = [[(value) => value]]; // Identity function
      const result = arrayApply(array, funcsWithArgs);

      const expected = [1, 2, 3, 4];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
