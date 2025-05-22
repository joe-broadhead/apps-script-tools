ARRAY_MODE_TESTS = [
  {
    description: 'arrayMode() should return the mode of an array of numbers',
    test: () => {
      const array = [1, 2, 2, 3, 3, 3, 4];
      const result = arrayMode(array);

      const expectedMode = 3; // 3 appears the most frequently
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMode() should return the first mode when there are ties',
    test: () => {
      const array = [1, 2, 2, 3, 3];
      const result = arrayMode(array);

      const expectedMode = 2; // Both 2 and 3 have the same frequency, but 2 appears first
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMode() should return undefined for an empty array',
    test: () => {
      const array = [];
      const result = arrayMode(array);

      const expectedMode = undefined; // No elements in the array
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMode() should correctly handle an array with all unique elements',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayMode(array);

      const expectedMode = 1; // All elements have the same frequency, return the first one
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMode() should handle mixed data types',
    test: () => {
      const array = [1, "2", "2", null, undefined, "2", 1];
      const result = arrayMode(array);

      const expectedMode = "2"; // "2" appears the most frequently
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMode() should handle an array with only non-numeric values',
    test: () => {
      const array = ["a", "b", "b", "c", "a", "b"];
      const result = arrayMode(array);

      const expectedMode = "b"; // "b" appears the most frequently
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayMode() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100);
      const result = arrayMode(largeArray);

      const expectedMode = 0; // Each value repeats 100 times, return the first one
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    }
  }
];
