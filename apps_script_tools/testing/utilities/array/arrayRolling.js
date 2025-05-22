ARRAY_ROLLING_TESTS = [
  {
    description: 'arrayRolling() should calculate the rolling mean with a valid window size',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayRolling(array, 3, 'mean');

      const expectedRolling = [null, null, 2, 3, 4]; // Mean of [1,2,3], [2,3,4], [3,4,5]
      if (JSON.stringify(result) !== JSON.stringify(expectedRolling)) {
        throw new Error(`Expected ${JSON.stringify(expectedRolling)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRolling() should calculate the rolling sum with a valid window size',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayRolling(array, 2, 'sum');

      const expectedRolling = [null, 3, 5, 7, 9]; // Sum of [1,2], [2,3], [3,4], [4,5]
      if (JSON.stringify(result) !== JSON.stringify(expectedRolling)) {
        throw new Error(`Expected ${JSON.stringify(expectedRolling)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRolling() should calculate the rolling minimum with a valid window size',
    test: () => {
      const array = [5, 4, 3, 2, 1];
      const result = arrayRolling(array, 2, 'min');

      const expectedRolling = [null, 4, 3, 2, 1]; // Min of [5,4], [4,3], [3,2], [2,1]
      if (JSON.stringify(result) !== JSON.stringify(expectedRolling)) {
        throw new Error(`Expected ${JSON.stringify(expectedRolling)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRolling() should calculate the rolling maximum with a valid window size',
    test: () => {
      const array = [5, 4, 3, 2, 1];
      const result = arrayRolling(array, 2, 'max');

      const expectedRolling = [null, 5, 4, 3, 2]; // Max of [5,4], [4,3], [3,2], [2,1]
      if (JSON.stringify(result) !== JSON.stringify(expectedRolling)) {
        throw new Error(`Expected ${JSON.stringify(expectedRolling)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRolling() should return an array of nulls for a window size larger than the array',
    test: () => {
      const array = [1, 2, 3];
      try {
        arrayRolling(array, 4, 'mean');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Invalid window size')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: 'arrayRolling() should throw an error for an invalid operation',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      try {
        arrayRolling(array, 2, 'invalidOperation');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Invalid operation')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: 'arrayRolling() should return an empty array for an empty input array',
    test: () => {
      const array = [];
      const result = arrayRolling(array, 3, 'mean');

      const expectedRolling = []; // No elements in the input array
      if (JSON.stringify(result) !== JSON.stringify(expectedRolling)) {
        throw new Error(`Expected ${JSON.stringify(expectedRolling)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRolling() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayRolling(largeArray, 100, 'sum');

      const expectedRollingStart = Array(99).fill(null).concat([5050]); // Sum of first 100 natural numbers
      if (JSON.stringify(result.slice(0, 100)) !== JSON.stringify(expectedRollingStart)) {
        throw new Error(`Expected ${JSON.stringify(expectedRollingStart)}, but got ${JSON.stringify(result.slice(0, 100))}`);
      }
    }
  }
];
