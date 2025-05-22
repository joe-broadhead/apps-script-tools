SERIES_STR_ENDSWITH_TESTS = [
  {
    description: 'Series.str.endsWith() should return true for strings that end with the given suffix',
    test: () => {
      const series = new Series(['apple', 'pineapple', 'banana', ''], 'name');
      const result = series.str.endsWith('le');
      const expected = [true, true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.endsWith() should return false for strings that do not end with the given suffix',
    test: () => {
      const series = new Series(['cherry', 'grape', 'kiwi', ''], 'name');
      const result = series.str.endsWith('le');
      const expected = [false, false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.endsWith() should handle null values in the Series',
    test: () => {
      const series = new Series(['apple', null, 'banana'], 'name');
      const result = series.str.endsWith('le');
      const expected = [true, null, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.endsWith() should handle mixed data types in the Series',
    test: () => {
      const series = new Series(['apple', 12345, true, null], 'name');
      const result = series.str.endsWith('5');
      const expected = [false, true, false, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.endsWith() should handle an empty suffix',
    test: () => {
      const series = new Series(['apple', 'banana', 'cherry'], 'name');
      const result = series.str.endsWith('');
      const expected = [true, true, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.endsWith() should return false for empty strings in the Series when suffix is non-empty',
    test: () => {
      const series = new Series(['', '', ''], 'name');
      const result = series.str.endsWith('le');
      const expected = [false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.endsWith() should handle special characters as suffix',
    test: () => {
      const series = new Series(['hello!', 'goodbye!', 'hello', ''], 'name');
      const result = series.str.endsWith('!');
      const expected = [true, true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
