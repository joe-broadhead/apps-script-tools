VALUES_COERCE_VALUES_TESTS = [
  {
    description: 'coerceValues() should coerce a valid number to an integer',
    test: () => {
      const result = coerceValues(10.5, 'integer');
      const expected = 10; // Floored integer
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should coerce a valid string to an integer',
    test: () => {
      const result = coerceValues('42', 'integer');
      const expected = 42; // Parsed integer
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should return null for invalid integer coercion',
    test: () => {
      const result = coerceValues('not-a-number', 'integer');
      const expected = null; // Invalid integer
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should coerce a valid string to a float',
    test: () => {
      const result = coerceValues('3.14', 'float');
      const expected = 3.14; // Parsed float
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should return null for invalid float coercion',
    test: () => {
      const result = coerceValues('NaN', 'float');
      const expected = null; // Invalid float
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should coerce a value to a boolean',
    test: () => {
      const result = coerceValues('true', 'boolean');
      const expected = true; // Coerced to boolean
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should coerce a falsy value to false',
    test: () => {
      const result = coerceValues('', 'boolean');
      const expected = false; // Empty string is falsy
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should coerce a value to a string',
    test: () => {
      const result = coerceValues(123, 'string');
      const expected = '123'; // Coerced to string
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'coerceValues() should return null for invalid type coercion',
    test: () => {
      try {
        coerceValues(123, 'unsupported-type');
      } catch (error) {
        if (!error.message.includes('Unsupported type: unsupported-type')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
        return; // Test passed
      }
      throw new Error('Expected an error, but none was thrown');
    }
  },
  {
    description: "coerceValues() should convert a valid ISO 8601 date string to a Date object",
    test: () => {
      const input = "2024-01-01T00:00:00Z";
      const result = coerceValues(input, "date");
      const expected = new Date("2024-01-01T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should convert a valid date string to a Date object",
    test: () => {
      const input = "2024-01-01";
      const result = coerceValues(input, "date");
      const expected = new Date("2024-01-01");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should return null for an invalid date string",
    test: () => {
      const input = "not-a-date";
      const result = coerceValues(input, "date");
      const expected = null;
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should convert a timestamp (number) to a Date object",
    test: () => {
      const input = 1704067200000; // Timestamp for "2024-01-01T00:00:00Z"
      const result = coerceValues(input, "date");
      const expected = new Date(1704067200000);
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should handle null and return null",
    test: () => {
      const input = null;
      const result = coerceValues(input, "date");
      const expected = null;
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should handle undefined and return null",
    test: () => {
      const input = undefined;
      const result = coerceValues(input, "date");
      const expected = null;
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should handle NaN and return null",
    test: () => {
      const input = NaN;
      const result = coerceValues(input, "date");
      const expected = null;
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should handle a Date object and return the same Date",
    test: () => {
      const input = new Date("2024-01-01T00:00:00Z");
      const result = coerceValues(input, "date");
      const expected = new Date("2024-01-01T00:00:00Z");
      if (result.getTime() !== expected.getTime()) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should handle an empty string and return null",
    test: () => {
      const input = "";
      const result = coerceValues(input, "date");
      const expected = null;
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: "coerceValues() should handle a string with only whitespace and return null",
    test: () => {
      const input = "   ";
      const result = coerceValues(input, "date");
      const expected = null;
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
];
