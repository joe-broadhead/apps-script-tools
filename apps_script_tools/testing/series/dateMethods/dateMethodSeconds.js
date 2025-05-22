SERIES_DT_SECONDS_TESTS = [
  {
    description: "dt.seconds() should extract the seconds from a Series of valid date strings in UTC",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45", "2023-11-19T14:56:00", "2023-11-19T23:00:30"], "dates", null, null, { useUTC: true });
      const result = series.dt.seconds();
      const expected = [45, 0, 30]; // Seconds extracted in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should extract the seconds from a Series of valid date strings in local time (Europe/London)",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45", "2023-11-19T14:56:00", "2023-11-19T23:00:30"], "dates", null, null, { useUTC: false });
      const result = series.dt.seconds();
      const expected = [45, 0, 30]; // Seconds extracted remain unaffected by timezone
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19T14:00:45", ""], "dates");
      const result = series.dt.seconds();
      const expected = [null, 45, null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19T08:45:30"], "dates");
      const result = series.dt.seconds();
      const expected = [null, null, 30]; // Null and undefined values should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should handle a Series of numeric timestamps in UTC",
    test: () => {
      const series = new Series([1700415600450, 1700458800000, 1700502000300], "timestamps", null, null, { useUTC: true });
      const result = series.dt.seconds();
      const expected = [0, 0, 0]; // Seconds extracted in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should handle a Series of numeric timestamps in local time (Europe/London)",
    test: () => {
      const series = new Series([1700415600450, 1700458800000, 1700502000300], "timestamps", null, null, { useUTC: false });
      const result = series.dt.seconds();
      const expected = [0, 0, 0]; // Seconds extracted remain consistent as timestamps are absolute
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19T10:00:15"), new Date("2023-11-19T22:30:45"), new Date("2023-11-19T03:15:30")],
        "dates"
      );
      const result = series.dt.seconds();
      const expected = [15, 45, 30]; // Seconds extracted from the Date objects
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19T14:00:00", ""], "dates");
      const result = series.dt.seconds();
      const expected = [null, 0, null]; // Empty strings should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.seconds() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates");
      const result = series.dt.seconds();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
