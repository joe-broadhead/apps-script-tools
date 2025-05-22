SERIES_LEN_TESTS = [
  {
    description: 'Series.len() should return the correct length for a non-empty Series',
    test: () => {
      const series = new Series([1, 2, 3, 4, 5], 'values');
      const result = series.len();

      const expectedLength = 5;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.len() should return 0 for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.len();

      const expectedLength = 0;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.len() should correctly calculate the length of a Series with mixed data types',
    test: () => {
      const series = new Series([10, "text", null, undefined, true], 'mixed');
      const result = series.len();

      const expectedLength = 5;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.len() should handle a large Series efficiently',
    test: () => {
      const largeSeries = new Series(Array.from({ length: 1000000 }, (_, i) => i), 'large');
      const result = largeSeries.len();

      const expectedLength = 1000000;
      if (result !== expectedLength) {
        throw new Error(`Expected ${expectedLength}, but got ${result}`);
      }
    }
  }
];
