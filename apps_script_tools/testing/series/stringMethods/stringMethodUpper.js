SERIES_STR_UPPER_TESTS = [
  {
    description: 'Series.str.upper() should convert all lowercase letters to uppercase',
    test: () => {
      const series = new Series(['hello', 'world'], 'name');
      const result = series.str.upper();
      const expected = ['HELLO', 'WORLD'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.upper() should leave uppercase letters unchanged',
    test: () => {
      const series = new Series(['HELLO', 'WORLD'], 'name');
      const result = series.str.upper();
      const expected = ['HELLO', 'WORLD'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.upper() should convert mixed-case strings to uppercase',
    test: () => {
      const series = new Series(['Hello', 'WoRlD'], 'name');
      const result = series.str.upper();
      const expected = ['HELLO', 'WORLD'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.upper() should handle strings with numbers and special characters',
    test: () => {
      const series = new Series(['123abc!', '@World#'], 'name');
      const result = series.str.upper();
      const expected = ['123ABC!', '@WORLD#'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.upper() should handle null values in the Series',
    test: () => {
      const series = new Series(['hello', null, 'world'], 'name');
      const result = series.str.upper();
      const expected = ['HELLO', null, 'WORLD'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.upper() should handle empty strings',
    test: () => {
      const series = new Series(['', 'hello'], 'name');
      const result = series.str.upper();
      const expected = ['', 'HELLO'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.upper() should handle mixed data types in the Series',
    test: () => {
      const series = new Series(['hello', 123, true, null], 'name');
      const result = series.str.upper();
      const expected = ['HELLO', '123', 'TRUE', null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.upper() should handle strings with whitespace',
    test: () => {
      const series = new Series([' hello ', ' world\t'], 'name');
      const result = series.str.upper();
      const expected = [' HELLO ', ' WORLD\t'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
