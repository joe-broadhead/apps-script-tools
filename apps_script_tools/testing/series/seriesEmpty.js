const SERIES_EMPTY_TESTS = [
  {
    description: 'Series.empty() should return true for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.empty();

      const expectedResult = true;
      if (result !== expectedResult) {
        throw new Error(`Expected ${expectedResult}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.empty() should return false for a non-empty Series',
    test: () => {
      const series = new Series([1, 2, 3], 'values');
      const result = series.empty();

      const expectedResult = false;
      if (result !== expectedResult) {
        throw new Error(`Expected ${expectedResult}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.empty() should return true for a Series initialized with null elements',
    test: () => {
      const series = new Series([null, null, null], 'nulls');
      const result = series.empty();

      const expectedResult = false; // The Series is not empty; it contains nulls
      if (result !== expectedResult) {
        throw new Error(`Expected ${expectedResult}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.empty() should return true for a Series with a nested empty array',
    test: () => {
      const series = new Series([], 'nested');
      const result = series.empty();

      const expectedResult = true;
      if (result !== expectedResult) {
        throw new Error(`Expected ${expectedResult}, but got ${result}`);
      }
    }
  },
  {
    description: 'Series.empty() should return false for a large non-empty Series',
    test: () => {
      const largeSeries = new Series(Array.from({ length: 1000 }, (_, i) => i), 'large');
      const result = largeSeries.empty();

      const expectedResult = false;
      if (result !== expectedResult) {
        throw new Error(`Expected ${expectedResult}, but got ${result}`);
      }
    }
  },
];
