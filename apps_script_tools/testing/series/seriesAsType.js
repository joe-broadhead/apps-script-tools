SERIES_AS_TYPE_TESTS = [
  {
    description: "Series.asType() should correctly convert all elements to integers",
    test: () => {
      const series = new Series([1.2, "2", "3.5", null, undefined, "text"], 'toIntegers');
      const result = series.asType('integer').array;
      const expected = [1, 2, 3, null, null, null]; // Coerces to integers, invalids become null
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.asType() should correctly convert all elements to floats",
    test: () => {
      const series = new Series(["1.2", "2", "3.5", null, undefined, "text"], 'toFloats');
      const result = series.asType('float').array;
      const expected = [1.2, 2, 3.5, null, null, null]; // Coerces to floats, invalids become null
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.asType() should correctly convert all elements to strings",
    test: () => {
      const series = new Series([1, 2, true, null, undefined], 'toStrings');
      const result = series.asType('string').array;
      const expected = ["1", "2", "true", null, null]; // Coerces to strings, nulls remain null
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.asType() should correctly convert all elements to booleans",
    test: () => {
      const series = new Series([1, 0, "true", "false", null, undefined], 'toBooleans');
      const result = series.asType('boolean').array;
      const expected = [true, false, true, false, null, null]; // Coerces to booleans, nulls remain null
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.asType() should return the same array when type is 'number' and all elements are already numeric",
    test: () => {
      const series = new Series([1, 2.5, 3], 'alreadyNumbers');
      const result = series.asType('number').array;
      const expected = [1, 2.5, 3]; // Already numbers, no change
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.asType() should return null for all elements in an array of invalid values when type is 'number'",
    test: () => {
      const series = new Series(["text", null, undefined], 'invalidNumbers');
      const result = series.asType('number').array;
      const expected = [null, null, null]; // Invalid values become null
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "Series.asType() should throw an error for unsupported types",
    test: () => {
      const series = new Series([1, 2, 3], 'unsupportedType');
      try {
        series.asType('unsupported');
        throw new Error('Expected an error for unsupported type, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Unsupported type')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "Series.asType() should handle an empty Series gracefully",
    test: () => {
      const series = new Series([], 'empty');
      const result = series.asType('integer').array;
      const expected = []; // Empty array remains empty
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
];
