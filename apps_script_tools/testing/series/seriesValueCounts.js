SERIES_VALUE_COUNTS_TESTS = [
  {
    description: 'Series.valueCounts() should correctly count unique values',
    test: () => {
      const series = new Series([10, 20, 10, 30], 'values');
      const expected = { 10: 2, 20: 1, 30: 1 };
      const result = series.valueCounts();

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.valueCounts() should return an empty object for an empty Series',
    test: () => {
      const series = new Series([], 'values');
      const expected = {};
      const result = series.valueCounts();

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.valueCounts() should handle mixed data types correctly',
    test: () => {
      const series = new Series([10, '10', true, 10, false, 'true'], 'values');
      const expected = { 10: 3, true: 2, false: 1};
      const result = series.valueCounts();

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
