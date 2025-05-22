SERIES_STR_CONTAINS_TESTS = [
  {
    description: 'Series.str.contains() should return true for strings that contain the given substring',
    test: () => {
      const series = new Series(['apple', 'banana', 'cherry', ''], 'name');
      const result = series.str.contains('an');
      const expected = [false, true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.contains() should return false for strings that do not contain the given substring',
    test: () => {
      const series = new Series(['grape', 'pear', 'plum', ''], 'name');
      const result = series.str.contains('an');
      const expected = [false, false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.contains() should handle null values in the Series',
    test: () => {
      const series = new Series(['apple', null, 'banana'], 'name');
      const result = series.str.contains('an');
      const expected = [false, null, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.contains() should handle mixed data types in the Series',
    test: () => {
      const series = new Series(['apple', 12345, true, null], 'name');
      const result = series.str.contains('5');
      const expected = [false, true, false, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.contains() should handle an empty substring',
    test: () => {
      const series = new Series(['apple', 'banana', 'cherry'], 'name');
      const result = series.str.contains('');
      const expected = [true, true, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.contains() should return false for empty strings in the Series when substring is non-empty',
    test: () => {
      const series = new Series(['', '', ''], 'name');
      const result = series.str.contains('an');
      const expected = [false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.contains() should handle special characters in the substring',
    test: () => {
      const series = new Series(['hello!', 'goodbye!', 'hello', ''], 'name');
      const result = series.str.contains('!');
      const expected = [true, true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
