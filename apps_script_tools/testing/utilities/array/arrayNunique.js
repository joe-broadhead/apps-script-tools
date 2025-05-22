ARRAY_NUNIQUE_TESTS = [
  {
    description: 'arrayNunique() should return the number of unique elements in an array of numbers',
    test: () => {
      const array = [1, 2, 2, 3, 3, 3, 4];
      const result = arrayNunique(array);

      const expectedNunique = 4; // Unique elements: [1, 2, 3, 4]
      if (result !== expectedNunique) {
        throw new Error(`Expected ${expectedNunique}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayNunique() should return the number of unique elements in an array of mixed data types',
    test: () => {
      const array = [1, "2", "2", null, undefined, "2", 1, true];
      const result = arrayNunique(array);

      const expectedNunique = 5; // Unique elements: [1, "2", null, undefined, true]
      if (result !== expectedNunique) {
        throw new Error(`Expected ${expectedNunique}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayNunique() should return 0 for an empty array',
    test: () => {
      const array = [];
      const result = arrayNunique(array);

      const expectedNunique = 0; // No elements in the array
      if (result !== expectedNunique) {
        throw new Error(`Expected ${expectedNunique}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayNunique() should handle an array with all unique elements',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayNunique(array);

      const expectedNunique = 5; // All elements are unique
      if (result !== expectedNunique) {
        throw new Error(`Expected ${expectedNunique}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayNunique() should handle an array with only non-numeric values',
    test: () => {
      const array = ["a", "b", "b", "c", "a", "b"];
      const result = arrayNunique(array);

      const expectedNunique = 3; // Unique elements: ["a", "b", "c"]
      if (result !== expectedNunique) {
        throw new Error(`Expected ${expectedNunique}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayNunique() should handle an array with repeated null and undefined values',
    test: () => {
      const array = [null, undefined, null, undefined, undefined];
      const result = arrayNunique(array);

      const expectedNunique = 2; // Unique elements: [null, undefined]
      if (result !== expectedNunique) {
        throw new Error(`Expected ${expectedNunique}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayNunique() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // Repeats 0 to 99
      const result = arrayNunique(largeArray);

      const expectedNunique = 100; // Unique elements: [0, 1, ..., 99]
      if (result !== expectedNunique) {
        throw new Error(`Expected ${expectedNunique}, but got ${result}`);
      }
    }
  }
];
