SERIES_TO_RECORDS_TESTS = [
  {
    description: 'Series.toRecords() should create a record for a single-value Series',
    test: () => {
      const series = new Series([10], 'a');
      const result = series.toRecords();
    
      const expectedValues = [{ a: 10 }];
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.toRecords() should create records for a multi-value Series',
    test: () => {
      const series = new Series([10, 20, 30], 'a');
      const result = series.toRecords();
    
      const expectedValues = [
        { a: 10 },
        { a: 20 },
        { a: 30 }
      ];
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.toRecords() should return an empty array for an empty Series',
    test: () => {
      const series = new Series([], 'a');
      const result = series.toRecords();
    
      const expectedValues = []; // Empty input → no records
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'Series.toRecords() should handle large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'a');
      const result = series.toRecords();
    
      const expectedValues = largeArray.map(value => ({ a: value }));
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error('Failed Test: Large Series Conversion to Records');
      }
    },
  },
  {
    description: 'Series.toRecords() should handle a Series with mixed data types',
    test: () => {
      const series = new Series([10, "text", null, undefined, true], 'a');
      const result = series.toRecords();
    
      const expectedValues = [
        { a: 10 },
        { a: "text" },
        { a: null },
        { a: undefined },
        { a: true }
      ];
      if (JSON.stringify(result) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
