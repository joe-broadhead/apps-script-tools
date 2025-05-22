DATE_DATE_DIFF_TESTS = [
  {
    description: "dateDiff() should calculate the difference in days between two dates",
    test: () => {
      const dateA = new Date("2023-11-19T00:00:00Z");
      const dateB = new Date("2023-11-17T00:00:00Z");
      const result = dateDiff(dateA, dateB, "days");
      const expected = 2;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "dateDiff() should calculate the difference in hours between two dates",
    test: () => {
      const dateA = new Date("2023-11-19T12:00:00Z");
      const dateB = new Date("2023-11-19T00:00:00Z");
      const result = dateDiff(dateA, dateB, "hours");
      const expected = 12;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "dateDiff() should calculate the difference in minutes between two dates",
    test: () => {
      const dateA = new Date("2023-11-19T00:30:00Z");
      const dateB = new Date("2023-11-19T00:00:00Z");
      const result = dateDiff(dateA, dateB, "minutes");
      const expected = 30;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "dateDiff() should calculate the difference in seconds between two dates",
    test: () => {
      const dateA = new Date("2023-11-19T00:00:10Z");
      const dateB = new Date("2023-11-19T00:00:00Z");
      const result = dateDiff(dateA, dateB, "seconds");
      const expected = 10;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "dateDiff() should calculate the difference in milliseconds between two dates",
    test: () => {
      const dateA = new Date("2023-11-19T00:00:00.500Z");
      const dateB = new Date("2023-11-19T00:00:00.000Z");
      const result = dateDiff(dateA, dateB, "milliseconds");
      const expected = 500;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "dateDiff() should throw an error for unsupported units",
    test: () => {
      try {
        const dateA = new Date("2023-11-19T00:00:00Z");
        const dateB = new Date("2023-11-19T00:00:00Z");
        dateDiff(dateA, dateB, "weeks");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unsupported unit")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "dateDiff() should throw an error for invalid date inputs",
    test: () => {
      try {
        const dateA = "invalid-date";
        const dateB = new Date("2023-11-19T00:00:00Z");
        dateDiff(dateA, dateB, "days");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Both inputs must be valid Date objects")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "dateDiff() should handle identical dates and return 0",
    test: () => {
      const dateA = new Date("2023-11-19T00:00:00Z");
      const dateB = new Date("2023-11-19T00:00:00Z");
      const result = dateDiff(dateA, dateB, "days");
      const expected = 0;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "dateDiff() should handle earlier dates correctly",
    test: () => {
      const dateA = new Date("2023-11-17T00:00:00Z");
      const dateB = new Date("2023-11-19T00:00:00Z");
      const result = dateDiff(dateA, dateB, "days");
      const expected = -2;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
];
