SERIES_STR_LOWER_TESTS = [
  {
    description: 'Series.str.lower() should convert all uppercase letters to lowercase',
    test: () => {
      const series = new Series(['HELLO', 'WORLD'], 'name');
      const result = series.str.lower();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.lower() should leave lowercase letters unchanged',
    test: () => {
      const series = new Series(['hello', 'world'], 'name');
      const result = series.str.lower();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.lower() should convert mixed-case strings to lowercase',
    test: () => {
      const series = new Series(['Hello', 'WoRlD'], 'name');
      const result = series.str.lower();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.lower() should handle strings with numbers and special characters',
    test: () => {
      const series = new Series(['123ABC!', '@WORLD#'], 'name');
      const result = series.str.lower();
      const expected = ['123abc!', '@world#'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.lower() should handle null values in the Series',
    test: () => {
      const series = new Series(['HELLO', null, 'WORLD'], 'name');
      const result = series.str.lower();
      const expected = ['hello', null, 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.lower() should handle empty strings',
    test: () => {
      const series = new Series(['', 'HELLO'], 'name');
      const result = series.str.lower();
      const expected = ['', 'hello'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.lower() should handle mixed data types in the Series',
    test: () => {
      const series = new Series(['HELLO', 123, true, null], 'name');
      const result = series.str.lower();
      const expected = ['hello', '123', 'true', null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.lower() should handle strings with whitespace',
    test: () => {
      const series = new Series([' HELLO ', '\tWORLD'], 'name');
      const result = series.str.lower();
      const expected = [' hello ', '\tworld'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
