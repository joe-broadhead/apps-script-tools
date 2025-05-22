SERIES_RANK_TESTS = [
  {
    description: 'Series.rank() should compute dense ranks',
    test: () => {
      const series = new Series([10, 20, 20, 30], 'values');
      const result = series.rank('dense');

      const expectedRanks = [1, 2, 2, 3]; // Dense ranking: ties get the same rank, no gaps in rank numbers
      if (JSON.stringify(result.array) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.rank() should compute standard ranks',
    test: () => {
      const series = new Series([10, 20, 20, 30], 'values');
      const result = series.rank('standard');

      const expectedRanks = [1, 2.5, 2.5, 4]; // Standard ranking: ties get the average of their ranks
      if (JSON.stringify(result.array) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.rank() should throw an error for unsupported ranking methods',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      try {
        series.rank('unsupported');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Invalid ranking method')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.rank() should return an empty Series for an empty input',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.rank('dense');

      const expectedRanks = []; // Empty Series
      if (JSON.stringify(result.array) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.rank() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // 100 repeating values
      const series = new Series(largeArray, 'large');
      const result = series.rank('dense');

      const expectedRanks = largeArray.map(value => (value % 100) + 1); // Ranks based on dense ranking
      if (JSON.stringify(result.array) !== JSON.stringify(expectedRanks)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
];
