SERIES_FROM_RANGE_TESTS = [
  {
    description: 'Series.fromRange() should create a Series with a range of numbers using default step',
    test: () => {
      const result = Series.fromRange(0, 5, 1, 'range');

      const expectedArray = [0, 1, 2, 3, 4, 5];
      const expectedName = 'range';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromRange() should create a Series with a range of numbers using a custom step',
    test: () => {
      const result = Series.fromRange(0, 10, 2, 'range');

      const expectedArray = [0, 2, 4, 6, 8, 10];
      const expectedName = 'range';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromRange() should create a descending range when step is negative',
    test: () => {
      const result = Series.fromRange(10, 0, -2, 'range');

      const expectedArray = [10, 8, 6, 4, 2, 0];
      const expectedName = 'range';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromRange() should return a single element if start equals end',
    test: () => {
      const result = Series.fromRange(5, 5, 1, 'single');

      const expectedArray = [5];
      const expectedName = 'single';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromRange() should handle fractional steps correctly',
    test: () => {
      const result = Series.fromRange(0, 1, 0.2, 'fraction');

      const expectedArray = [0, 0.2, 0.4, 0.6, 0.8, 1];
      const expectedName = 'fraction';

      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }

      if (result.name !== expectedName) {
        throw new Error(`Expected name ${expectedName}, but got ${result.name}`);
      }
    }
  },
  {
    description: 'Series.fromRange() should handle an empty range if step is zero',
    test: () => {
      try {
        Series.fromRange(0, 5, 0, 'error');
        throw new Error('Expected an error for zero step, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Step cannot be zero')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
];
