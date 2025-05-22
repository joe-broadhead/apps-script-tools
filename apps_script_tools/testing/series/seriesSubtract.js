SERIES_SUBTRACT_TESTS = [
  {
    description: 'Series.subtract() should compute the element-wise difference of two Series',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2, 3], 'B');
      const result = seriesA.subtract(seriesB);

      const expectedValues = [9, 18, 27]; // Element-wise difference of seriesA and seriesB
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should throw an error when Series have different lengths',
    test: () => {
      const seriesA = new Series([10, 20, 30], 'A');
      const seriesB = new Series([1, 2], 'B'); // Shorter length

      try {
        seriesA.subtract(seriesB);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('All elements in seriesArray must be Series of the same length')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'Series.subtract() should return an empty Series for empty inputs',
    test: () => {
      const seriesA = new Series([], 'A');
      const seriesB = new Series([], 'B');
      const result = seriesA.subtract(seriesB);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should handle Series with mixed data types',
    test: () => {
      const seriesA = new Series([10, "20", true], 'A');
      const seriesB = new Series([5, 10, false], 'B');
      const result = seriesA.subtract(seriesB);

      const expectedValues = [5, 10, 1]; // Subtract: 10-5=5, "20"-10=10, true (1)-false (0)=1
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should handle large Series efficiently',
    test: () => {
      const largeArrayA = Array.from({ length: 10000 }, (_, i) => i);
      const largeArrayB = Array.from({ length: 10000 }, (_, i) => i * 2);
      const seriesA = new Series(largeArrayA, 'A');
      const seriesB = new Series(largeArrayB, 'B');
      const result = seriesA.subtract(seriesB);

      const expectedValues = largeArrayA.map((value, index) => value - largeArrayB[index]); // Element-wise difference
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series');
      }
    },
  },
  {
    description: 'Series.subtract() should return NaN for operations involving null or undefined values',
    test: () => {
      const seriesA = new Series([10, null, undefined, 20], 'A');
      const seriesB = new Series([2, 3, 4, null], 'B');
      const result = seriesA.subtract(seriesB);

      const expectedValues = [8, NaN, NaN, NaN]; // Subtract: 10-2=8, null-3=NaN, undefined-4=NaN, 20-null=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should return all NaN when both Series contain only null values',
    test: () => {
      const seriesA = new Series([null, null, null], 'A');
      const seriesB = new Series([null, null, null], 'B');
      const result = seriesA.subtract(seriesB);

      const expectedValues = [NaN, NaN, NaN]; // All null values result in NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should subtract a scalar from each element in the Series',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = series.subtract(5);

      const expectedValues = [5, 15, 25]; // Subtract scalar 5 from each element
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should return an empty Series when subtracting a scalar from an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = series.subtract(5);

      const expectedValues = []; // Empty input results in an empty output
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should handle a scalar subtracted from a Series with mixed data types',
    test: () => {
      const series = new Series([10, "20", true, null], 'A');
      const result = series.subtract(5);

      const expectedValues = [5, 15, -4, NaN]; // Subtract scalar 5: 10-5=5, "20"-5=15, true(1)-5=-4, null-5=NaN
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.subtract() should handle a large Series with a scalar efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = series.subtract(10);

      const expectedValues = largeArray.map(value => value - 10); // Subtract scalar 10 from each element
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series with Scalar');
      }
    },
  },
];
