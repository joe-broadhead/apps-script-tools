DATE_CONVERT_MILLISECONDS_TO_INTERVAL_TESTS = [
  {
    description: "convertMillisecondsToInterval() should correctly convert milliseconds to days",
    test: () => {
      const result = convertMillisecondsToInterval(86400000, "days");
      const expected = 1; // 1 day in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should correctly convert milliseconds to hours",
    test: () => {
      const result = convertMillisecondsToInterval(3600000, "hours");
      const expected = 1; // 1 hour in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should correctly convert milliseconds to minutes",
    test: () => {
      const result = convertMillisecondsToInterval(60000, "minutes");
      const expected = 1; // 1 minute in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should correctly convert milliseconds to seconds",
    test: () => {
      const result = convertMillisecondsToInterval(1000, "seconds");
      const expected = 1; // 1 second in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should correctly return milliseconds",
    test: () => {
      const result = convertMillisecondsToInterval(500, "milliseconds");
      const expected = 500; // Already in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should throw an error for unsupported units",
    test: () => {
      try {
        convertMillisecondsToInterval(1000, "weeks");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unsupported unit")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should handle large inputs for days conversion",
    test: () => {
      const result = convertMillisecondsToInterval(864000000, "days");
      const expected = 10; // 10 days in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should handle large inputs for hours conversion",
    test: () => {
      const result = convertMillisecondsToInterval(360000000, "hours");
      const expected = 100; // 100 hours in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should handle case-insensitive units",
    test: () => {
      const result = convertMillisecondsToInterval(3600000, "HOURS");
      const expected = 1; // 1 hour in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertMillisecondsToInterval() should handle zero milliseconds input",
    test: () => {
      const result = convertMillisecondsToInterval(0, "seconds");
      const expected = 0; // Zero milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
];
