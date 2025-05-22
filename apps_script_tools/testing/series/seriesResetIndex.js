SERIES_RESET_INDEX_TESTS = [
  {
    description: 'Series.resetIndex() should reset the index to sequential order',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      series.index = [5, 10, 15]; // Custom non-sequential index
      series.resetIndex();
      
      const expectedIndex = [0, 1, 2];
      if (JSON.stringify(series.index) !== JSON.stringify(expectedIndex)) {
        throw new Error(`Expected index to be ${JSON.stringify(expectedIndex)}, but got ${JSON.stringify(series.index)}`);
      }
    }
  },
  {
    description: 'Series.resetIndex() should not modify the data array',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const originalData = [...series.array]; // Copy of original data
      series.resetIndex();
  
      if (JSON.stringify(series.array) !== JSON.stringify(originalData)) {
        throw new Error(`Expected data to remain ${JSON.stringify(originalData)}, but got ${JSON.stringify(series.array)}`);
      }
    }
  },
  {
    description: 'Series.resetIndex() should return the Series instance for method chaining',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.resetIndex().resetIndex(); // Chain the method
  
      if (result !== series) {
        throw new Error('Expected resetIndex() to return the Series instance for chaining');
      }
    }
  },
];
