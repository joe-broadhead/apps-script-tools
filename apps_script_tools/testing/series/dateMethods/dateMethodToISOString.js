SERIES_DT_TO_ISO_STRING_TESTS = [
  {
    description: "dt.toISOString() should convert valid date strings to ISO 8601 format",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates");
      const result = series.dt.toISOString();
      const expected = [
        "2023-11-19T00:00:00.000Z",
        "2020-05-15T00:00:00.000Z",
        "1999-12-31T00:00:00.000Z"
      ];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toISOString() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19", ""], "dates");
      const result = series.dt.toISOString();
      const expected = [null, "2023-11-19T00:00:00.000Z", null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toISOString() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19"], "dates");
      const result = series.dt.toISOString();
      const expected = [null, null, "2023-11-19T00:00:00.000Z"];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toISOString() should handle numeric timestamps",
    test: () => {
      const series = new Series([1700415600000, 1589539200000, 946684800000], "timestamps");
      const result = series.dt.toISOString();
      const expected = [
        "2023-11-19T17:40:00.000Z",
        "2020-05-15T10:40:00.000Z",
        "2000-01-01T00:00:00.000Z"
      ];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    }
  },    
  {
    description: "dt.toISOString() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19"), new Date("2020-05-15"), new Date("1999-12-31")],
        "dates"
      );
      const result = series.dt.toISOString();
      const expected = [
        "2023-11-19T00:00:00.000Z",
        "2020-05-15T00:00:00.000Z",
        "1999-12-31T00:00:00.000Z"
      ];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toISOString() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19", ""], "dates");
      const result = series.dt.toISOString();
      const expected = [null, "2023-11-19T00:00:00.000Z", null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.toISOString() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates");
      const result = series.dt.toISOString();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
