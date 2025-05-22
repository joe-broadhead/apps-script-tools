ARRAY_DIFFERENCE_TESTS = [
  {
    description: 'arrayDifference() should return elements in arrayA that are not in arrayB',
    test: () => {
      const arrayA = [1, 2, 3, 4];
      const arrayB = [3, 4, 5, 6];
      const result = arrayDifference(arrayA, arrayB);

      const expected = [1, 2];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayDifference() should return an empty array when arrayA is empty',
    test: () => {
      const arrayA = [];
      const arrayB = [1, 2, 3];
      const result = arrayDifference(arrayA, arrayB);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayDifference() should return arrayA unchanged when arrayB is empty',
    test: () => {
      const arrayA = [1, 2, 3];
      const arrayB = [];
      const result = arrayDifference(arrayA, arrayB);

      const expected = [1, 2, 3];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayDifference() should handle arrays with mixed data types',
    test: () => {
      const arrayA = [1, "2", true, null];
      const arrayB = ["2", null, false];
      const result = arrayDifference(arrayA, arrayB);

      const expected = [1, true];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayDifference() should handle nested arrays',
    test: () => {
      const arrayA = [[1, 2], [3, 4], [5, 6]];
      const arrayB = [[3, 4], [7, 8]];
      const result = arrayDifference(arrayA, arrayB);

      const expected = [[1, 2], [5, 6]];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayDifference() should handle large arrays efficiently',
    test: () => {
      const arrayA = Array.from({ length: 10000 }, (_, i) => i);
      const arrayB = Array.from({ length: 5000 }, (_, i) => i + 5000);
      const result = arrayDifference(arrayA, arrayB);

      const expected = Array.from({ length: 5000 }, (_, i) => i);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected).slice(0, 50)}..., but got ${JSON.stringify(result).slice(0, 50)}...`);
      }
    }
  }
];
