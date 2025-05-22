SERIES_GET_TYPE_TESTS = [
  {
    description: "Series.getType() should return the type when all values are of the same type",
    test: () => {
      const series = new Series([1, 2, 3], 'numbers');
      const result = series.getType();
      const expected = 'number';
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
  {
    description: "Series.getType() should return 'mixed' when values are of different types",
    test: () => {
      const series = new Series([1, 'text', true], 'mixed');
      const result = series.getType();
      const expected = 'mixed';
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
  {
    description: "Series.getType() should return 'undefined' for an empty Series",
    test: () => {
      const series = new Series([], 'empty');
      const result = series.getType();
      const expected = 'undefined'; // Assume 'undefined' as the expected behavior for empty Series
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
  {
    description: "Series.getType() should return 'object' for an array of all null values",
    test: () => {
      const series = new Series([null, null, null], 'nulls');
      const result = series.getType();
      const expected = 'object'; // JavaScript typeof null is 'object'
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
  {
    description: "Series.getType() should return 'boolean' when all values are booleans",
    test: () => {
      const series = new Series([true, false, true], 'booleans');
      const result = series.getType();
      const expected = 'boolean';
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
  {
    description: "Series.getType() should return 'string' when all values are strings",
    test: () => {
      const series = new Series(['apple', 'banana', 'cherry'], 'strings');
      const result = series.getType();
      const expected = 'string';
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
  {
    description: "Series.getType() should return 'mixed' when values are strings and booleans",
    test: () => {
      const series = new Series(['apple', true, 'banana', false], 'mixed');
      const result = series.getType();
      const expected = 'mixed';
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
  {
    description: "Series.getType() should return 'string' for a Series of empty strings",
    test: () => {
      const series = new Series(['', '', ''], 'emptyStrings');
      const result = series.getType();
      const expected = 'string';
      if (result !== expected) {
        throw new Error(`Expected '${expected}', but got '${result}'`);
      }
    }
  },
];
