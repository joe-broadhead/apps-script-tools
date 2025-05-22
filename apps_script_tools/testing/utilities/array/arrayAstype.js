ARRAY_ASTYPE_TESTS = [
  {
    description: 'arrayAstype() should correctly convert all elements to integers',
    test: () => {
      const array = [1.2, "3.5", true, false, null, undefined, NaN];
      const result = arrayAstype(array, 'integer');

      const expected = [1, 3, 1, 0, null, null, null];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayAstype() should correctly convert all elements to floats',
    test: () => {
      const array = [1, "2.5", true, false, null, undefined, NaN];
      const result = arrayAstype(array, 'float');

      const expected = [1, 2.5, 1, 0, null, null, null];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayAstype() should correctly convert all elements to numbers',
    test: () => {
      const array = [1, "2.5", true, false, null, undefined, NaN];
      const result = arrayAstype(array, 'number');

      const expected = [1, 2.5, 1, 0, null, null, null];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayAstype() should correctly convert all elements to booleans',
    test: () => {
      const array = [1, 0, "true", "false", null, undefined, NaN];
      const result = arrayAstype(array, 'boolean');
  
      const expected = [true, false, true, false, null, null, null]; // NaN -> null
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayAstype() should correctly convert all elements to strings',
    test: () => {
      const array = [1, 2.5, true, false, null, undefined, NaN];
      const result = arrayAstype(array, 'string');

      const expected = ["1", "2.5", "true", "false", null, null, null];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayAstype() should return an empty array for an empty input array',
    test: () => {
      const array = [];
      const result = arrayAstype(array, 'integer');

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayAstype() should throw an error for unsupported types',
    test: () => {
      const array = [1, 2, 3];
      try {
        arrayAstype(array, 'unsupportedType');
        throw new Error('Expected an error for unsupported type, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Unsupported type')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  }
];
