SERIES_DT_TO_DATE_OBJECT_TESTS = [
  {
    description: "dt.toDateObject() should convert valid date strings to Date objects",
    test: () => {
      const series = new Series(["2023-11-19", "2020-05-15", "1999-12-31"], "dates");
      const result = series.dt.toDateObject();
      const expected = [
        new Date("2023-11-19"),
        new Date("2020-05-15"),
        new Date("1999-12-31"),
      ]; // Expected Date objects
      const resultArray = result.array.map(date => (date instanceof Date ? date.toISOString() : null));
      const expectedArray = expected.map(date => date.toISOString());
      if (JSON.stringify(resultArray) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(resultArray)}`);
      }
    },
  },
  {
    description: "dt.toDateObject() should return null for invalid date strings",
    test: () => {
      const series = new Series(["invalid-date", "2023-11-19", ""], "dates");
      const result = series.dt.toDateObject();
      const expected = [null, new Date("2023-11-19"), null]; // Invalid dates return null
      const resultArray = result.array.map(date => (date instanceof Date ? date.toISOString() : null));
      const expectedArray = expected.map(date => (date instanceof Date ? date.toISOString() : null));
      if (JSON.stringify(resultArray) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(resultArray)}`);
      }
    },
  },
  {
    description: "dt.toDateObject() should handle null and undefined values",
    test: () => {
      const series = new Series([null, undefined, "2023-11-19"], "dates");
      const result = series.dt.toDateObject();
      const expected = [null, null, new Date("2023-11-19")]; // Null and undefined return null
      const resultArray = result.array.map(date => (date instanceof Date ? date.toISOString() : null));
      const expectedArray = expected.map(date => (date instanceof Date ? date.toISOString() : null));
      if (JSON.stringify(resultArray) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(resultArray)}`);
      }
    },
  },
  {
    description: "dt.toDateObject() should handle a Series of numeric timestamps",
    test: () => {
      const series = new Series([1700415600000, 1589539200000, 946684800000], "timestamps");
      const result = series.dt.toDateObject();
      const expected = [
        new Date(1700415600000),
        new Date(1589539200000),
        new Date(946684800000),
      ]; // Timestamps converted to Date objects
      const resultArray = result.array.map(date => (date instanceof Date ? date.toISOString() : null));
      const expectedArray = expected.map(date => date.toISOString());
      if (JSON.stringify(resultArray) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(resultArray)}`);
      }
    },
  },
  {
    description: "dt.toDateObject() should handle a Series of Date objects",
    test: () => {
      const series = new Series(
        [new Date("2023-11-19"), new Date("2020-05-15"), new Date("1999-12-31")],
        "dates"
      );
      const result = series.dt.toDateObject();
      const expected = [
        new Date("2023-11-19"),
        new Date("2020-05-15"),
        new Date("1999-12-31"),
      ]; // Should return the same Date objects
      const resultArray = result.array.map(date => (date instanceof Date ? date.toISOString() : null));
      const expectedArray = expected.map(date => date.toISOString());
      if (JSON.stringify(resultArray) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(resultArray)}`);
      }
    },
  },
  {
    description: "dt.toDateObject() should return null for empty strings",
    test: () => {
      const series = new Series(["", "2023-11-19", ""], "dates");
      const result = series.dt.toDateObject();
      const expected = [null, new Date("2023-11-19"), null]; // Empty strings return null
      const resultArray = result.array.map(date => (date instanceof Date ? date.toISOString() : null));
      const expectedArray = expected.map(date => (date instanceof Date ? date.toISOString() : null));
      if (JSON.stringify(resultArray) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(resultArray)}`);
      }
    },
  },
  {
    description: "dt.toDateObject() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates");
      const result = series.dt.toDateObject();
      const expected = [];
      if (JSON.stringify(result.array) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result.array)}`);
      }
    },
  },
];
