SERIES_STR_STARTSWITH_TESTS = [
  {
    description: 'Series.str.startsWith() should return true for strings that start with the given prefix',
    test: () => {
      const series = new Series(['apple', 'apricot', 'banana', ''], 'name');
      const result = series.str.startsWith('ap');
      const expected = [true, true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.startsWith() should return false for strings that do not start with the given prefix',
    test: () => {
      const series = new Series(['cherry', 'grape', 'kiwi', ''], 'name');
      const result = series.str.startsWith('ap');
      const expected = [false, false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.startsWith() should handle null values in the Series',
    test: () => {
      const series = new Series(['apple', null, 'banana'], 'name');
      const result = series.str.startsWith('ap');
      const expected = [true, null, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.startsWith() should handle mixed data types in the Series',
    test: () => {
      const series = new Series(['apple', 12345, true, null], 'name');
      const result = series.str.startsWith('ap');
      const expected = [true, false, false, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.startsWith() should handle an empty prefix',
    test: () => {
      const series = new Series(['apple', 'banana', 'cherry'], 'name');
      const result = series.str.startsWith('');
      const expected = [true, true, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.startsWith() should return false for empty strings in the Series when prefix is non-empty',
    test: () => {
      const series = new Series(['', '', ''], 'name');
      const result = series.str.startsWith('ap');
      const expected = [false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.startsWith() should handle special characters as prefix',
    test: () => {
      const series = new Series(['@home', '#hash', '!exclamation'], 'name');
      const result = series.str.startsWith('@');
      const expected = [true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
