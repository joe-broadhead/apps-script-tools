SERIES_UNION_TESTS = [
  {
    description: 'Series.union() should perform a union all with duplicates',
    test: () => {
      const series1 = new Series([30, 25, 40], 'age');
      const series2 = new Series([25, 35, 40], 'age2');
      const result = series1.union(series2);
      
      const expectedArray = [30, 25, 40, 25, 35, 40]; // Keeps duplicates
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.union(true) should perform a union distinct',
    test: () => {
      const series1 = new Series([30, 25, 40], 'age');
      const series2 = new Series([25, 35, 40], 'age2');
      const result = series1.union(series2, true);
      
      const expectedArray = [30, 25, 40, 35]; // Removes duplicates
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.union() should work with an array as the other input',
    test: () => {
      const series = new Series([10, 20, 30], 'numbers');
      const array = [20, 40, 50];
      const result = series.union(array);

      const expectedArray = [10, 20, 30, 20, 40, 50]; // Keeps duplicates
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.union() should return the other Series/array when one is empty',
    test: () => {
      const series = new Series([10, 20, 30], 'numbers');
      const emptySeries = new Series([], 'empty');
      const result = series.union(emptySeries);

      const expectedArray = [10, 20, 30]; // Only values from the non-empty Series
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.union(true) should handle mixed types correctly',
    test: () => {
      const series1 = new Series([1, '1', true], 'mixed1');
      const series2 = new Series([true, 2, '1'], 'mixed2');
      const result = series1.union(series2, true);

      const expectedArray = [1, '1', true, 2]; // Distinct values
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
