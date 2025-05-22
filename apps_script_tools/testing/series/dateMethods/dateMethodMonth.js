SERIES_DT_MONTH_TESTS = [
  {
    description: "dt.month() should extract the month from a Series of valid date strings in UTC",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates", null, null, { useUTC: true });
      const result = series.dt.month();
      const expected = [11, 5, 12]; // November, May, December in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should extract the month from a Series of valid date strings in local time (Europe/London)",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates", null, null, { useUTC: false });
      const result = series.dt.month();
      const expected = [11, 5, 12]; // Same as UTC as the month doesn't change
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19", ""], "dates");
      const result = series.dt.month();
      const expected = [null, 11, null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19"], "dates");
      const result = series.dt.month();
      const expected = [null, null, 11]; // Null and undefined values should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should handle a Series of numeric timestamps in UTC",
    test: () => {
      const series = new Series([1700415600000, 1589539200000, 946684800000], "timestamps", null, null, { useUTC: true });
      const result = series.dt.month();
      const expected = [11, 5, 1]; // November, May, January in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should handle a Series of numeric timestamps in local time (Europe/London)",
    test: () => {
      const series = new Series([1700415600000, 1589539200000, 946684800000], "timestamps", null, null, { useUTC: false });
      const result = series.dt.month();
      const expected = [11, 5, 1]; // Adjusted for Europe/London timezone
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19"), new Date("2020-05-15"), new Date("1999-12-31")],
        "dates"
      );
      const result = series.dt.month();
      const expected = [11, 5, 12]; // November, May, December
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19", ""], "dates");
      const result = series.dt.month();
      const expected = [null, 11, null]; // Empty strings should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.month() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates");
      const result = series.dt.month();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
