ARRAY_UNION_TESTS = [
  {
    description: 'arrayUnion() should return the union of two arrays with distinct elements',
    test: () => {
      const arrayA = [1, 2, 3];
      const arrayB = [3, 4, 5];
      const result = arrayUnion(arrayA, arrayB, true);

      const expectedUnion = [1, 2, 3, 4, 5];
      if (JSON.stringify(result) !== JSON.stringify(expectedUnion)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnion)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnion() should return the union of two arrays with duplicates included (distinct = false)',
    test: () => {
      const arrayA = [1, 2, 3];
      const arrayB = [3, 4, 5];
      const result = arrayUnion(arrayA, arrayB, false);

      const expectedUnion = [1, 2, 3, 3, 4, 5];
      if (JSON.stringify(result) !== JSON.stringify(expectedUnion)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnion)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnion() should handle empty arrays correctly',
    test: () => {
      const arrayA = [];
      const arrayB = [1, 2, 3];
      const result = arrayUnion(arrayA, arrayB, true);

      const expectedUnion = [1, 2, 3];
      if (JSON.stringify(result) !== JSON.stringify(expectedUnion)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnion)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnion() should return an empty array if both arrays are empty',
    test: () => {
      const arrayA = [];
      const arrayB = [];
      const result = arrayUnion(arrayA, arrayB, true);

      const expectedUnion = [];
      if (JSON.stringify(result) !== JSON.stringify(expectedUnion)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnion)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnion() should handle arrays with mixed data types',
    test: () => {
      const arrayA = [1, "apple", true];
      const arrayB = [null, "apple", false];
      const result = arrayUnion(arrayA, arrayB, true);

      const expectedUnion = [1, "apple", true, null, false];
      if (JSON.stringify(result) !== JSON.stringify(expectedUnion)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnion)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayUnion() should handle arrays with nested structures',
    test: () => {
      const arrayA = [[1, 2], [3, 4]];
      const arrayB = [[3, 4], [5, 6]];
      const result = arrayUnion(arrayA, arrayB, true);

      const expectedUnion = [[1, 2], [3, 4], [5, 6]];
      if (JSON.stringify(result) !== JSON.stringify(expectedUnion)) {
        throw new Error(`Expected ${JSON.stringify(expectedUnion)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
