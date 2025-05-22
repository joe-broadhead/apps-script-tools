SERIES_MULTIPLY_TESTS = [
  {
    description: 'Series.multiply() should compute the element-wise product of two Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2, 3], 'B');
      const result = seriesA.multiply(seriesB);

      const expectedValues = [10, 40, 90]; // Element-wise product of seriesA and seriesB
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should throw an error when Series have different lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2], 'B'); // Shorter length

      try {
        seriesA.multiply(seriesB);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All elements in seriesArray must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.multiply() should return an empty Series for empty inputs',
    test: () => {
      const seriesA = new Series([], 'A');
      const seriesB = new Series([], 'B');
      const result = seriesA.multiply(seriesB);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should handle Series with mixed data types',
    test: () => {
      const seriesA = new Series([10, "20", true], 'A');
      const seriesB = new Series([2, 10, false], 'B');
      const result = seriesA.multiply(seriesB);

      const expectedValues = [20, 200, 0]; // Multiply: 10*2=20, "20"*10=200, true (1)*false (0)=0
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should handle large Series efficiently',
    test: () => {
      const largeArrayA = Array.from({ length: 10000 }, (_, i) => i + 1);
      const largeArrayB = Array.from({ length: 10000 }, (_, i) => i + 2);
      const seriesA = new Series(largeArrayA, 'A');
      const seriesB = new Series(largeArrayB, 'B');
      const result = seriesA.multiply(seriesB);

      const expectedValues = largeArrayA.map((value, index) => value * largeArrayB[index]); // Element-wise product
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
  {
    description: 'Series.multiply() should return NaN for operations involving null or undefined values',
    test: () => {
      const seriesA = new Series([10, null, undefined, 20], 'A');
      const seriesB = new Series([2, 3, 4, null], 'B');
      const result = seriesA.multiply(seriesB);

      const expectedValues = [20, NaN, NaN, NaN]; // Multiply: 10*2=20, null*3=NaN, undefined*4=NaN, 20*null=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should return all NaN when both Series contain only null values',
    test: () => {
      const seriesA = new Series([null, null, null], 'A');
      const seriesB = new Series([null, null, null], 'B');
      const result = seriesA.multiply(seriesB);

      const expectedValues = [NaN, NaN, NaN]; // All null values result in NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should multiply a scalar with each element in the Series',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.multiply(5);

      const expectedValues = [50, 100, 150]; // Multiply scalar 5 to each element
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should return an empty Series when multiplying a scalar with an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.multiply(5);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should handle a Series with mixed data types multiplied by a scalar',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.multiply(5);

      const expectedValues = [50, 100, 5, NaN]; // Multiply: 10*5=50, "20"*5=100, true(1)*5=5, null*5=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.multiply() should handle a large Series multiplied with a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const series = new Series(largeArray, 'A');
      const result = series.multiply(10);

      const expectedValues = largeArray.map(value => value * 10); // Multiply scalar 10 to each element
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
