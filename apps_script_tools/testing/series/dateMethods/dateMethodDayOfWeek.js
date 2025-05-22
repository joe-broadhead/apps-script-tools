SERIES_DT_DAYOFWEEK_TESTS = [
  {
    description: "dt.dayOfWeek() should extract the day of the week from a Series of valid date strings (local time)",
    test: () => {
      const series = new Series(["2023-11-19", "2023-11-20", "2023-11-21"], "dates", null, null, { useUTC: false }); // Sunday, Monday, Tuesday
      const result = series.dt.dayOfWeek();
      const expected = [0, 1, 2]; // Days of the week (0 = Sunday, 1 = Monday, etc.)
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should extract the day of the week from a Series of valid date strings (UTC)",
    test: () => {
      const series = new Series(["2023-11-19", "2023-11-20", "2023-11-21"], "dates", null, null, { useUTC: true }); // Sunday, Monday, Tuesday
      const result = series.dt.dayOfWeek();
      const expected = [0, 1, 2]; // Days of the week (UTC)
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.dayOfWeek();
      const expected = [null, 0, null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19"], "dates", null, null, { useUTC: true });
      const result = series.dt.dayOfWeek();
      const expected = [null, null, 0]; // Sunday
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should handle a Series of numeric timestamps (UTC)",
    test: () => {
      const series = new Series([1700415600000, 1700502000000, 1700588400000], "timestamps", null, null, { useUTC: true });
      const result = series.dt.dayOfWeek();
      const expected = [0, 1, 2]; // Sunday, Monday, Tuesday (UTC)
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should handle a Series of numeric timestamps (local time)",
    test: () => {
      const series = new Series([1700415600000, 1700502000000, 1700588400000], "timestamps", null, null, { useUTC: false });
      const result = series.dt.dayOfWeek();
      const expected = [0, 1, 2]; // Sunday, Monday, Tuesday (local time)
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19"), new Date("2023-11-20"), new Date("2023-11-21")],
        "dates",
        null,
        null,
        { useUTC: false }
      );
      const result = series.dt.dayOfWeek();
      const expected = [0, 1, 2]; // Sunday, Monday, Tuesday
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19", ""], "dates", null, null, { useUTC: false });
      const result = series.dt.dayOfWeek();
      const expected = [null, 0, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.dayOfWeek() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates", null, null, { useUTC: true });
      const result = series.dt.dayOfWeek();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
