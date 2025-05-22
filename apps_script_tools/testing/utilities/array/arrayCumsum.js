ARRAY_CUMSUM_TESTS = [
  {
    description: 'arrayCumsum() should correctly calculate the cumulative sum for a numeric array',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayCumsum(array);

      const expected = [1, 3, 6, 10, 15];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayCumsum() should ignore non-numeric values and calculate the cumulative sum',
    test: () => {
      const array = [1, "2", true, null, undefined, NaN, 4];
      const result = arrayCumsum(array);

      const expected = [1, 3, 4, 8];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayCumsum() should return an empty array for an empty input array',
    test: () => {
      const array = [];
      const result = arrayCumsum(array);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayCumsum() should handle an array with negative numbers',
    test: () => {
      const array = [1, -2, 3, -4, 5];
      const result = arrayCumsum(array);

      const expected = [1, -1, 2, -2, 3];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayCumsum() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayCumsum(largeArray);

      const expected = Array.from({ length: 10000 }, (_, i) => ((i + 1) * (i + 2)) / 2); // Sum formula for 1 to n
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected).slice(0, 50)}..., but got ${JSON.stringify(result).slice(0, 50)}...`);
      }
    }
  },
  {
    description: 'arrayCumsum() should correctly calculate the cumulative sum for an array with mixed data types',
    test: () => {
      const array = [10, "20", false, true, null, NaN, 30];
      const result = arrayCumsum(array);

      const expected = [10, 30, 30, 31, 61];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayCumsum() should return an empty array for an array with no valid numeric values',
    test: () => {
      const array = ["text", null, undefined, NaN];
      const result = arrayCumsum(array);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
