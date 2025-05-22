ARRAY_UNIQUE_TESTS = [
  {
    description: 'arrayUnique() should return unique elements from an array with duplicates',
    test: () => {
      const array = [1, 2, 2, 3, 3, 3];
      const result = arrayUnique(array);

      const expected = [1, 2, 3];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnique() should handle an empty array',
    test: () => {
      const array = [];
      const result = arrayUnique(array);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnique() should handle an array with mixed data types',
    test: () => {
      const array = [1, "1", 2, true, "true", false, null, null, undefined, undefined];
      const result = arrayUnique(array);

      const expected = [1, "1", 2, true, "true", false, null, undefined];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnique() should handle nested arrays',
    test: () => {
      const array = [[1, 2], [1, 2], [3, 4]];
      const result = arrayUnique(array);

      const expected = [[1, 2], [3, 4]];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnique() should handle large arrays efficiently',
    test: () => {
      const largeArray = Array.from({ length: 100000 }).map((_, i) => i % 1000);
      const result = arrayUnique(largeArray);

      const expected = Array.from({ length: 1000 }).map((_, i) => i);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
