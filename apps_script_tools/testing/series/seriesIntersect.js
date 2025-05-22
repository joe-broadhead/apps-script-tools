SERIES_INTERSECT_TESTS = [
  {
    description: 'Series.intersect() should compute intersections between two Series',
    test: () => {
      const seriesA = new Series([1, 2, 3, 4], 'a');
      const seriesB = new Series([3, 4, 5], 'b');
      const result = seriesA.intersect(seriesB);

      const expectedValues = [3, 4]; // Elements common to seriesA and seriesB
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.intersect() should compute intersections between a Series and an array',
    test: () => {
      const series = new Series([10, 20, 30], 'a');
      const array = [20, 30, 40];
      const result = series.intersect(array);

      const expectedValues = [20, 30]; // Elements common to series and array
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.intersect() should return an empty array if there are no common elements',
    test: () => {
      const seriesA = new Series([1, 2, 3], 'a');
      const seriesB = new Series([4, 5, 6], 'b');
      const result = seriesA.intersect(seriesB);

      const expectedValues = []; // No common elements
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.intersect() should return an empty array if either input is empty',
    test: () => {
      const series = new Series([1, 2, 3], 'a');
      const emptyArray = [];
      const result = series.intersect(emptyArray);

      const expectedValues = []; // No common elements with an empty input
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.intersect() should handle large Series efficiently',
    test: () => {
      const seriesA = new Series(Array.from({ length: 10000 }, (_, i) => i), 'a');
      const seriesB = new Series(Array.from({ length: 5000 }, (_, i) => i * 2), 'b'); // Even numbers
      const result = seriesA.intersect(seriesB);
  
      const expectedValues = Array.from({ length: 5000 }, (_, i) => i * 2); // Common even numbers
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
