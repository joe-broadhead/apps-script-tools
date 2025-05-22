SERIES_DT_TO_LOCALE_TIME_STRING_UTC_TESTS = [
  {
    description: "dt.toLocaleTimeString() should handle a Series of valid date strings in UTC",
    test: () => {
      const series = new Series(["2023-11-19T01:23:45Z", "2023-11-19T14:56:00Z", "2023-11-19T23:00:00Z"], "dates", null, null, { useUTC: true });
      const result = series.dt.toLocaleTimeString();
      const expected = ["01:23:45", "14:56:00", "23:00:00"]; // Times in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toLocaleTimeString() should handle a Series of numeric timestamps in UTC",
    test: () => {
      const series = new Series([0, 43200000, 86400000], "timestamps", null, null, { useUTC: true });
      const result = series.dt.toLocaleTimeString("en-GB");
      const expected = ["00:00:00", "12:00:00", "00:00:00"]; // Adjusted for UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    }
  },  
  {
    description: "dt.toLocaleTimeString() should return null for invalid date strings in UTC",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19T14:00:45Z", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.toLocaleTimeString();
      const expected = [null, "14:00:45", null]; // Invalid dates should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toLocaleTimeString() should handle null and undefined values in UTC",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19T08:45:00Z"], "dates", null, null, { useUTC: true });
      const result = series.dt.toLocaleTimeString();
      const expected = [null, null, "08:45:00"]; // Null and undefined values should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toLocaleTimeString() should handle a Series of Date objects in UTC",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19T10:00:15Z"), new Date("2023-11-19T22:30:45Z"), new Date("2023-11-19T03:15:30Z")],
        "dates",
        null,
        null,
        { useUTC: true }
      );
      const result = series.dt.toLocaleTimeString();
      const expected = ["10:00:15", "22:30:45", "03:15:30"]; // Times in UTC
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toLocaleTimeString() should return null for empty strings in UTC",
    test: () => {
      const series = new Series(["", "2023-11-19T14:00:00Z", ""], "dates", null, null, { useUTC: true });
      const result = series.dt.toLocaleTimeString();
      const expected = [null, "14:00:00", null]; // Empty strings should return null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toLocaleTimeString() should handle an empty Series in UTC",
    test: () => {
      const series = new Series([], "dates", null, null, { useUTC: true });
      const result = series.dt.toLocaleTimeString();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
