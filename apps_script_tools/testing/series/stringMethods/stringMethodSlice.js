SERIES_STR_SLICE_TESTS = [
  {
    description: "Series.str.slice() should slice strings with a valid start and end",
    test: () => {
      const series = new Series(["hello", "world", "test"], "test");
      const result = series.str.slice(1, 4);
      const expected = ["ell", "orl", "est"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.slice() should handle a start index without an end index",
    test: () => {
      const series = new Series(["hello", "world", "test"], "test");
      const result = series.str.slice(2);
      const expected = ["llo", "rld", "st"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.slice() should handle a negative start index",
    test: () => {
      const series = new Series(["hello", "world", "test"], "test");
      const result = series.str.slice(-3);
      const expected = ["llo", "rld", "est"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.slice() should handle a negative end index",
    test: () => {
      const series = new Series(["hello", "world", "test"], "test");
      const result = series.str.slice(1, -1);
      const expected = ["ell", "orl", "es"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.slice() should handle a start index greater than the string length",
    test: () => {
      const series = new Series(["hello", "world", "test"], "test");
      const result = series.str.slice(10);
      const expected = ["", "", ""];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.slice() should handle an empty Series",
    test: () => {
      const series = new Series([], "test");
      const result = series.str.slice(1, 3);
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.slice() should handle null or undefined values",
    test: () => {
      const series = new Series(["hello", null, undefined], "test");
      const result = series.str.slice(1, 3);
      const expected = ["el", null, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.slice() should handle an empty string",
    test: () => {
      const series = new Series(["", "world"], "test");
      const result = series.str.slice(0, 2);
      const expected = ["", "wo"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
