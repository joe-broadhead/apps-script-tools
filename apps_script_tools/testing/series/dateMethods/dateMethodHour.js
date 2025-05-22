SERIES_DT_HOUR_TESTS = [
  {
    description: "dt.hour() should extract the hour from a Series of valid date strings (local time)",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45", "2023-11-19T14:56:00", "2023-11-19T23:00:00"], "dates", null, null, { useUTC: false });
      const result = series.dt.hour();
      const expected = [1, 14, 23]; // Local hours extracted from the given timestamps
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.hour() should extract the hour from a Series of valid date strings (UTC)",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45Z", "2023-11-19T14:56:00Z", "2023-11-19T23:00:00Z"], "dates", null, null, { useUTC: true });
      const result = series.dt.hour();
      const expected = [1, 14, 23]; // UTC hours extracted from the given timestamps
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.hour() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19T14:00:00", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.hour();
      const expected = [null, 14, null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.hour() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19T08:45:00"], "dates", null, null, { useUTC: false });
      const result = series.dt.hour();
      const expected = [null, null, 8]; // Null and undefined values should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.hour() should handle a Series of numeric timestamps (UTC)",
    test: () => {
      const series = new Series([0, 43200000, 86400000], "timestamps", null, null, { useUTC: true }); // Midnight, Noon, Midnight of the next day in UTC
      const result = series.dt.hour().array;
      const expected = [0, 12, 0]; // 0:00, 12:00, 0:00 hours in UTC
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "dt.hour() should handle a Series of numeric timestamps (local time)",
    test: () => {
      const series = new Series([0, 43200000, 86400000], "timestamps", null, null, { useUTC: false });
      const result = series.dt.hour().array;
      const expected = [new Date(0).getHours(), new Date(43200000).getHours(), new Date(86400000).getHours()]; // Adjusted to local time
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "dt.hour() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19T10:00:00"), new Date("2023-11-19T22:30:00"), new Date("2023-11-19T03:15:00")],
        "dates",
        null,
        null,
        { useUTC: false }
      );
      const result = series.dt.hour();
      const expected = [10, 22, 3]; // Local hours extracted from the Date objects
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.hour() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19T14:00:00", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.hour();
      const expected = [null, 14, null]; // Empty strings should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.hour() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates", null, null, { useUTC: false });
      const result = series.dt.hour();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
