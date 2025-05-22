SERIES_APPEND_TESTS = [
  {
    description: 'Series.append() should append single values and update the index',
    test: () => {
      const series = new Series([10, 20], 'values');
      series.append(30, 40);

      const expectedArray = [10, 20, 30, 40];
      const expectedIndex = [0, 1, 2, 3];

      if (JSON.stringify(series.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array to be ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(series.array)}`);
      }

      if (JSON.stringify(series.index) !== JSON.stringify(expectedIndex)) {
        throw new Error(`Expected index to be ${JSON.stringify(expectedIndex)}, but got ${JSON.stringify(series.index)}`);
      }
    },
  },
  {
    description: 'Series.append() should flatten arrays and append their values',
    test: () => {
      const series = new Series([10, 20], 'values');
      series.append([30, 40], [50, 60]);

      const expectedArray = [10, 20, 30, 40, 50, 60];
      const expectedIndex = [0, 1, 2, 3, 4, 5];

      if (JSON.stringify(series.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array to be ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(series.array)}`);
      }

      if (JSON.stringify(series.index) !== JSON.stringify(expectedIndex)) {
        throw new Error(`Expected index to be ${JSON.stringify(expectedIndex)}, but got ${JSON.stringify(series.index)}`);
      }
    },
  },
  {
    description: 'Series.append() should update the inferred type of the Series',
    test: () => {
      const series = new Series([10, 20], 'values'); // Initial type: 'number'
      series.append('string', true);

      const expectedArray = [10, 20, 'string', true];
      const expectedType = 'mixed'; // Appending 'string' and 'boolean' changes type to 'mixed'

      if (JSON.stringify(series.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array to be ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(series.array)}`);
      }

      if (series.type !== expectedType) {
        throw new Error(`Expected type to be '${expectedType}', but got '${series.type}'`);
      }
    },
  },
  {
    description: 'Series.append() should handle appending values to an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      series.append(10, 20);

      const expectedArray = [10, 20];
      const expectedIndex = [0, 1];

      if (JSON.stringify(series.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array to be ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(series.array)}`);
      }

      if (JSON.stringify(series.index) !== JSON.stringify(expectedIndex)) {
        throw new Error(`Expected index to be ${JSON.stringify(expectedIndex)}, but got ${JSON.stringify(series.index)}`);
      }
    },
  },
  {
    description: 'Series.append() should correctly infer mixed type when appending different types',
    test: () => {
      const series = new Series(['a', 'b'], 'mixed');
      series.append(10, true);

      const expectedType = 'mixed';

      if (series.type !== expectedType) {
        throw new Error(`Expected type to be '${expectedType}', but got '${series.type}'`);
      }
    },
  },
];
