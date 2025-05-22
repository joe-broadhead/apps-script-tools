SERIES_ADD_TESTS = [
  {
    description: 'Series.add() should compute the element-wise sum of two Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2, 3], 'B');
      const result = seriesA.add(seriesB);

      const expectedValues = [11, 22, 33]; // Element-wise sum of seriesA and seriesB
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should throw an error when Series have different lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2], 'B'); // Shorter length

      try {
        seriesA.add(seriesB);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All elements in seriesArray must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.add() should return an empty Series for empty inputs',
    test: () => {
      const seriesA = new Series([], 'A');
      const seriesB = new Series([], 'B');
      const result = seriesA.add(seriesB);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should handle Series with mixed data types',
    test: () => {
      const seriesA = new Series([10, "20", true], 'A');
      const seriesB = new Series([5, "10", false], 'B');
      const result = seriesA.add(seriesB);

      const expectedValues = [15, 30, 1]; // 10+5, 20+10, true (1) + false (0)
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should handle large Series efficiently',
    test: () => {
      const largeArrayA = Array.from({ length: 10000 }, (_, i) => i);
      const largeArrayB = Array.from({ length: 10000 }, (_, i) => i * 2);
      const seriesA = new Series(largeArrayA, 'A');
      const seriesB = new Series(largeArrayB, 'B');
      const result = seriesA.add(seriesB);

      const expectedValues = largeArrayA.map((value, index) => value + largeArrayB[index]); // Element-wise sum
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
  {
    description: 'Series.add() should return NaN for operations involving null or undefined values',
    test: () => {
      const seriesA = new Series([10, null, undefined, 20], 'A');
      const seriesB = new Series([2, 3, 4, null], 'B');
      const result = seriesA.add(seriesB);

      const expectedValues = [12, NaN, NaN, NaN]; // Add: 10+2=12, null+3=NaN, undefined+4=NaN, 20+null=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should return all NaN when both Series contain only null values',
    test: () => {
      const seriesA = new Series([null, null, null], 'A');
      const seriesB = new Series([null, null, null], 'B');
      const result = seriesA.add(seriesB);

      const expectedValues = [NaN, NaN, NaN]; // All null values result in NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should add a scalar to each element in the Series',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.add(5);

      const expectedValues = [15, 25, 35]; // Add scalar 5 to each element
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should return an empty Series when adding a scalar to an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.add(5);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should handle a scalar added to a Series with mixed data types',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.add(5);

      const expectedValues = [15, 25, 6, NaN]; // Add scalar 5: 10+5=15, "20"+5=25, true(1)+5=6, null+5=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.add() should handle a large Series with a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = series.add(10);

      const expectedValues = largeArray.map(value => value + 10); // Add scalar 10 to each element
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
