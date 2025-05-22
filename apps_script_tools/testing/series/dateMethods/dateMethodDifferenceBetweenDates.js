SERIES_DT_DIFF_BETWEEN_DATES_TESTS = [
  {
    description: "dt.diffBetweenDates() should calculate the difference in days between two Series of dates",
    test: () => {
      const series1 = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates1");
      const series2 = new Series(["2023-11-18", "2020-05-10", "1999-12-30"], "dates2");
      const result = series1.dt.diffBetweenDates(series2, "days");

      const expected = [1, 5, 1]; // Differences in days
      if (JSON.stringify(result.array.map(Math.floor)) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.diffBetweenDates() should calculate the difference in hours between a Series and a single date",
    test: () => {
      const series = new Series(["2023-11-19T00:00:00", "2000-01-01T00:00:00", "1990-01-01T00:00:00"], "dates");
      const result = series.dt.diffBetweenDates("2023-11-19T12:00:00", "hours");
      const expected = [-12, -209364, -297012]
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.diffBetweenDates() should calculate the difference in minutes between two Series of dates",
    test: () => {
      const series1 = new Series(["2023-11-19T12:30:00", "2020-05-15T15:45:00", "1999-12-31T23:59:59"], "dates1");
      const series2 = new Series(["2023-11-19T12:00:00", "2020-05-15T15:30:00", "1999-12-31T23:00:00"], "dates2");
      const result = series1.dt.diffBetweenDates(series2, "minutes");

      const expected = [30, 15, 59]; // Differences in minutes
      if (JSON.stringify(result.array.map(Math.floor)) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.diffBetweenDates() should calculate the difference in milliseconds between numeric timestamps",
    test: () => {
      const series = new Series([2252880450000, 123000, 1000], "timestamps");
      const result = series.dt.diffBetweenDates(0, "milliseconds");
      const expected = [2252880450000, 123000, 1000]; // Adjusted timestamps
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.diffBetweenDates() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19", ""], "dates");
      const result = series.dt.diffBetweenDates("2023-11-20");
      const expected = [null, -1, null];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.diffBetweenDates() should handle null and undefined values",
    test: () => {
      const series1 = new Series(["2023-11-19", null, "1999-12-31"], "dates1");
      const series2 = new Series([null, "2020-05-15", undefined], "dates2");
      const result = series1.dt.diffBetweenDates(series2, "days");

      const expected = [null, null, null]; // Null or undefined results in null
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.diffBetweenDates() should handle an empty Series",
    test: () => {
      const series1 = new Series([], "dates1");
      const series2 = new Series([], "dates2");
      const result = series1.dt.diffBetweenDates(series2, "days");

      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
  {
    description: "dt.diffBetweenDates() should throw an error for unsupported units",
    test: () => {
      const series1 = new Series(["2023-11-19"], "dates1");
      const series2 = new Series(["2023-11-18"], "dates2");
      try {
        series1.dt.diffBetweenDates(series2, "unsupported-unit");
        throw new Error("Expected an error but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unsupported unit")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
];
