VALUES_SUBTRACT_VALUES_TESTS = [
  {
    description: 'subtractValues() should subtract two positive numbers',
    test: () => {
      const result = subtractValues(10, 5);
      const expected = 5; // 10 - 5 = 5
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should subtract two negative numbers',
    test: () => {
      const result = subtractValues(-10, -5);
      const expected = -5; // -10 - (-5) = -5
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should handle mixed positive and negative numbers',
    test: () => {
      const result = subtractValues(10, -5);
      const expected = 15; // 10 - (-5) = 15
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should return null if numA is null',
    test: () => {
      const result = subtractValues(null, 5);
      const expected = null; // null → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should return null if numB is null',
    test: () => {
      const result = subtractValues(10, null);
      const expected = null; // null → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should return null if either input is NaN',
    test: () => {
      const result = subtractValues(NaN, 5);
      const expected = null; // NaN → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should handle string inputs representing numbers',
    test: () => {
      const result = subtractValues("10", "5");
      const expected = 5; // "10" - "5" = 5
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should return null for invalid string inputs',
    test: () => {
      const result = subtractValues("10", "invalid");
      const expected = null; // "invalid" → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should handle subtracting from zero',
    test: () => {
      const result = subtractValues(0, 10);
      const expected = -10; // 0 - 10 = -10
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should handle subtracting zero',
    test: () => {
      const result = subtractValues(10, 0);
      const expected = 10; // 10 - 0 = 10
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should handle large numbers',
    test: () => {
      const result = subtractValues(1e6, 1e5);
      const expected = 900000; // 1,000,000 - 100,000 = 900,000
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should handle small numbers',
    test: () => {
      const result = subtractValues(0.001, 0.0001);
      const expected = 0.0009; // 0.001 - 0.0001 = 0.0009
      if (Math.abs(result - expected) > 1e-10) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'subtractValues() should handle inputs normalized to null',
    test: () => {
      const result = subtractValues(undefined, "abc");
      const expected = null; // Both inputs normalize to null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  }
];
