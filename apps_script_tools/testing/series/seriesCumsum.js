SERIES_CUMSUM_TESTS = [
  {
    description: 'Series.cumsum() should compute the cumulative sum of numeric values',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.cumsum();

      const expectedCumsum = [10, 30, 60]; // Running totals: 10, 10+20, 10+20+30
      if (JSON.stringify(result.array) !== JSON.stringify(expectedCumsum)) {
        throw new Error(`Expected ${JSON.stringify(expectedCumsum)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.cumsum() should skip non-numeric values in the calculation',
    test: () => {
      const series = new Series([10, "20", null, undefined, "text"], 'values');
      const result = series.cumsum();

      const expectedCumsum = [10, 30]; // Running totals: 10, 10+20; Skipping non-numeric values
      if (JSON.stringify(result.array) !== JSON.stringify(expectedCumsum)) {
        throw new Error(`Expected ${JSON.stringify(expectedCumsum)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.cumsum() should return an empty Series for an empty input',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.cumsum();

      const expectedCumsum = []; // Empty Series
      if (JSON.stringify(result.array) !== JSON.stringify(expectedCumsum)) {
        throw new Error(`Expected ${JSON.stringify(expectedCumsum)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.cumsum() should return the single element for a Series with one value',
    test: () => {
      const series = new Series([10], 'values');
      const result = series.cumsum();

      const expectedCumsum = [10]; // Single element is the cumulative sum
      if (JSON.stringify(result.array) !== JSON.stringify(expectedCumsum)) {
        throw new Error(`Expected ${JSON.stringify(expectedCumsum)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.cumsum() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // Values 1 to 10,000
      const series = new Series(largeArray, 'large');
      const result = series.cumsum();

      const expectedCumsum = largeArray.reduce((acc, num) => {
        acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + num);
        return acc;
      }, []);

      if (JSON.stringify(result.array) !== JSON.stringify(expectedCumsum)) {
        throw new Error(`Expected ${JSON.stringify(expectedCumsum)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
