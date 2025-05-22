DATE_DATE_SUB_TESTS = [
  {
    description: "dateSub() should subtract days from a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateSub(date, -2, "days");
      const expected = new Date("2023-11-17T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateSub() should subtract hours from a given date",
    test: () => {
      const date = new Date("2023-11-19T12:00:00Z");
      const result = dateSub(date, -12, "hours");
      const expected = new Date("2023-11-19T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateSub() should subtract minutes from a given date",
    test: () => {
      const date = new Date("2023-11-19T00:30:00Z");
      const result = dateSub(date, -30, "minutes");
      const expected = new Date("2023-11-19T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateSub() should subtract seconds from a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:10Z");
      const result = dateSub(date, -10, "seconds");
      const expected = new Date("2023-11-19T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateSub() should subtract milliseconds from a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:00.500Z");
      const result = dateSub(date, -500, "milliseconds");
      const expected = new Date("2023-11-19T00:00:00.000Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateSub() should handle positive intervals and add time",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateSub(date, 2, "days");
      const expected = new Date("2023-11-21T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateSub() should throw an error for unsupported units",
    test: () => {
      try {
        const date = new Date("2023-11-19T00:00:00Z");
        dateSub(date, 2, "weeks");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unsupported unit")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "dateSub() should throw an error for invalid date inputs",
    test: () => {
      try {
        const date = "invalid-date";
        dateSub(date, 2, "days");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Both inputs must be valid Date objects")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "dateSub() should return the same date for an interval of 0",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateSub(date, 0, "days");
      const expected = new Date("2023-11-19T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
];
