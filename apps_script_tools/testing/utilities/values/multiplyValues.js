VALUES_MULTIPLY_VALUES_TESTS = [
  {
    description: 'multiplyValues() should multiply two positive numbers correctly',
    test: () => {
      const result = multiplyValues(10, 2);
      const expected = 20; // 10 * 2 = 20
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should multiply a positive and a negative number',
    test: () => {
      const result = multiplyValues(10, -2);
      const expected = -20; // 10 * -2 = -20
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should multiply two negative numbers',
    test: () => {
      const result = multiplyValues(-10, -2);
      const expected = 20; // -10 * -2 = 20
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should multiply a number by zero',
    test: () => {
      const result = multiplyValues(10, 0);
      const expected = 0; // 10 * 0 = 0
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should return null if the first value is null',
    test: () => {
      const result = multiplyValues(null, 2);
      const expected = null; // Null input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should return null if the second value is null',
    test: () => {
      const result = multiplyValues(10, null);
      const expected = null; // Null input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should multiply decimal numbers',
    test: () => {
      const result = multiplyValues(1.5, 2.5);
      const expected = 3.75; // 1.5 * 2.5 = 3.75
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should handle mixed types',
    test: () => {
      const result = multiplyValues("10", 2);
      const expected = 20; // "10" coerced to 10, 10 * 2 = 20
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should return null if the first value is not numeric',
    test: () => {
      const result = multiplyValues("not-a-number", 2);
      const expected = null; // Invalid input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should return null if the second value is not numeric',
    test: () => {
      const result = multiplyValues(10, "not-a-number");
      const expected = null; // Invalid input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should handle large numbers',
    test: () => {
      const result = multiplyValues(1e6, 1e6);
      const expected = 1e12; // 1,000,000 * 1,000,000 = 1,000,000,000,000
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should handle small numbers',
    test: () => {
      const result = multiplyValues(0.0001, 0.0002);
      const expected = 0.00000002; // 0.0001 * 0.0002 = 0.00000002
      if (Math.abs(result - expected) > 1e-10) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should handle a number multiplied by 1',
    test: () => {
      const result = multiplyValues(10, 1);
      const expected = 10; // 10 * 1 = 10
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should return null if the first value is undefined',
    test: () => {
      const result = multiplyValues(undefined, 2);
      const expected = null; // Undefined input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'multiplyValues() should return null if the second value is undefined',
    test: () => {
      const result = multiplyValues(10, undefined);
      const expected = null; // Undefined input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  }
];
