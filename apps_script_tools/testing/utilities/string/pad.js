STRING_PAD_TESTS = [
  {
    description: "pad() should pad a string to the left with spaces by default",
    test: () => {
      const result = pad("hello", "start", 10);
      const expected = "     hello";
      if (result !== expected) throw new Error(`Expected "${expected}", but got "${result}"`);
    },
  },
  {
    description: "pad() should pad a string to the right with spaces by default",
    test: () => {
      const result = pad("hello", "end", 10);
      const expected = "hello     ";
      if (result !== expected) throw new Error(`Expected "${expected}", but got "${result}"`);
    },
  },
  {
    description: "pad() should return the original string if targetLength is less than or equal to the string length",
    test: () => {
      const result = pad("hello", "start", 3);
      const expected = "hello";
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "pad() should handle an empty string input",
    test: () => {
      const result = pad("", "start", 5, ".");
      const expected = ".....";
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "pad() should handle a targetLength of 0",
    test: () => {
      const result = pad("hello", "start", 0);
      const expected = "hello";
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "pad() should throw an error for invalid direction",
    test: () => {
      try {
        pad("hello", "invalid", 10);
        throw new Error("Expected an error but none was thrown.");
      } catch (error) {
        if (!error.message.includes("Invalid direction")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "pad() should handle a padString longer than the required padding",
    test: () => {
      const result = pad("hello", "start", 7, "abc");
      const expected = "abhello";
      if (result !== expected) throw new Error(`Expected "${expected}", but got "${result}"`);
    },
  },
  {
    description: "pad() should handle a padString with special characters",
    test: () => {
      const result = pad("hello", "end", 10, "*#");
      const expected = "hello*#*#*";
      if (result !== expected) throw new Error(`Expected "${expected}", but got "${result}"`);
    },
  },
  {
    description: "pad() should handle a string with existing spaces",
    test: () => {
      const result = pad(" hello ", "start", 12, ".");
      const expected = "..... hello ";
      if (result !== expected) throw new Error(`Expected "${expected}", but got "${result}"`);
    },
  },
  {
    description: "pad() should handle an empty padString",
    test: () => {
      const result = pad("hello", "start", 10, "");
      const expected = "     hello";
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "pad() should truncate padString if it exceeds required length",
    test: () => {
      const result = pad("hello", "end", 8, "xyz");
      const expected = "helloxyz";
      if (result !== expected) throw new Error(`Expected "${expected}", but got "${result}"`);
    },
  },
  {
    description: "pad() should handle an all-uppercase string",
    test: () => {
      const result = pad("HELLO", "end", 8, ".");
      const expected = "HELLO...";
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "pad() should handle numbers as padString",
    test: () => {
      const result = pad("hello", "start", 10, "123");
      const expected = "12312hello";
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  }
];
