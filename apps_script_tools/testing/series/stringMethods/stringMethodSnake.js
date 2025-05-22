SERIES_STR_SNAKE_TESTS = [
  {
    description: "Series.str.snake() should convert camelCase to snake_case",
    test: () => {
      const series = new Series(['camelCaseExample'], 'name');
      const result = series.str.snake();
      const expected = ['camel_case_example'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should convert PascalCase to snake_case",
    test: () => {
      const series = new Series(['PascalCaseExample'], 'name');
      const result = series.str.snake();
      const expected = ['pascal_case_example'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should replace spaces with underscores",
    test: () => {
      const series = new Series(['this is a test'], 'name');
      const result = series.str.snake();
      const expected = ['this_is_a_test'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with leading and trailing spaces",
    test: () => {
      const series = new Series(['  snake case test  '], 'name');
      const result = series.str.snake();
      const expected = ['snake_case_test'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with special characters",
    test: () => {
      const series = new Series(['hello@world! How#are$you?'], 'name');
      const result = series.str.snake();
      const expected = ['hello_world_how_are_you'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with multiple consecutive spaces",
    test: () => {
      const series = new Series(['this   has   multiple   spaces'], 'name');
      const result = series.str.snake();
      const expected = ['this_has_multiple_spaces'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with multiple consecutive special characters",
    test: () => {
      const series = new Series(['this---is***a$$test'], 'name');
      const result = series.str.snake();
      const expected = ['this_is_a_test'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with underscores and normalize them",
    test: () => {
      const series = new Series(['this_is__already_snake_case'], 'name');
      const result = series.str.snake();
      const expected = ['this_is_already_snake_case'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with numbers",
    test: () => {
      const series = new Series(['thisIsATest123'], 'name');
      const result = series.str.snake();
      const expected = ['this_is_a_test123'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle an empty string",
    test: () => {
      const series = new Series([''], 'name');
      const result = series.str.snake();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with only special characters",
    test: () => {
      const series = new Series(['!@#$%^&*()'], 'name');
      const result = series.str.snake();
      const expected = [''];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should remove leading and trailing underscores",
    test: () => {
      const series = new Series(['_this_is_a_test_'], 'name');
      const result = series.str.snake();
      const expected = ['this_is_a_test'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle strings with mixed cases and spaces",
    test: () => {
      const series = new Series(['This is a MIXED case Test'], 'name');
      const result = series.str.snake();
      const expected = ['this_is_a_mixed_case_test'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.snake() should handle a large string efficiently",
    test: () => {
      const largeString = 'thisIsA'.repeat(1000);
      const series = new Series([largeString], 'name');
      const result = series.str.snake();
      const expected = ['this_is_a'.repeat(1000)];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error('Failed Test: Large String Conversion');
      }
    },
  },
];
