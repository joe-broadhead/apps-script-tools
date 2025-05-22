ARRAY_CHUNK_TESTS = [
  {
    description: 'arrayChunk() should divide an array into equal chunks',
    test: () => {
      const array = [1, 2, 3, 4, 5, 6];
      const result = arrayChunk(array, 2);

      const expected = [[1, 2], [3, 4], [5, 6]];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayChunk() should handle arrays with a remainder when dividing into chunks',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayChunk(array, 2);

      const expected = [[1, 2], [3, 4], [5]];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayChunk() should handle an empty array',
    test: () => {
      const array = [];
      const result = arrayChunk(array, 3);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayChunk() should return one chunk if chunk size is greater than array length',
    test: () => {
      const array = [1, 2, 3];
      const result = arrayChunk(array, 5);

      const expected = [[1, 2, 3]];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayChunk() should return individual elements as chunks if chunk size is 1',
    test: () => {
      const array = [1, 2, 3];
      const result = arrayChunk(array, 1);

      const expected = [[1], [2], [3]];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayChunk() should throw an error if chunk size is zero or negative',
    test: () => {
      const array = [1, 2, 3];
      try {
        arrayChunk(array, 0);
        throw new Error('Expected an error for chunk size <= 0, but none was thrown');
      } catch (error) {
        if (!error.message.includes('chunk size must be greater than 0')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: 'arrayChunk() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arrayChunk(largeArray, 1000);

      const expected = Array.from({ length: 10 }, (_, i) =>
        Array.from({ length: 1000 }, (_, j) => i * 1000 + j + 1)
      );
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected).slice(0, 50)}..., but got ${JSON.stringify(result).slice(0, 50)}...`);
      }
    }
  }
];
