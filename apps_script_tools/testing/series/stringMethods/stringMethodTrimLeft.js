SERIES_STR_TRIM_LEFT_TESTS = [
  {
    description: "Series.str.trimLeft() should remove leading spaces",
    test: () => {
      const series = new Series(['   hello', '   world', 'no leading spaces'], 'name');
      const result = series.str.trimLeft();
      const expected = ['hello', 'world', 'no leading spaces'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimLeft() should handle strings with only spaces",
    test: () => {
      const series = new Series(['     '], 'name');
      const result = series.str.trimLeft();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimLeft() should handle empty strings",
    test: () => {
      const series = new Series([''], 'name');
      const result = series.str.trimLeft();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimLeft() should handle strings with no leading spaces",
    test: () => {
      const series = new Series(['hello', 'world'], 'name');
      const result = series.str.trimLeft();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimLeft() should handle strings with trailing spaces",
    test: () => {
      const series = new Series(['hello   ', 'world   '], 'name');
      const result = series.str.trimLeft();
      const expected = ['hello   ', 'world   '];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimLeft() should handle strings with mixed leading and trailing spaces",
    test: () => {
      const series = new Series(['   hello   ', '   world   '], 'name');
      const result = series.str.trimLeft();
      const expected = ['hello   ', 'world   '];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trimLeft() should handle strings with tabs and spaces",
    test: () => {
      const series = new Series(['\t   hello', '\tworld'], 'name');
      const result = series.str.trimLeft();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
