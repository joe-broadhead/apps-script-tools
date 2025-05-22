SERIES_CLIP_TESTS = [
  {
    description: 'Series.clip() should limit values to lie between specified bounds',
    test: () => {
      const series = new Series([5, 15, 25, 35], 'values');
      const result = series.clip(10, 30);

      const expectedClipped = [10, 15, 25, 30]; // Values clipped between 10 and 30
      if (JSON.stringify(result.array) !== JSON.stringify(expectedClipped)) {
        throw new Error(`Expected ${JSON.stringify(expectedClipped)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.clip() should return the original values when no bounds are specified',
    test: () => {
      const series = new Series([5, 15, 25, 35], 'values');
      const result = series.clip();

      const expectedClipped = [5, 15, 25, 35]; // No clipping when bounds are -Infinity to Infinity
      if (JSON.stringify(result.array) !== JSON.stringify(expectedClipped)) {
        throw new Error(`Expected ${JSON.stringify(expectedClipped)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.clip() should clip values below the specified lower bound',
    test: () => {
      const series = new Series([5, 15, 25, 35], 'values');
      const result = series.clip(20);

      const expectedClipped = [20, 20, 25, 35]; // Values below 20 are clipped to 20
      if (JSON.stringify(result.array) !== JSON.stringify(expectedClipped)) {
        throw new Error(`Expected ${JSON.stringify(expectedClipped)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.clip() should clip values above the specified upper bound',
    test: () => {
      const series = new Series([5, 15, 25, 35], 'values');
      const result = series.clip(undefined, 20);

      const expectedClipped = [5, 15, 20, 20]; // Values above 20 are clipped to 20
      if (JSON.stringify(result.array) !== JSON.stringify(expectedClipped)) {
        throw new Error(`Expected ${JSON.stringify(expectedClipped)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.clip() should return an empty Series for an empty input',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.clip(10, 30);

      const expectedClipped = []; // Empty Series
      if (JSON.stringify(result.array) !== JSON.stringify(expectedClipped)) {
        throw new Error(`Expected ${JSON.stringify(expectedClipped)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.clip() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1); // Values 1 to 10,000
      const series = new Series(largeArray, 'large');
      const result = series.clip(100, 500);

      const expectedClipped = largeArray.map(num => Math.min(Math.max(num, 100), 500));
      if (JSON.stringify(result.array) !== JSON.stringify(expectedClipped)) {
        throw new Error(`Expected ${JSON.stringify(expectedClipped)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
