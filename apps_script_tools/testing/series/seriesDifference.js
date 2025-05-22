SERIES_DIFFERENCE_TESTS = [
  {
    description: 'Series.difference() should compute differences between two Series',
    test: () => {
      const seriesA = new Series([1, 2, 3, 4], 'a');
      const seriesB = new Series([3, 4, 5], 'b');
      const result = seriesA.difference(seriesB);

      const expectedValues = [1, 2]; // Elements in seriesA but not in seriesB
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.difference() should compute differences between a Series and an array',
    test: () => {
      const series = new Series([10, 20, 30], 'a');
      const array = [20, 30, 40];
      const result = series.difference(array);

      const expectedValues = [10]; // Elements in series but not in array
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.difference() should return an empty array for identical Series',
    test: () => {
      const seriesA = new Series([1, 2, 3], 'a');
      const seriesB = new Series([1, 2, 3], 'b');
      const result = seriesA.difference(seriesB);

      const expectedValues = []; // No difference
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.difference() should return all elements if the second input is empty',
    test: () => {
      const series = new Series([1, 2, 3], 'a');
      const emptyArray = [];
      const result = series.difference(emptyArray);

      const expectedValues = [1, 2, 3]; // All elements from series
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.difference() should return an empty array if the first Series is empty',
    test: () => {
      const series = new Series([], 'a');
      const array = [1, 2, 3];
      const result = series.difference(array);

      const expectedValues = []; // Empty Series → No differences
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.difference() should handle large Series efficiently',
    test: () => {
      const seriesA = new Series(Array.from({ length: 10000 }, (_, i) => i), 'a');
      const seriesB = new Series(Array.from({ length: 5000 }, (_, i) => i), 'b');
      const result = seriesA.difference(seriesB);

      const expectedValues = Array.from({ length: 5000 }, (_, i) => i + 5000); // Remaining values in seriesA
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series Difference');
      }
    },
  },
];
