ARRAY_LEN_TESTS = [
  {
    description: 'arrayLen() should correctly calculate the length of a non-empty array',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayLen(array);
    
      const expectedLength = 5;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayLen() should return 0 for an empty array',
    test: () => {
      const array = [];
      const result = arrayLen(array);
    
      const expectedLength = 0;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayLen() should correctly calculate the length of an array with mixed data types',
    test: () => {
      const array = [10, "text", null, undefined, true];
      const result = arrayLen(array);
    
      const expectedLength = 5;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayLen() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 100000 });
      const result = arrayLen(largeArray);
    
      const expectedLength = 100000;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayLen() should calculate the length of an array with nested arrays (top-level only)',
    test: () => {
      const array = [1, [2, 3], [4, 5, 6], 7];
      const result = arrayLen(array);
    
      const expectedLength = 4; // Counts the top-level elements only
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  }
];
