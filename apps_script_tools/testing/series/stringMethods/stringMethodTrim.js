SERIES_STR_TRIM_TESTS = [
  {
    description: "Series.str.trim() should remove leading and trailing spaces",
    test: () => {
      const series = new Series(['   hello   ', '   world   ', 'no extra spaces'], 'name');
      const result = series.str.trim();
      const expected = ['hello', 'world', 'no extra spaces'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trim() should handle strings with only spaces",
    test: () => {
      const series = new Series(['     '], 'name');
      const result = series.str.trim();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trim() should handle empty strings",
    test: () => {
      const series = new Series([''], 'name');
      const result = series.str.trim();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trim() should handle strings with no extra spaces",
    test: () => {
      const series = new Series(['hello', 'world'], 'name');
      const result = series.str.trim();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trim() should handle strings with mixed spaces and tabs",
    test: () => {
      const series = new Series(['\t   hello   \t', '\t   world   \t'], 'name');
      const result = series.str.trim();
      const expected = ['hello', 'world'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.trim() should handle strings with special characters and spaces",
    test: () => {
      const series = new Series(['   hello!   ', '   world?   '], 'name');
      const result = series.str.trim();
      const expected = ['hello!', 'world?'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
