SERIES_MEDIAN_TESTS = [
  {
    description: 'Series.median() should return the middle value for an odd-length Series',
    test: () => {
      const series = new Series([10, 30, 20], 'values');
      const result = series.median();

      const expectedMedian = 20; // Sorted: [10, 20, 30]; Middle value: 20
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.median() should return the average of the two middle values for an even-length Series',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'values');
      const result = series.median();

      const expectedMedian = 25; // Sorted: [10, 20, 30, 40]; Median: (20 + 30) / 2 = 25
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.median() should compute the median while ignoring non-numeric elements',
    test: () => {
      const series = new Series([10, "20", null, undefined, "text"], 'values');
      const result = series.median();

      const expectedMedian = 15; // Valid numbers: [10, 20]; Median: (10 + 20) / 2 = 15
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.median() should return null for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.median();

      if (result !== null) {
        throw new Error(`Expected null, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.median() should skip NaN values and compute the median of valid numeric elements',
    test: () => {
      const series = new Series([10, NaN, 20, 30], 'values');
      const result = series.median();

      const expectedMedian = 20; // Valid numbers: [10, 20, 30]; Median: 20
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.median() should compute the median for a Series with negative values',
    test: () => {
      const series = new Series([-30, -10, -20], 'values');
      const result = series.median();

      const expectedMedian = -20; // Sorted: [-30, -20, -10]; Median: -20
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.median() should compute the median for a Series with decimal values',
    test: () => {
      const series = new Series([1.5, 3.5, 2.5], 'values');
      const result = series.median();

      const expectedMedian = 2.5; // Sorted: [1.5, 2.5, 3.5]; Median: 2.5
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.median() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // 1 to 10000
      const series = new Series(largeArray, 'large');
      const result = series.median();

      const expectedMedian = 5000.5; // Median of 1 to 10000
      if (result !== expectedMedian) {
        throw new Error(`Expected ${expectedMedian}, but got ${result}`);
      }
    },
  },
];
