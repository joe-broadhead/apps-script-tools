SERIES_FILL_NULLS_TESTS = [
  {
    description: 'Series.fillNulls() should replace null and undefined values with the specified fill value',
    test: () => {
      const series = new Series([10, null, 30, undefined], 'values');
      const result = series.fillNulls(0);

      const expectedArray = [10, 0, 30, 0]; // `null` and `undefined` replaced by 0
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== series.name) {
        throw new Error(`Expected name to be '${series.name}', but got '${result.name}'`);
      }
    },
  },
  {
    description: 'Series.fillNulls() should leave the Series unchanged if there are no null or undefined values',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.fillNulls(0);

      const expectedArray = [10, 20, 30]; // No replacements needed
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== series.name) {
        throw new Error(`Expected name to be '${series.name}', but got '${result.name}'`);
      }
    },
  },
  {
    description: 'Series.fillNulls() should handle an empty Series without errors',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.fillNulls(0);

      const expectedArray = []; // An empty Series remains empty
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array to be ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== series.name) {
        throw new Error(`Expected name to be '${series.name}', but got '${result.name}'`);
      }
    },
  },
  {
    description: 'Series.fillNulls() should handle a large Series with mixed values',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => (i % 5 === 0 ? null : i % 7 === 0 ? undefined : i));
      const series = new Series(largeArray, 'large');
      const result = series.fillNulls(0);

      const expectedArray = largeArray.map(value => (value === null || value === undefined ? 0 : value));
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array length ${expectedArray.length}, but got ${result.array.length}`);
      }
    },
  },
];
