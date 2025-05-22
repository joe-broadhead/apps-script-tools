SERIES_MAX_TESTS = [
  {
    description: 'Series.max() should return the largest numeric value in the Series',
    test: () => {
      const series = new Series([10, 20, 5, 30], 'values');
      const result = series.max();

      const expectedMax = 30; // Largest value
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.max() should ignore non-numeric values and return the largest numeric value',
    test: () => {
      const series = new Series([10, "20", "text", undefined, 30], 'values');
      const result = series.max();

      const expectedMax = 30; // Largest numeric value; non-numeric values are ignored
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.max() should return the largest value in a Series with all negative numbers',
    test: () => {
      const series = new Series([-10, -20, -5, -30], 'values');
      const result = series.max();

      const expectedMax = -5; // Largest negative value
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.max() should return the largest value in a Series with decimal numbers',
    test: () => {
      const series = new Series([1.5, 2.5, 3.5], 'values');
      const result = series.max();

      const expectedMax = 3.5; // Largest decimal value
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.max() should return undefined for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.max();

      if (result !== undefined) {
        throw new Error(`Expected undefined, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.max() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // Values 1 to 10000
      const series = new Series(largeArray, 'large');
      const result = series.max();

      const expectedMax = 10000; // Largest value
      if (result !== expectedMax) {
        throw new Error(`Expected ${expectedMax}, but got ${result}`);
      }
    },
  },
];
