SERIES_MIN_TESTS = [
  {
    description: 'Series.min() should return the smallest numeric value in the Series',
    test: () => {
      const series = new Series([10, 20, 5, 30], 'values');
      const result = series.min();

      const expectedMin = 5; // Smallest value
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.min() should ignore non-numeric values and return the smallest numeric value',
    test: () => {
      const series = new Series([10, "20", "text", undefined, 5], 'values');
      const result = series.min();

      const expectedMin = 5; // Smallest numeric value; non-numeric values are ignored
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.min() should return the smallest value in a Series with all negative numbers',
    test: () => {
      const series = new Series([-10, -20, -5, -30], 'values');
      const result = series.min();

      const expectedMin = -30; // Smallest negative value
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.min() should return the smallest value in a Series with decimal numbers',
    test: () => {
      const series = new Series([1.5, 2.5, 0.5], 'values');
      const result = series.min();

      const expectedMin = 0.5; // Smallest decimal value
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.min() should return undefined for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.min();

      if (result !== undefined) {
        throw new Error(`Expected undefined, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.min() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // Values 1 to 10000
      const series = new Series(largeArray, 'large');
      const result = series.min();

      const expectedMin = 1; // Smallest value
      if (result !== expectedMin) {
        throw new Error(`Expected ${expectedMin}, but got ${result}`);
      }
    },
  },
];
