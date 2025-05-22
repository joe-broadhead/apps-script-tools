SERIES_DT_MINUTES_TESTS = [
  {
    description: "dt.minutes() should extract the minutes from a Series of valid date strings in UTC",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45Z", "2023-11-19T14:56:00Z", "2023-11-19T23:00:00Z"], "dates", null, null, { useUTC: true });
      const result = series.dt.minutes();
      const expected = [23, 56, 0]; // Minutes in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should extract the minutes from a Series of valid date strings in local time (Europe/London)",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45", "2023-11-19T14:56:00", "2023-11-19T23:00:00"], "dates", null, null, { useUTC: false });
      const result = series.dt.minutes();
      const expected = [23, 56, 0]; // Minutes adjusted for Europe/London timezone
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19T14:00:45", ""], "dates");
      const result = series.dt.minutes();
      const expected = [null, 0, null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19T08:45:00"], "dates");
      const result = series.dt.minutes();
      const expected = [null, null, 45]; // Null and undefined values should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should handle a Series of numeric timestamps in UTC",
    test: () => {
      const series = new Series([0, 43200000, 86400000], "timestamps", null, null, { useUTC: true }); // Midnight, Noon, Midnight of the next day in UTC
      const result = series.dt.minutes();
      const expected = [0, 0, 0]; // All timestamps are at the start of the hour in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should handle a Series of numeric timestamps in local time (Europe/London)",
    test: () => {
      const series = new Series([0, 43200000, 86400000], "timestamps", null, null, { useUTC: false }); // Midnight, Noon, Midnight in UTC
      const result = series.dt.minutes();
      const expected = [0, 0, 0]; // Adjusted for Europe/London timezone
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19T10:00:15"), new Date("2023-11-19T22:30:45"), new Date("2023-11-19T03:15:30")],
        "dates"
      );
      const result = series.dt.minutes();
      const expected = [0, 30, 15]; // Minutes extracted from the Date objects
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19T14:00:00", ""], "dates");
      const result = series.dt.minutes();
      const expected = [null, 0, null]; // Empty strings should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.minutes() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates");
      const result = series.dt.minutes();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
