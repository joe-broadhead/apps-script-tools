SERIES_STR_ZFILL_TESTS = [
  {
    description: "Series.str.zfill() should pad strings with zeros to the specified width",
    test: () => {
      const series = new Series(['123', '45', ''], 'test');
      const result = series.str.zfill(5);
      const expected = ['00123', '00045', '00000'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should return original strings if they are already the specified width",
    test: () => {
      const series = new Series(['12345', '67890'], 'test');
      const result = series.str.zfill(5);
      const expected = ['12345', '67890'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should return original strings if they exceed the specified width",
    test: () => {
      const series = new Series(['123456', '789012'], 'test');
      const result = series.str.zfill(5);
      const expected = ['123456', '789012'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should handle numeric input by converting it to strings",
    test: () => {
      const series = new Series([123, 45, 0], 'test');
      const result = series.str.zfill(5);
      const expected = ['00123', '00045', '00000'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should handle a width of 0 by returning the original strings",
    test: () => {
      const series = new Series(['123', '45'], 'test');
      const result = series.str.zfill(0);
      const expected = ['123', '45'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should handle empty strings",
    test: () => {
      const series = new Series(['', '', ''], 'test');
      const result = series.str.zfill(5);
      const expected = ['00000', '00000', '00000'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should throw an error if width is not a non-negative integer",
    test: () => {
      const series = new Series(['123'], 'test');
      try {
        series.str.zfill(-1);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('The width must be a non-negative integer')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "Series.str.zfill() should handle strings with spaces",
    test: () => {
      const series = new Series([' 123', ' 45'], 'test');
      const result = series.str.zfill(6);
      const expected = ["00 123","000 45"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should handle strings with special characters",
    test: () => {
      const series = new Series(['#$%', '123'], 'test');
      const result = series.str.zfill(5);
      const expected = ['00#$%', '00123'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.zfill() should handle strings with leading zeros",
    test: () => {
      const series = new Series(['00123', '00045'], 'test');
      const result = series.str.zfill(7);
      const expected = ['0000123', '0000045'];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
