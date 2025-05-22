SERIES_DIVIDE_TESTS = [
  {
    description: 'Series.divide() should compute the element-wise division of two Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([2, 4, 5], 'B');
      const result = seriesA.divide(seriesB);

      const expectedValues = [5, 5, 6]; // Element-wise division: 10/2=5, 20/4=5, 30/5=6
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should handle division by zero correctly',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([2, 0, 5], 'B');
      const result = seriesA.divide(seriesB);

      const expectedValues = [5, Infinity, 6]; // Division by 0 results in Infinity
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should return NaN for operations involving null or undefined values',
    test: () => {
      const seriesA = new Series([10, null, undefined, 20], 'A');
      const seriesB = new Series([2, 3, 4, null], 'B');
      const result = seriesA.divide(seriesB);

      const expectedValues = [5, NaN, NaN, NaN]; // Division: 10/2=5, null/3=NaN, undefined/4=NaN, 20/null=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should return all NaN when both Series contain only null values',
    test: () => {
      const seriesA = new Series([null, null, null], 'A');
      const seriesB = new Series([null, null, null], 'B');
      const result = seriesA.divide(seriesB);

      const expectedValues = [NaN, NaN, NaN]; // All null values result in NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should return an empty Series for empty inputs',
    test: () => {
      const seriesA = new Series([], 'A');
      const seriesB = new Series([], 'B');
      const result = seriesA.divide(seriesB);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should handle large Series efficiently',
    test: () => {
      const largeArrayA = Array.from({ length: 10000 }, (_, i) => i + 1);
      const largeArrayB = Array.from({ length: 10000 }, (_, i) => i + 2);
      const seriesA = new Series(largeArrayA, 'A');
      const seriesB = new Series(largeArrayB, 'B');
      const result = seriesA.divide(seriesB);

      const expectedValues = largeArrayA.map((value, index) => value / largeArrayB[index]); // Element-wise division
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
  {
    description: 'Series.divide() should divide each element in the Series by a scalar',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.divide(5);

      const expectedValues = [2, 4, 6]; // Divide each element by scalar 5
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should return an empty Series when dividing an empty Series by a scalar',
    test: () => {
      const series = new Series([], 'A');
      const result = series.divide(5);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should handle a Series with mixed data types divided by a scalar',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.divide(5);

      const expectedValues = [2, 4, 0.2, NaN]; // Divide: 10/5=2, "20"/5=4, true(1)/5=0.2, null/5=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should return Infinity when dividing by zero',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.divide(0);

      const expectedValues = [Infinity, Infinity, Infinity]; // Division by zero results in Infinity
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.divide() should handle a large Series divided by a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const series = new Series(largeArray, 'A');
      const result = series.divide(10);

      const expectedValues = largeArray.map(value => value / 10); // Divide each element by scalar 10
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
