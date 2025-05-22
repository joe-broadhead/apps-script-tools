SERIES_IAT_TESTS = [
  {
    description: 'Series.iat() should return the positional index for a valid index',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.iat(1);

      const expectedValue = 1; // Positional index at index 1
      if (result !== expectedValue) {
        throw new Error(`Expected ${expectedValue}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.iat() should return undefined for out-of-range indices',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result1 = series.iat(-1);
      const result2 = series.iat(3);

      if (result1 !== undefined) {
        throw new Error(`Expected undefined for index -1, but got ${result1}`);
      }
      if (result2 !== undefined) {
        throw new Error(`Expected undefined for index 3, but got ${result2}`);
      }
    },
  },
  {
    description: 'Series.iat() should return undefined for an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.iat(0);

      if (result !== undefined) {
        throw new Error(`Expected undefined for index 0 in an empty Series, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.iat() should handle large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = series.iat(9999);

      const expectedValue = 9999; // Positional index at the last index
      if (result !== expectedValue) {
        throw new Error(`Expected ${expectedValue}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.iat() should correctly handle a Series with a custom index',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      series.index = [100, 101, 102]; // Custom index
      const result = series.iat(2);

      const expectedValue = 102; // Positional index at index 2
      if (result !== expectedValue) {
        throw new Error(`Expected ${expectedValue}, but got ${result}`);
      }
    },
  },
];
