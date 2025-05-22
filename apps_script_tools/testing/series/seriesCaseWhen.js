SERIES_CASE_WHEN_TESTS = [
  {
    description: 'Series.caseWhen() should apply conditions using functions',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.caseWhen([
        [x => x < 15, 'low'],
        [x => x >= 15, 'high']
      ], 'default');

      const expectedValues = ['low', 'high', 'high']; // 10 < 15 → 'low', 20 >= 15 → 'high', etc.
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.caseWhen() should apply conditions using Series boolean masks',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series(['low', 'medium', 'high'], 'B');
      const seriesC = new Series(['red', 'blue', 'green'], 'C');

      const result = seriesA.caseWhen([
        [seriesA.lessThan(15), seriesB],
        [seriesA.greaterThanOrEqual(15), seriesC]
      ], 'default');

      const expectedValues = ['low', 'blue', 'green']; // Masks determine 'low' or colors
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.caseWhen() should apply the default value when no conditions match',
    test: () => {
      const series = new Series([100, 200, 300], 'A');
      const result = series.caseWhen([
        [x => x < 50, 'low']
      ], 'default');

      const expectedValues = ['default', 'default', 'default']; // No conditions match
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.caseWhen() should throw an error for mismatched Series lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series(['low', 'medium'], 'B'); // Mismatched length

      try {
        seriesA.caseWhen([
          [seriesA.lessThan(15), seriesB]
        ], 'default');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All Series values must have the same length as the base Series')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.caseWhen() should support mixed conditions (functions and Series)',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series(['low', 'medium', 'high'], 'B');
      const result = seriesA.caseWhen([
        [x => x < 15, 'very low'],
        [seriesA.greaterThanOrEqual(15), seriesB]
      ], 'default');

      const expectedValues = ['very low', 'medium', 'high']; // Function determines 'very low', mask determines others
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.caseWhen() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = series.caseWhen([
        [x => x % 2 === 0, 'even'],
        [x => x % 2 !== 0, 'odd']
      ], 'default');

      const expectedValues = largeArray.map(value => (value % 2 === 0 ? 'even' : 'odd'));
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with conditions');
      }
    },
  },
];
