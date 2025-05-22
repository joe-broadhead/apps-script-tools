ARRAY_VALUE_COUNTS_TESTS = [
  {
    description: 'arrayValueCounts() should count occurrences of each value in an array',
    test: () => {
      const array = [1, 2, 2, 3, 3, 3];
      const result = arrayValueCounts(array);

      const expectedCounts = { "1": 1, "2": 2, "3": 3 };
      if (JSON.stringify(result) !== JSON.stringify(expectedCounts)) {
        throw new Error(`Expected ${JSON.stringify(expectedCounts)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayValueCounts() should handle an empty array',
    test: () => {
      const array = [];
      const result = arrayValueCounts(array);

      const expectedCounts = {};
      if (JSON.stringify(result) !== JSON.stringify(expectedCounts)) {
        throw new Error(`Expected ${JSON.stringify(expectedCounts)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayValueCounts() should count occurrences in an array with mixed data types',
    test: () => {
      const array = [1, "1", 2, true, "true", false, null, null, undefined, undefined];
      const result = arrayValueCounts(array);

      const expectedCounts = {
        "1": 2,  // Includes numeric 1 and string "1"
        "2": 1,
        "true": 2,
        "false": 1,
        "null": 2,
        "undefined": 2
      };
      if (JSON.stringify(result) !== JSON.stringify(expectedCounts)) {
        throw new Error(`Expected ${JSON.stringify(expectedCounts)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayValueCounts() should handle large arrays efficiently',
    test: () => {
      const largeArray = Array.from({ length: 100000 }, (_, i) => i % 1000);
      const result = arrayValueCounts(largeArray);

      const expectedCounts = Array.from({ length: 1000 }).reduce((acc, _, i) => {
        acc[i] = 100;
        return acc;
      }, {});

      if (JSON.stringify(result) !== JSON.stringify(expectedCounts)) {
        throw new Error(`Expected ${JSON.stringify(expectedCounts)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayValueCounts() should correctly count occurrences of nested arrays when serialized',
    test: () => {
      const array = [[1, 2], [1, 2], [3, 4]];
      const result = arrayValueCounts(array);

      const expectedCounts = {
        "[1,2]": 2,
        "[3,4]": 1
      };

      if (JSON.stringify(result) !== JSON.stringify(expectedCounts)) {
        throw new Error(`Expected ${JSON.stringify(expectedCounts)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
