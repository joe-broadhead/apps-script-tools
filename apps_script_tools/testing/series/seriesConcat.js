SERIES_CONCAT_TESTS = [
  {
    description: 'Series.concat() should concatenate corresponding elements with the default separator',
    test: () => {
      const seriesA = new Series(["apple", "banana", "cherry"], 'A');
      const seriesB = new Series(["pie", "smoothie", "tart"], 'B');
      const result = seriesA.concat(seriesB);

      const expectedValues = ["apple pie", "banana smoothie", "cherry tart"];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should concatenate corresponding elements with a custom separator',
    test: () => {
      const seriesA = new Series(["apple", "banana", "cherry"], 'A');
      const seriesB = new Series(["pie", "smoothie", "tart"], 'B');
      const result = seriesA.concat(seriesB, '-');

      const expectedValues = ["apple-pie", "banana-smoothie", "cherry-tart"];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should return an empty Series for empty inputs',
    test: () => {
      const seriesA = new Series([], 'A');
      const seriesB = new Series([], 'B');
      const result = seriesA.concat(seriesB);

      const expectedValues = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should handle large Series efficiently',
    test: () => {
      const largeArrayA = Array.from({ length: 10000 }, (_, i) => `A${i}`);
      const largeArrayB = Array.from({ length: 10000 }, (_, i) => `B${i}`);
      const seriesA = new Series(largeArrayA, 'A');
      const seriesB = new Series(largeArrayB, 'B');
      const result = seriesA.concat(seriesB, '_');

      const expectedValues = largeArrayA.map((value, index) => `${value}_${largeArrayB[index]}`);
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
  {
    description: 'Series.concat() should return null for operations involving null or undefined values',
    test: () => {
      const seriesA = new Series(["apple", null, undefined, "banana"], 'A');
      const seriesB = new Series(["pie", "smoothie", "tart", null], 'B');
      const result = seriesA.concat(seriesB);

      const expectedValues = ["apple pie", null, null, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should return all null when both Series contain only null values',
    test: () => {
      const seriesA = new Series([null, null, null], 'A');
      const seriesB = new Series([null, null, null], 'B');
      const result = seriesA.concat(seriesB);

      const expectedValues = [null, null, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should concatenate a scalar to each element in the Series',
    test: () => {
      const series = new Series(["apple", "banana", "cherry"], 'A');
      const result = series.concat("pie");

      const expectedValues = ["apple pie", "banana pie", "cherry pie"];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should return an empty Series when concatenating an empty Series with a scalar',
    test: () => {
      const series = new Series([], 'A');
      const result = series.concat("fruit");

      const expectedValues = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should handle concatenating a scalar with a Series of mixed data types',
    test: () => {
      const series = new Series(["apple", 20, true, null], 'A');
      const result = series.concat("pie");

      const expectedValues = ["apple pie", "20 pie", "true pie", null];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.concat() should handle a large Series concatenated with a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => `word${i}`);
      const series = new Series(largeArray, 'A');
      const result = series.concat("suffix");

      const expectedValues = largeArray.map(value => `${value} suffix`);
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
