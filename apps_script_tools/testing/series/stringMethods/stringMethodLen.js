SERIES_STR_LEN_TESTS = [
  {
    description: 'Series.str.len() should return the length of each string in the Series',
    test: () => {
      const series = new Series(['hello', 'world', ''], 'name');
      const result = series.str.len();
      const expected = [5, 5, 0];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.len() should handle null values',
    test: () => {
      const series = new Series(['hello', null, 'world'], 'name');
      const result = series.str.len();
      const expected = [5, null, 5];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.len() should handle mixed data types',
    test: () => {
      const series = new Series(['hello', 12345, true, null], 'name');
      const result = series.str.len();
      const expected = [5, 5, 4, null]; // true coerces to "true" (length 4)
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.len() should handle numeric values',
    test: () => {
      const series = new Series([123, 45678, 0], 'name');
      const result = series.str.len();
      const expected = [3, 5, 1]; // Numeric values are coerced to strings
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.len() should handle empty Series',
    test: () => {
      const series = new Series([], 'name');
      const result = series.str.len();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.len() should handle special characters in strings',
    test: () => {
      const series = new Series(['!', '@#$%', '💖'], 'name');
      const result = series.str.len();
      const expected = [1, 4, 2]; // Emoji counts as 2 characters
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
  