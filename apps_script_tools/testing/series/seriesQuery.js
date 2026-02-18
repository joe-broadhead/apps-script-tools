SERIES_QUERY_TESTS = [
  {
    description: 'Series.query() should accept function predicates',
    test: () => {
      const series = new Series([10, 15, 25, 30], 'numbers');
      const result = series.query((s, value, i) => value > 15 && i % 2 === 0);
      const expected = [25];

      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.query() should reject string predicates',
    test: () => {
      const series = new Series([10, 15, 25, 30], 'numbers');

      try {
        series.query('value > 10');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Condition must be a function')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
];
