SERIES_DT_YEAR_TESTS = [
  {
    description: "dt.year() should extract the year from a Series of valid date strings in UTC",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates", null, null, { useUTC: true });
      const result = series.dt.year();
      const expected = [2023, 2020, 1999];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should extract the year from a Series of valid date strings in local time (Europe/London)",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates", null, null, { useUTC: false });
      const result = series.dt.year();
      const expected = [2023, 2020, 1999];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19", ""], "dates");
      const result = series.dt.year();
      const expected = [null, 2023, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19"], "dates");
      const result = series.dt.year();
      const expected = [null, null, 2023];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should handle a Series of numeric timestamps in UTC",
    test: () => {
      const series = new Series([1700415600000, 1589539200000, 946684800000], "timestamps", null, null, { useUTC: true });
      const result = series.dt.year();
      const expected = [2023, 2020, 2000];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should handle a Series of numeric timestamps in local time (Europe/London)",
    test: () => {
      const series = new Series([1700415600000, 1589539200000, 946684800000], "timestamps", null, null, { useUTC: false });
      const result = series.dt.year();
      const expected = [2023, 2020, 2000];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19"), new Date("2020-05-15"), new Date("1999-12-31")],
        "dates"
      );
      const result = series.dt.year();
      const expected = [2023, 2020, 1999];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19", ""], "dates");
      const result = series.dt.year();
      const expected = [null, 2023, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.year() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates");
      const result = series.dt.year();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
