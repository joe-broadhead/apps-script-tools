VALUES_DIVIDE_VALUES_TESTS = [
  {
    description: 'divideValues() should divide two numbers correctly',
    test: () => {
      const result = divideValues(10, 2);
      const expected = 5; // 10 / 2 = 5
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should return Infinity for division by zero',
    test: () => {
      const result = divideValues(10, 0);
      const expected = Infinity; // Division by zero
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should return null if the first value is null',
    test: () => {
      const result = divideValues(null, 2);
      const expected = null; // Null input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should return null if the second value is null',
    test: () => {
      const result = divideValues(10, null);
      const expected = null; // Null input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should handle negative numbers',
    test: () => {
      const result = divideValues(-10, 2);
      const expected = -5; // -10 / 2 = -5
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should handle decimal numbers',
    test: () => {
      const result = divideValues(7.5, 2.5);
      const expected = 3; // 7.5 / 2.5 = 3
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should return null if the first value is undefined',
    test: () => {
      const result = divideValues(undefined, 2);
      const expected = null; // Undefined input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should return null if the second value is undefined',
    test: () => {
      const result = divideValues(10, undefined);
      const expected = null; // Undefined input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should handle mixed types',
    test: () => {
      const result = divideValues("20", 2);
      const expected = 10; // "20" coerced to 20, 20 / 2 = 10
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should return null if the first value is not numeric',
    test: () => {
      const result = divideValues("not-a-number", 2);
      const expected = null; // Invalid input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should return null if the second value is not numeric',
    test: () => {
      const result = divideValues(10, "not-a-number");
      const expected = null; // Invalid input
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should handle division resulting in decimals',
    test: () => {
      const result = divideValues(7, 3);
      const expected = 7 / 3; // Decimal result
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'divideValues() should handle large numbers',
    test: () => {
      const result = divideValues(1e12, 1e6);
      const expected = 1e6; // 1,000,000,000,000 / 1,000,000 = 1,000,000
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  }
];
