SERIES_DT_NOW_TESTS = [
  {
    description: "dt.now() should set the current date for all elements in the Series",
    test: () => {
      const series = new Series([null, null, null], "dates");
      const result = series.dt.now().array;

      const now = new Date();
      const tolerance = 1000; // 1 second tolerance

      if (!result.every(date => Math.abs(date.getTime() - now.getTime()) < tolerance)) {
        throw new Error(`Dates in the Series do not match the current time within tolerance.`);
      }
    },
  },
  {
    description: "dt.now() should handle an empty Series",
    test: () => {
      const series = new Series([], "dates");
      const result = series.dt.now().array;

      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "dt.now() should overwrite existing values with the current date",
    test: () => {
      const series = new Series([new Date(0), new Date(86400000), new Date(172800000)], "dates");
      const result = series.dt.now().array;

      const now = new Date();
      const tolerance = 1000; // 1 second tolerance

      if (!result.every(date => Math.abs(date.getTime() - now.getTime()) < tolerance)) {
        throw new Error(`Dates in the Series do not match the current time within tolerance.`);
      }
    },
  },
];
