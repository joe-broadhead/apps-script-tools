ARRAY_CLIP_TESTS = [
  {
    description: 'arrayClip() should clip values below the lower bound',
    test: () => {
      const array = [1, 5, 10, -5, 15];
      const result = arrayClip(array, 0, Infinity);

      const expected = [1, 5, 10, 0, 15];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayClip() should clip values above the upper bound',
    test: () => {
      const array = [1, 5, 10, 15, 20];
      const result = arrayClip(array, -Infinity, 10);

      const expected = [1, 5, 10, 10, 10];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayClip() should clip values both above and below the bounds',
    test: () => {
      const array = [1, 5, 10, -5, 15];
      const result = arrayClip(array, 0, 10);

      const expected = [1, 5, 10, 0, 10];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayClip() should return the same array if all values are within bounds',
    test: () => {
      const array = [1, 5, 10, 15, 20];
      const result = arrayClip(array, 0, 25);

      const expected = [1, 5, 10, 15, 20];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayClip() should handle an empty array',
    test: () => {
      const array = [];
      const result = arrayClip(array, 0, 10);

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayClip() should handle an array with mixed types, ignoring non-numeric values',
    test: () => {
      const array = [1, "5", null, 10, undefined, 15];
      const result = arrayClip(array, 5, 10);

      const expected = [5, 5, 5, 10, 5, 10]; // Non-numeric values replaced by lower bound
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayClip() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i - 5000);
      const result = arrayClip(largeArray, 0, 5000);

      const expected = Array.from({ length: 10000 }, (_, i) =>
        Math.min(5000, Math.max(0, i - 5000))
      );
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected).slice(0, 50)}..., but got ${JSON.stringify(result).slice(0, 50)}...`);
      }
    }
  }
];
