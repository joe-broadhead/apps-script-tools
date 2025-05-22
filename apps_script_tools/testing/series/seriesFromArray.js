SERIES_FROM_ARRAY_TESTS = [
  {
    description: 'Series.fromArray() should create a Series from a flat array',
    test: () => {
      const result = Series.fromArray([1, 2, 3], 'flat');

      const expectedArray = [1, 2, 3];
      const expectedName = 'flat';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromArray() should flatten a nested array into a single-level Series',
    test: () => {
      const result = Series.fromArray([1, [2, [3, 4]], 5], 'nested');

      const expectedArray = [1, 2, 3, 4, 5];
      const expectedName = 'nested';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromArray() should handle an empty array',
    test: () => {
      const result = Series.fromArray([], 'empty');

      const expectedArray = [];
      const expectedName = 'empty';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromArray() should handle a deeply nested array',
    test: () => {
      const result = Series.fromArray([[1, 2], [[3, [4]]], 5], 'deep');

      const expectedArray = [1, 2, 3, 4, 5];
      const expectedName = 'deep';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromArray() should handle arrays with mixed types',
    test: () => {
      const result = Series.fromArray([1, 'text', [true, null], [undefined, 5]], 'mixed');

      const expectedArray = [1, 'text', true, null, undefined, 5];
      const expectedName = 'mixed';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromArray() should throw an error if the input is not an array',
    test: () => {
      try {
        Series.fromArray('notAnArray', 'error');
        throw new Error('Expected an error for non-array input, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Input must be an array')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
];
