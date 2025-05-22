SERIES_STR_MATCHES_TESTS = [
  {
    description: 'Series.str.matches() should return true for strings matching the given regex pattern',
    test: () => {
      const series = new Series(['apple', 'banana', 'cherry', ''], 'name');
      const result = series.str.matches(/^a/); // Matches strings starting with 'a'
      const expected = [true, false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.matches() should return false for strings not matching the given regex pattern',
    test: () => {
      const series = new Series(['grape', 'pear', 'plum', ''], 'name');
      const result = series.str.matches(/^a/); // Matches strings starting with 'a'
      const expected = [false, false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.matches() should handle null values in the Series',
    test: () => {
      const series = new Series(['apple', null, 'banana'], 'name');
      const result = series.str.matches(/^a/); // Matches strings starting with 'a'
      const expected = [true, null, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.matches() should handle mixed data types in the Series',
    test: () => {
      const series = new Series(['12345', 67890, true, null], 'name');
      const result = series.str.matches(/^\d+$/); // Matches numeric strings
      const expected = [true, true, false, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.matches() should handle special characters in regex patterns',
    test: () => {
      const series = new Series(['hello!', 'goodbye!', 'hello', ''], 'name');
      const result = series.str.matches(/!$/); // Matches strings ending with '!'
      const expected = [true, true, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.matches() should return false for empty strings with non-matching regex patterns',
    test: () => {
      const series = new Series(['', '', ''], 'name');
      const result = series.str.matches(/^a/); // Matches strings starting with 'a'
      const expected = [false, false, false];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.matches() should handle case sensitivity in regex patterns',
    test: () => {
      const series = new Series(['Apple', 'Banana', 'apple'], 'name');
      const result = series.str.matches(/^a/); // Matches strings starting with 'a' (case-sensitive)
      const expected = [false, false, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.str.matches() should handle empty regex patterns (always matches)',
    test: () => {
      const series = new Series(['apple', 'banana', 'cherry'], 'name');
      const result = series.str.matches(/.*/); // Matches any string
      const expected = [true, true, true];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
