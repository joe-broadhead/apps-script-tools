SERIES_STR_TRIM_RIGHT_TESTS = [
  {
    description: "Series.str.trimRight() should remove trailing spaces",
    test: () => {
      const series = new Series(['hello   ', 'world   ', 'no trailing spaces'], 'name');
      const result = series.str.trimRight();
      const expected = ['hello', 'world', 'no trailing spaces'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimRight() should handle strings with only spaces",
    test: () => {
      const series = new Series(['     '], 'name');
      const result = series.str.trimRight();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimRight() should handle empty strings",
    test: () => {
      const series = new Series([''], 'name');
      const result = series.str.trimRight();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimRight() should handle strings with no trailing spaces",
    test: () => {
      const series = new Series(['hello', 'world'], 'name');
      const result = series.str.trimRight();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimRight() should handle strings with leading spaces",
    test: () => {
      const series = new Series(['   hello', '   world'], 'name');
      const result = series.str.trimRight();
      const expected = ['   hello', '   world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimRight() should handle strings with mixed leading and trailing spaces",
    test: () => {
      const series = new Series(['   hello   ', '   world   '], 'name');
      const result = series.str.trimRight();
      const expected = ['   hello', '   world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimRight() should handle strings with tabs and spaces",
    test: () => {
      const series = new Series(['hello\t   ', 'world\t'], 'name');
      const result = series.str.trimRight();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
