SERIES_DT_MILLISECONDS_TESTS = [
  {
    description: "dt.milliseconds() should extract milliseconds from a Series of valid date strings",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45.678", "2023-11-19T14:56:00.123", "2023-11-19T23:00:30.456"], "dates", null, null, { useUTC: true });
      const result = series.dt.milliseconds();
      const expected = [678, 123, 456]; // Milliseconds extracted from the timestamps
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.milliseconds() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19T14:00:45.789", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.milliseconds();
      const expected = [null, 789, null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.milliseconds() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19T08:45:30.321"], "dates", null, null, { useUTC: false });
      const result = series.dt.milliseconds();
      const expected = [null, null, 321]; // Null and undefined values should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.milliseconds() should handle a Series of numeric timestamps",
    test: () => {
      const series = new Series([1700415600450, 1700458800123, 1700502000300], "timestamps", null, null, { useUTC: true });
      const result = series.dt.milliseconds();
      const expected = [450, 123, 300]; // Milliseconds extracted from the timestamps
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.milliseconds() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19T10:00:15.789"), new Date("2023-11-19T22:30:45.123"), new Date("2023-11-19T03:15:30.456")],
        "dates",
        null,
        null,
        { useUTC: false }
      );
      const result = series.dt.milliseconds();
      const expected = [789, 123, 456]; // Milliseconds extracted from the Date objects
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.milliseconds() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19T14:00:00.999", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.milliseconds();
      const expected = [null, 999, null]; // Empty strings should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.milliseconds() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates", null, null, { useUTC: false });
      const result = series.dt.milliseconds();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
