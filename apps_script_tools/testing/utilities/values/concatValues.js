VALUES_CONCAT_VALUES_TESTS = [
  {
    description: 'concatValues() should concatenate two strings with the default separator',
    test: () => {
      const result = concatValues("Hello", "World");
      const expected = "Hello World"; // Default separator is a space
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should concatenate two strings with a custom separator',
    test: () => {
      const result = concatValues("Hello", "World", ", ");
      const expected = "Hello, World"; // Custom separator is ", "
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should concatenate numbers as strings with the default separator',
    test: () => {
      const result = concatValues(42, 84);
      const expected = "42 84"; // Numbers are coerced to strings
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should concatenate mixed types with the default separator',
    test: () => {
      const result = concatValues("Number:", 42);
      const expected = "Number: 42"; // Mixed types are coerced to strings
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should return null if the first value is null',
    test: () => {
      const result = concatValues(null, "World");
      const expected = null; // Null value returns null
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should return null if the second value is null',
    test: () => {
      const result = concatValues("Hello", null);
      const expected = null; // Null value returns null
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should handle an empty string as the first value',
    test: () => {
      const result = concatValues("", "World");
      const expected = " World"; // Empty string concatenates with separator and second value
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should handle an empty string as the second value',
    test: () => {
      const result = concatValues("Hello", "");
      const expected = "Hello "; // First value concatenates with separator and empty string
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should handle undefined as the first value',
    test: () => {
      const result = concatValues(undefined, "World");
      const expected = null; // Undefined is treated as null
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should handle undefined as the second value',
    test: () => {
      const result = concatValues("Hello", undefined);
      const expected = null; // Undefined is treated as null
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should handle a custom separator with special characters',
    test: () => {
      const result = concatValues("Hello", "World", " - ");
      const expected = "Hello - World"; // Custom separator is " - "
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: 'concatValues() should handle a large concatenation efficiently',
    test: () => {
      const longStringA = "A".repeat(10000);
      const longStringB = "B".repeat(10000);
      const result = concatValues(longStringA, longStringB);
      const expected = `${longStringA} ${longStringB}`; // Default separator
      if (result !== expected) {
        throw new Error("Failed Test: Large Concatenation");
      }
    }
  }
];
