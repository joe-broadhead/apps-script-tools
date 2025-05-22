ARRAY_INTERSECT_TESTS = [
  {
    description: 'arrayIntersect() should return common elements between two arrays',
    test: () => {
      const arrayA = [1, 2, 3, 4];
      const arrayB = [3, 4, 5, 6];
      const result = arrayIntersect(arrayA, arrayB);

      const expected = [3, 4];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayIntersect() should return an empty array if there are no common elements',
    test: () => {
      const arrayA = [1, 2];
      const arrayB = [3, 4];
      const result = arrayIntersect(arrayA, arrayB);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayIntersect() should handle an empty array as input',
    test: () => {
      const arrayA = [];
      const arrayB = [1, 2, 3];
      const result = arrayIntersect(arrayA, arrayB);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayIntersect() should handle arrays with mixed data types',
    test: () => {
      const arrayA = [1, "2", true, null];
      const arrayB = ["2", null, false];
      const result = arrayIntersect(arrayA, arrayB);

      const expected = ["2", null];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayIntersect() should handle nested arrays correctly',
    test: () => {
      const arrayA = [[1, 2], [3, 4], [5, 6]];
      const arrayB = [[3, 4], [7, 8]];
      const result = arrayIntersect(arrayA, arrayB);

      const expected = [[3, 4]];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayIntersect() should handle large arrays efficiently',
    test: () => {
      const arrayA = Array.from({ length: 10000 }, (_, i) => i);
      const arrayB = Array.from({ length: 5000 }, (_, i) => i + 5000);
      const result = arrayIntersect(arrayA, arrayB);

      const expected = Array.from({ length: 5000 }, (_, i) => i + 5000);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
