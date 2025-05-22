SERIES_STR_PAD_TESTS = [
  {
    description: "Series.str.pad() should pad strings to the left with spaces by default",
    test: () => {
      const series = new Series(["hello", "world"], "test");
      const result = series.str.pad("start", 10);
      const expected = ["     hello", "     world"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should pad strings to the right with spaces by default",
    test: () => {
      const series = new Series(["hello", "world"], "test");
      const result = series.str.pad("end", 10);
      const expected = ["hello     ", "world     "];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should return the original strings if targetLength is less than or equal to string length",
    test: () => {
      const series = new Series(["hello", "test"], "test");
      const result = series.str.pad("start", 3);
      const expected = ["hello", "test"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should handle empty strings",
    test: () => {
      const series = new Series(["", ""], "test");
      const result = series.str.pad("start", 5, ".");
      const expected = [".....", "....."];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should handle a targetLength of 0",
    test: () => {
      const series = new Series(["hello", "world"], "test");
      const result = series.str.pad("start", 0);
      const expected = ["hello", "world"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should throw an error for invalid direction",
    test: () => {
      const series = new Series(["hello"], "test");
      try {
        series.str.pad("invalid", 10);
        throw new Error("Expected an error but none was thrown.");
      } catch (error) {
        if (!error.message.includes("Invalid direction")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "Series.str.pad() should handle a padString longer than the required padding",
    test: () => {
      const series = new Series(["hello"], "test");
      const result = series.str.pad("start", 7, "abc");
      const expected = ["abhello"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should handle a padString with special characters",
    test: () => {
      const series = new Series(["hello"], "test");
      const result = series.str.pad("end", 10, "*#");
      const expected = ["hello*#*#*"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should handle strings with existing spaces",
    test: () => {
      const series = new Series([" hello "], "test");
      const result = series.str.pad("start", 12, ".");
      const expected = ["..... hello "];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should handle an empty padString",
    test: () => {
      const series = new Series(["hello"], "test");
      const result = series.str.pad("start", 10, "");
      const expected = ["     hello"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should truncate padString if it exceeds required length",
    test: () => {
      const series = new Series(["hello"], "test");
      const result = series.str.pad("end", 8, "xyz");
      const expected = ["helloxyz"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should handle an all-uppercase string",
    test: () => {
      const series = new Series(["HELLO"], "test");
      const result = series.str.pad("end", 8, ".");
      const expected = ["HELLO..."];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "Series.str.pad() should handle numbers as padString",
    test: () => {
      const series = new Series(["hello"], "test");
      const result = series.str.pad("start", 10, "123");
      const expected = ["12312hello"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
