DATE_CONVERT_DATE_TO_UNIX_TIMESTAMP_TESTS = [
  {
    description: "convertDateToUnixTimestamp() should return the correct Unix timestamp for a valid Date object",
    test: () => {
      const date = new Date(Date.UTC(2023, 10, 19, 0, 0, 0)); // November 19, 2023, at midnight UTC
      const result = convertDateToUnixTimestamp(date);
      const expected = 1700352000000; // Unix timestamp for the provided date
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertDateToUnixTimestamp() should return 0 for the Unix epoch",
    test: () => {
      const date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0)); // Unix epoch in UTC
      const result = convertDateToUnixTimestamp(date);
      const expected = 0; // Unix timestamp for the epoch
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertDateToUnixTimestamp() should return a negative timestamp for dates before the Unix epoch",
    test: () => {
      const date = new Date(Date.UTC(1969, 11, 31, 23, 59, 59)); // One second before the epoch
      const result = convertDateToUnixTimestamp(date);
      const expected = -1000; // Unix timestamp for one second before the epoch
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertDateToUnixTimestamp() should handle leap years correctly",
    test: () => {
      const date = new Date(Date.UTC(2000, 1, 29, 0, 0, 0)); // February 29, 2000, UTC
      const result = convertDateToUnixTimestamp(date);
      const expected = 951782400000; // Unix timestamp for the leap year date
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertDateToUnixTimestamp() should handle dates with time offsets",
    test: () => {
      const date = new Date(Date.UTC(2023, 10, 19, 12, 30, 45)); // November 19, 2023, 12:30:45 UTC
      const result = convertDateToUnixTimestamp(date);
      const expected = 1700397045000; // Unix timestamp for the provided date and time
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "convertDateToUnixTimestamp() should accept cross-context Date-like values",
    test: () => {
      const base = new Date(Date.UTC(2023, 10, 19, 0, 0, 0));
      const dateLike = {
        getTime: () => base.getTime(),
        [Symbol.toStringTag]: "Date"
      };
      const result = convertDateToUnixTimestamp(dateLike);
      if (result !== base.getTime()) {
        throw new Error(`Expected ${base.getTime()}, but got ${result}`);
      }
    },
  },
  {
    description: "convertDateToUnixTimestamp() should throw an error for invalid Date objects",
    test: () => {
      const invalidDate = new Date("invalid-date");
      if (!isNaN(invalidDate.getTime())) {
        throw new Error(`Expected an invalid Date object, but got a valid one.`);
      }
      try {
        convertDateToUnixTimestamp(invalidDate);
        throw new Error("Expected an error, but none was thrown.");
      } catch (error) {
        if (!error.message.includes("Input must be a valid Date object")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: "convertDateToUnixTimestamp() should throw an error if input is not a Date object",
    test: () => {
      try {
        convertDateToUnixTimestamp("2023-11-19");
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Input must be a valid Date object")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
];
