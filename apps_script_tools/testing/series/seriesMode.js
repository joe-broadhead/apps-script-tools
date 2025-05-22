SERIES_MODE_TESTS = [
  {
    description: 'Series.mode() should return the most frequently occurring element',
    test: () => {
      const series = new Series([1, 2, 2, 3], 'values');
      const result = series.mode();

      const expectedMode = 2; // 2 appears most frequently
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mode() should return the first encountered element when there are multiple modes',
    test: () => {
      const series = new Series([1, 2, 3, 1, 2, 3], 'values');
      const result = series.mode();

      const expectedMode = 1; // 1, 2, and 3 have the same frequency; 1 is first
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mode() should work with mixed numeric and non-numeric elements',
    test: () => {
      const series = new Series([1, "1", "text", "1", null, undefined, "text"], 'values');
      const result = series.mode();

      const expectedMode = "1"; // "1" appears most frequently
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mode() should return the first element if all elements are unique',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'values');
      const result = series.mode();

      const expectedMode = 10; // No repeats, so the first element is returned
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mode() should return undefined for an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.mode();

      if (result !== undefined) {
        throw new Error(`Expected undefined, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.mode() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100); // 100 repeating values
      const series = new Series(largeArray, 'large');
      const result = series.mode();

      const expectedMode = 0; // All values repeat equally; first encountered is 0
      if (result !== expectedMode) {
        throw new Error(`Expected ${expectedMode}, but got ${result}`);
      }
    },
  },
];
