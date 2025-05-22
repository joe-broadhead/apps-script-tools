SERIES_BETWEEN_TESTS = [
  {
    description: 'Series.between() should check if each element is within the specified range (inclusive)',
    test: () => {
      const series = new Series([10, 15, 20, 25], 'A');
      const result = series.between(15, 20);

      const expectedValues = [false, true, true, false]; // Inclusive range: 10∈[15,20]=false, 15∈[15,20]=true, etc.
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.between() should check if each element is within the specified range (exclusive)',
    test: () => {
      const series = new Series([10, 15, 20, 25], 'A');
      const result = series.between(15, 20, false);

      const expectedValues = [false, false, false, false]; // Exclusive range: 15∈(15,20)=false, etc.
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.between() should handle a Series with mixed data types (inclusive)',
    test: () => {
      const series = new Series([10, "15", true, null], 'A');
      const result = series.between(10, 15);

      const expectedValues = [true, true, false, false]; // Inclusive range: 10∈[10,15]=true, etc.
      if (JSON.stringify(result.array) !== JSON.stringify(expectedValues)) {
        throw new Error(`Expected ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: 'Series.between() should handle edge cases with inclusive/exclusive bounds',
    test: () => {
      const series = new Series([10, 15, 20, 25], 'A');
      const resultInclusive = series.between(15, 20, true);
      const resultExclusive = series.between(15, 20, false);

      const expectedInclusive = [false, true, true, false]; // Inclusive range
      const expectedExclusive = [false, false, false, false]; // Exclusive range

      if (JSON.stringify(resultInclusive.array) !== JSON.stringify(expectedInclusive)) {
        throw new Error(`Expected ${JSON.stringify(expectedInclusive)} for inclusive, but got ${JSON.stringify(resultInclusive.array)}`);
      }
      if (JSON.stringify(resultExclusive.array) !== JSON.stringify(expectedExclusive)) {
        throw new Error(`Expected ${JSON.stringify(expectedExclusive)} for exclusive, but got ${JSON.stringify(resultExclusive.array)}`);
      }
    },
  },
  {
    description: 'Series.between() should handle large Series with inclusive/exclusive bounds efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const series = new Series(largeArray, 'A');
      const resultInclusive = series.between(5000, 6000);
      const resultExclusive = series.between(5000, 6000, false);

      const expectedInclusive = largeArray.map(value => value >= 5000 && value <= 6000); // Inclusive range
      const expectedExclusive = largeArray.map(value => value > 5000 && value < 6000); // Exclusive range

      if (JSON.stringify(resultInclusive.array) !== JSON.stringify(expectedInclusive)) {
        throw new Error('Failed Test: Large Series with inclusive bounds');
      }
      if (JSON.stringify(resultExclusive.array) !== JSON.stringify(expectedExclusive)) {
        throw new Error('Failed Test: Large Series with exclusive bounds');
      }
    },
  },
];
