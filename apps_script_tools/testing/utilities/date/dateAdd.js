DATE_DATE_ADD_TESTS = [
  {
    description: "dateAdd() should add days to a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateAdd(date, 2, "days");
      const expected = new Date("2023-11-21T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateAdd() should add hours to a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateAdd(date, 12, "hours");
      const expected = new Date("2023-11-19T12:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateAdd() should add minutes to a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateAdd(date, 30, "minutes");
      const expected = new Date("2023-11-19T00:30:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateAdd() should add seconds to a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateAdd(date, 45, "seconds");
      const expected = new Date("2023-11-19T00:00:45Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateAdd() should add milliseconds to a given date",
    test: () => {
      const date = new Date("2023-11-19T00:00:00.000Z");
      const result = dateAdd(date, 500, "milliseconds");
      const expected = new Date("2023-11-19T00:00:00.500Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateAdd() should handle negative intervals for subtraction",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateAdd(date, -2, "days");
      const expected = new Date("2023-11-17T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
  {
    description: "dateAdd() should throw an error for unsupported units",
    test: () => {
      try {
        const date = new Date("2023-11-19T00:00:00Z");
        dateAdd(date, 1, "weeks");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unsupported unit")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "dateAdd() should throw an error for invalid date inputs",
    test: () => {
      try {
        const date = "invalid-date";
        dateAdd(date, 1, "days");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Both inputs must be valid Date objects")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "dateAdd() should return the same date for an interval of 0",
    test: () => {
      const date = new Date("2023-11-19T00:00:00Z");
      const result = dateAdd(date, 0, "days");
      const expected = new Date("2023-11-19T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected ${expected.toISOString()}, but got ${result.toISOString()}`);
      }
    },
  },
];
