SERIES_FROM_VALUE_TESTS = [
  {
    description: 'Series.fromValue() should create a Series with repeated scalar values',
    test: () => {
      const result = Series.fromValue(42, 5, 'repeated');

      const expectedArray = [42, 42, 42, 42, 42];
      const expectedName = 'repeated';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromValue() should handle non-numeric values',
    test: () => {
      const result = Series.fromValue('text', 3, 'strings');

      const expectedArray = ['text', 'text', 'text'];
      const expectedName = 'strings';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromValue() should create a Series with `null` values',
    test: () => {
      const result = Series.fromValue(null, 4, 'nulls');

      const expectedArray = [null, null, null, null];
      const expectedName = 'nulls';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromValue() should handle a length of zero',
    test: () => {
      const result = Series.fromValue(42, 0, 'empty');

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
    description: 'Series.fromValue() should handle boolean values',
    test: () => {
      const result = Series.fromValue(true, 3, 'booleans');

      const expectedArray = [true, true, true];
      const expectedName = 'booleans';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromValue() should throw an error for negative length',
    test: () => {
      try {
        Series.fromValue(42, -5, 'error');
        throw new Error('Expected an error for negative length, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Invalid array length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
];
