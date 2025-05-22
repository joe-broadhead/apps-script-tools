SERIES_STR_REPLACE_TESTS = [
  {
    description: 'Series.str.replace() should replace all occurrences of the search value when `all` is true',
    test: () => {
      const series = new Series(['hello world', 'world world', ''], 'name');
      const result = series.str.replace('world', 'universe');
      const expected = ['hello universe', 'universe universe', ''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.replace() should replace the first occurrence of the search value when `all` is false',
    test: () => {
      const series = new Series(['hello world', 'world world', ''], 'name');
      const result = series.str.replace('world', 'universe', false);
      const expected = ['hello universe', 'universe world', ''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.replace() should handle null values in the Series',
    test: () => {
      const series = new Series(['hello world', null, 'world world'], 'name');
      const result = series.str.replace('world', 'universe');
      const expected = ['hello universe', null, 'universe universe'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.replace() should handle Series with mixed data types',
    test: () => {
      const series = new Series(['hello world', 12345, true, null], 'name');
      const result = series.str.replace('hello', 'hi');
      const expected = ['hi world', '12345', 'true', null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.replace() should handle numeric search values in strings',
    test: () => {
      const series = new Series(['12345', '67890', '123123'], 'name');
      const result = series.str.replace('123', '321');
      const expected = ['32145', '67890', '321321'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.replace() should handle empty strings',
    test: () => {
      const series = new Series(['', '', ''], 'name');
      const result = series.str.replace('world', 'universe');
      const expected = ['', '', ''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.replace() should replace special characters in strings',
    test: () => {
      const series = new Series(['@hello@', '@world@', 'hello@'], 'name');
      const result = series.str.replace('@', '#');
      const expected = ['#hello#', '#world#', 'hello#'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.replace() should handle non-string search and replace values',
    test: () => {
      const series = new Series(['12345', '67890', '123123'], 'name');
      const result = series.str.replace(123, 999);
      const expected = ['99945', '67890', '999999'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
