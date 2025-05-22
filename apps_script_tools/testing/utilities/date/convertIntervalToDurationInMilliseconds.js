DATE_CONVERT_INTERVAL_TO_DURATION_IN_MILLISECONDS_TESTS = [
  {
    description: "convertIntervalToDurationInMilliseconds() should correctly convert days to milliseconds",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(1, "days");
      const expected = 86400000; // 1 day in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should correctly convert hours to milliseconds",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(1, "hours");
      const expected = 3600000; // 1 hour in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should correctly convert minutes to milliseconds",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(1, "minutes");
      const expected = 60000; // 1 minute in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should correctly convert seconds to milliseconds",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(1, "seconds");
      const expected = 1000; // 1 second in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should correctly return milliseconds",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(500, "milliseconds");
      const expected = 500; // Already in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should handle large inputs for days",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(10, "days");
      const expected = 864000000; // 10 days in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should handle large inputs for hours",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(100, "hours");
      const expected = 360000000; // 100 hours in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should handle case-insensitive units",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(1, "DAYS");
      const expected = 86400000; // 1 day in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should throw an error for unsupported units",
    test: () => {
      try {
        convertIntervalToDurationInMilliseconds(1, "weeks");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unsupported unit")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "convertIntervalToDurationInMilliseconds() should handle zero interval",
    test: () => {
      const result = convertIntervalToDurationInMilliseconds(0, "days");
      const expected = 0; // Zero interval in milliseconds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
];
