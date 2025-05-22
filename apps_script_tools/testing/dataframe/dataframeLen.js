DATAFRAME_LEN_TESTS = [
  {
    description: 'Basic: DataFrame.len() should return the correct number of rows',
    test: () => {
      const df = new DataFrame({
        'A': new Series([1, 2, 3], 'A'),
        'B': new Series(['a', 'b', 'c'], 'B')
      });

      const result = df.len();
      const expected = 3;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: Empty DataFrame with no columns should return length 0',
    test: () => {
      const df = new DataFrame({});

      const result = df.len();
      const expected = 0;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame with empty columns (zero rows) should return length 0',
    test: () => {
      const df = new DataFrame({
        'A': new Series([], 'A'),
        'B': new Series([], 'B')
      });

      const result = df.len();
      const expected = 0;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame with single column should return correct length',
    test: () => {
      const df = new DataFrame({
        'A': new Series([1, 2, 3, 4, 5], 'A')
      });

      const result = df.len();
      const expected = 5;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame with null/undefined values should count them as rows',
    test: () => {
      const df = new DataFrame({
        'A': new Series([1, null, undefined, 4, 5], 'A'),
        'B': new Series(['a', 'b', null, 'd', undefined], 'B')
      });

      const result = df.len();
      const expected = 5;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame created from records should have correct length',
    test: () => {
      const records = [
        { a: 1, b: 'x' },
        { a: 2, b: 'y' },
        { a: 3, b: 'z' }
      ];
      const df = DataFrame.fromRecords(records);

      const result = df.len();
      const expected = 3;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame after select() operation should maintain length',
    test: () => {
      const df = new DataFrame({
        'A': new Series([1, 2, 3], 'A'),
        'B': new Series(['a', 'b', 'c'], 'B'),
        'C': new Series([true, false, true], 'C')
      });

      const selected = df.select(['A', 'C']);
      const result = selected.len();
      const expected = 3;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame after drop() operation should maintain length',
    test: () => {
      const df = new DataFrame({
        'A': new Series([1, 2, 3], 'A'),
        'B': new Series(['a', 'b', 'c'], 'B'),
        'C': new Series([true, false, true], 'C')
      });

      const dropped = df.drop(['B']);
      const result = dropped.len();
      const expected = 3;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame with custom index should return correct length',
    test: () => {
      const data = {
        'A': new Series([1, 2, 3], 'A'),
        'B': new Series(['a', 'b', 'c'], 'B')
      };
      const customIndex = ['row1', 'row2', 'row3'];
      const df = new DataFrame(data, customIndex);

      const result = df.len();
      const expected = 3;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: Large DataFrame should return correct length',
    test: () => {
      const size = 10000;
      const array = Array.from({ length: size }, (_, i) => i);
      const df = new DataFrame({
        'A': new Series(array, 'A'),
        'B': new Series(array, 'B')
      });

      const result = df.len();
      const expected = size;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame after assign() with new columns should return correct length',
    test: () => {
      const df = new DataFrame({
        'A': new Series([1, 2, 3], 'A'),
        'B': new Series(['a', 'b', 'c'], 'B')
      });

      const withNewCol = df.assign({
        'C': new Series([10, 20, 30], 'C')
      });

      const result = withNewCol.len();
      const expected = 3;

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },

  {
    description: 'Edge case: DataFrame.len() should throw error if columns have inconsistent lengths',
    test: () => {
      try {
        // This should throw an error during DataFrame creation
        const df = new DataFrame({
          'A': new Series([1, 2, 3], 'A'),
          'B': new Series(['a', 'b', 'c', 'd'], 'B')  // One extra element
        });

        // If we get here, the test failed
        throw new Error("DataFrame constructor should have thrown an error for inconsistent column lengths");
      } catch (error) {
        // Make sure error message mentions column length
        if (!error.message.includes('length') && !error.message.includes('same')) {
          throw new Error(`Expected error about column lengths, got: ${error.message}`);
        }
      }
    }
  }
];