SERIES_STR_CAPITALIZE_TESTS = [
  {
    description: 'Series.str.capitalize() should capitalize the first letter of each string',
    test: () => {
      const series = new Series(['hello', 'world'], 'name');
      const result = series.str.capitalize();
      const expected = ['Hello', 'World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.capitalize() should leave strings that already start with uppercase unchanged',
    test: () => {
      const series = new Series(['Hello', 'World'], 'name');
      const result = series.str.capitalize();
      const expected = ['Hello', 'World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.capitalize() should convert mixed-case strings to capitalized format',
    test: () => {
      const series = new Series(['hELLO', 'wORLD'], 'name');
      const result = series.str.capitalize();
      const expected = ['Hello', 'World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.capitalize() should handle strings with numbers and special characters',
    test: () => {
      const series = new Series(['123abc!', '@hello'], 'name');
      const result = series.str.capitalize();
      const expected = ['123abc!', '@hello'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.capitalize() should handle null values in the Series',
    test: () => {
      const series = new Series(['hello', null, 'world'], 'name');
      const result = series.str.capitalize();
      const expected = ['Hello', null, 'World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.capitalize() should handle empty strings',
    test: () => {
      const series = new Series(['', 'hello'], 'name');
      const result = series.str.capitalize();
      const expected = ['', 'Hello'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.capitalize() should handle mixed data types in the Series',
    test: () => {
      const series = new Series(['hello', 123, true, null], 'name');
      const result = series.str.capitalize();
      const expected = ['Hello', '123', 'True', null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.capitalize() should handle strings with leading and trailing whitespace',
    test: () => {
      const series = new Series([' hello ', '  world'], 'name');
      const result = series.str.capitalize();
      const expected = [' hello ', '  world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
