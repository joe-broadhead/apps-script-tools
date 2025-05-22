SERIES_AT_TESTS = [
  {
    description: 'Series.at() should retrieve the element at a valid index',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.at(1);

      const expectedValue = 20; // Element at index 1
      if (result !== expectedValue) {
        throw new Error(`Expected ${expectedValue}, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.at() should return undefined for an out-of-range index',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.at(5);

      if (result !== undefined) {
        throw new Error(`Expected undefined, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.at() should return undefined for a negative index',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.at(-1);

      if (result !== undefined) {
        throw new Error(`Expected undefined, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.at() should return undefined for any index in an empty Series',
    test: () => {
      const series = new Series([], 'empty');
      const result = series.at(0);

      if (result !== undefined) {
        throw new Error(`Expected undefined, but got ${result}`);
      }
    },
  },
  {
    description: 'Series.at() should return undefined for an index equal to the length of the Series',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.at(series.array.length);

      if (result !== undefined) {
        throw new Error(`Expected undefined, but got ${result}`);
      }
    },
  },
];
