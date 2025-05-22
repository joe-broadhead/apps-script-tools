SERIES_ITERATOR_TESTS= [
  {
    description: 'Symbol.iterator should iterate over a non-empty Series',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = [...series]; // Using spread to consume the iterator
  
      const expectedValues = [[10, 0], [20, 1], [30, 2]]; // Expected [value, index] pairs
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Symbol.iterator should handle an empty Series',
    test: () => {
      const series = new Series([], 'A');
      const result = [...series]; // Using spread to consume the iterator
  
      const expectedValues = []; // Empty Series yields no values
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Symbol.iterator should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "text", true, null], 'A');
      const result = [...series];
  
      const expectedValues = [[10, 0], ["text", 1], [true, 2], [null, 3]]; // Mixed data [value, index] pairs
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Symbol.iterator should work correctly in a for...of loop',
    test: () => {
      const series = new Series([10, 20, 30], 'A');
      const result = [];
      for (const [value, index] of series) {
        result.push([value, index]);
      }
  
      const expectedValues = [[10, 0], [20, 1], [30, 2]]; // Expected [value, index] pairs
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Symbol.iterator should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const result = [...series];
  
      const expectedValues = largeArray.map((value, index) => [value, index]); // Generate expected [value, index] pairs
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series Iteration');
      }
    },
  },
];
