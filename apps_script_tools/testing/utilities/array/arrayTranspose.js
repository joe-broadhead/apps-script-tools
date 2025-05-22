ARRAY_TRANSPOSE_TESTS = [
  {
    description: 'arrayTranspose() should transpose a square matrix',
    test: () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      const expectedTranspose = [
        [1, 4, 7],
        [2, 5, 8],
        [3, 6, 9]
      ];
      const result = arrayTranspose(array);

      if (JSON.stringify(result) !== JSON.stringify(expectedTranspose)) {
        throw new Error(`Expected ${JSON.stringify(expectedTranspose)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayTranspose() should transpose a non-square matrix',
    test: () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6]
      ];
      const expectedTranspose = [
        [1, 4],
        [2, 5],
        [3, 6]
      ];
      const result = arrayTranspose(array);

      if (JSON.stringify(result) !== JSON.stringify(expectedTranspose)) {
        throw new Error(`Expected ${JSON.stringify(expectedTranspose)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayTranspose() should handle an empty matrix',
    test: () => {
      const array = [];
      const expectedTranspose = [];
      const result = arrayTranspose(array);

      if (JSON.stringify(result) !== JSON.stringify(expectedTranspose)) {
        throw new Error(`Expected ${JSON.stringify(expectedTranspose)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayTranspose() should handle a single-row matrix',
    test: () => {
      const array = [
        [1, 2, 3]
      ];
      const expectedTranspose = [
        [1],
        [2],
        [3]
      ];
      const result = arrayTranspose(array);

      if (JSON.stringify(result) !== JSON.stringify(expectedTranspose)) {
        throw new Error(`Expected ${JSON.stringify(expectedTranspose)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayTranspose() should handle a single-column matrix',
    test: () => {
      const array = [
        [1],
        [2],
        [3]
      ];
      const expectedTranspose = [
        [1, 2, 3]
      ];
      const result = arrayTranspose(array);

      if (JSON.stringify(result) !== JSON.stringify(expectedTranspose)) {
        throw new Error(`Expected ${JSON.stringify(expectedTranspose)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayTranspose() should handle a matrix with mixed data types',
    test: () => {
      const array = [
        [1, "a", true],
        [null, undefined, 3.5]
      ];
      const expectedTranspose = [
        [1, null],
        ["a", undefined],
        [true, 3.5]
      ];
      const result = arrayTranspose(array);

      if (JSON.stringify(result) !== JSON.stringify(expectedTranspose)) {
        throw new Error(`Expected ${JSON.stringify(expectedTranspose)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayTranspose() should throw an error for a jagged matrix',
    test: () => {
      const array = [
        [1, 2],
        [3, 4, 5]
      ];
      try {
        arrayTranspose(array);
        throw new Error('Expected an error for a jagged matrix, but none was thrown');
      } catch (error) {
        const expectedMessage = "Input array must be a non-jagged matrix where all rows have the same length.";
        if (error.message !== expectedMessage) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  }
];
