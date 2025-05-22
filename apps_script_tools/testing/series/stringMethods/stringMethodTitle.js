SERIES_STR_TITLE_TESTS = [
  {
    description: "Series.str.title() should convert a lowercase sentence to title case",
    test: () => {
      const series = new Series(['hello world'], 'name');
      const result = series.str.title();
      const expected = ['Hello World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle an already title-cased sentence",
    test: () => {
      const series = new Series(['Hello World'], 'name');
      const result = series.str.title();
      const expected = ['Hello World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle an uppercase sentence",
    test: () => {
      const series = new Series(['HELLO WORLD'], 'name');
      const result = series.str.title();
      const expected = ['Hello World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle a mixed-case sentence",
    test: () => {
      const series = new Series(['hElLo WoRlD'], 'name');
      const result = series.str.title();
      const expected = ['Hello World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle a sentence with extra spaces",
    test: () => {
      const series = new Series(['   hello   world   '], 'name');
      const result = series.str.title();
      const expected = ['   Hello   World   '];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle a sentence with single words",
    test: () => {
      const series = new Series(['javascript'], 'name');
      const result = series.str.title();
      const expected = ['Javascript'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle a sentence with special characters",
    test: () => {
      const series = new Series(['hello! world?'], 'name');
      const result = series.str.title();
      const expected = ['Hello! World?'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle a sentence with numbers",
    test: () => {
      const series = new Series(['hello 123 world'], 'name');
      const result = series.str.title();
      const expected = ['Hello 123 World'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle an empty string",
    test: () => {
      const series = new Series([''], 'name');
      const result = series.str.title();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle a sentence with only spaces",
    test: () => {
      const series = new Series(['     '], 'name');
      const result = series.str.title();
      const expected = ['     '];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.title() should handle a sentence with punctuation and special characters",
    test: () => {
      const series = new Series(['hello-world! this_is a test.'], 'name');
      const result = series.str.title();
      const expected = ['Hello-World! This_Is A Test.'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
