ARRAY_RANK_TESTS = [
  {
    description: 'arrayRank() should compute dense ranks for an array of unique numbers',
    test: () => {
      const array = [10, 20, 30, 40];
      const result = arrayRank(array, 'dense');

      const expectedRanks = [1, 2, 3, 4]; // Each value has a distinct rank
      if (JSON.stringify(result) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRank() should compute standard ranks for an array with ties',
    test: () => {
      const array = [10, 20, 20, 30];
      const result = arrayRank(array, 'standard');

      const expectedRanks = [1, 2.5, 2.5, 4]; // Tie ranks are averaged
      if (JSON.stringify(result) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRank() should compute dense ranks for an array with ties',
    test: () => {
      const array = [10, 20, 20, 30];
      const result = arrayRank(array, 'dense');

      const expectedRanks = [1, 2, 2, 3]; // Same values share the same rank
      if (JSON.stringify(result) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRank() should handle an empty array',
    test: () => {
      const array = [];
      const result = arrayRank(array, 'dense');

      const expectedRanks = []; // No elements to rank
      if (JSON.stringify(result) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRank() should handle mixed data types in the array',
    test: () => {
      const array = [10, "20", "10", 30];
      const result = arrayRank(array, 'dense');

      const expectedRanks = [1, 3, 2, 4]; // Ranked after conversion: [10, "10", "20", 30]
      if (JSON.stringify(result) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayRank() should throw an error for an invalid ranking method',
    test: () => {
      const array = [10, 20, 30];
      try {
        arrayRank(array, 'invalidMethod');
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes("Invalid ranking method")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: 'arrayRank() should compute dense ranks efficiently for a large array',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // Repeats 0 to 99
      const result = arrayRank(largeArray, 'dense');

      const expectedRanks = Array.from({ length: 100 }, (_, i) => i + 1); // Dense ranks for 0 to 99
      const sampledRanks = result.slice(0, 100); // Sample the first 100 elements
      if (JSON.stringify(sampledRanks) !== JSON.stringify(expectedRanks)) {
        throw new Error(`Expected ${JSON.stringify(expectedRanks)}, but got ${JSON.stringify(sampledRanks)}`);
      }
    }
  }
];
