SERIES_DT_DAYOFMONTH_TESTS = [
  {
    description: "dt.dayOfMonth() should extract the day of the month from a Series of valid date strings (local time)",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates", null, null, { useUTC: false });
      const result = series.dt.dayOfMonth();
      const expected = [19, 15, 31]; // Days of the month
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfMonth() should extract the day of the month from a Series of valid date strings (UTC)",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates", null, null, { useUTC: true });
      const result = series.dt.dayOfMonth();
      const expected = [19, 15, 31]; // Days of the month in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfMonth() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.dayOfMonth();
      const expected = [null, 19, null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfMonth() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19"], "dates", null, null, { useUTC: true });
      const result = series.dt.dayOfMonth();
      const expected = [null, null, 19]; // Day of the month
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfMonth() should handle a Series of numeric timestamps (UTC)",
    test: () => {
      const series = new Series([1700415600000, 1589539200000, 946684800000], "timestamps", null, null, { useUTC: true });
      const result = series.dt.dayOfMonth();
      const expected = [19, 15, 1]; // Days of the month for UTC timestamps
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfMonth() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19"), new Date("2020-05-15"), new Date("1999-12-31")],
        "dates",
        null,
        null,
        { useUTC: false }
      );
      const result = series.dt.dayOfMonth();
      const expected = [19, 15, 31]; // Days of the month
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfMonth() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19", ""], "dates", null, null, { useUTC: false });
      const result = series.dt.dayOfMonth();
      const expected = [null, 19, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfMonth() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates", null, null, { useUTC: true });
      const result = series.dt.dayOfMonth();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
