SERIES_FILTER_TESTS = [
  {
    description: 'Series.filter() should filter elements based on a simple condition',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'a');
      const result = series.filter(value => value > 20);
    
      const expectedValues = [30, 40]; // Elements > 20
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      };
      if (result.name !== 'a') {
        throw new Error(`Expected name 'a', but got ${result.name}`);
      };
    },
  },
  {
    description: 'Series.filter() should handle a complex predicate function',
    test: () => {
      const series = new Series([10, 20, 30, 40], 'a');
      const result = series.filter(value => value % 20 === 0);
    
      const expectedValues = [20, 40]; // Values divisible by 20
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      };
    },
  },
  {
    description: 'Series.filter() should return an empty Series when applied to an empty Series',
    test: () => {
      const series = new Series([], 'a');
      const result = series.filter(value => value > 10);
    
      const expectedValues = []; // Empty Series remains empty
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      };
      if (result.name !== 'a') {
        throw new Error(`Expected name 'a', but got ${result.name}`);
      };
    },
  },
  {
    description: 'Series.filter() should return an empty Series if no elements match the predicate',
    test: () => {
      const series = new Series([10, 20, 30], 'a');
      const result = series.filter(value => value > 50);
    
      const expectedValues = []; // No values > 50
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      };
    },
  },
  {
    description: 'Series.filter() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "text", true, null, undefined], 'a');
      const result = series.filter(value => typeof value === 'number');
    
      const expectedValues = [10]; // Only numeric values
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      };
    },
  },
  {
    description: 'Series.filter() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'a');
      const result = series.filter(value => value % 2 === 0);
    
      const expectedValues = largeArray.filter(value => value % 2 === 0); // Even numbers
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series Filtering');
      };
    },
  },
];
