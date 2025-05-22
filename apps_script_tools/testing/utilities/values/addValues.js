VALUES_ADD_VALUES_TESTS = [
  {
    description: 'addValues() should return the sum of two valid numbers',
    test: () => {
      const result = addValues(10, 20);
      const expected = 30; // 10 + 20 = 30
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should handle null inputs gracefully',
    test: () => {
      const result = addValues(null, 10);
      const expected = null; // Null input should return null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should handle undefined inputs gracefully',
    test: () => {
      const result = addValues(undefined, 10);
      const expected = null; // Undefined input should return null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should handle NaN inputs gracefully',
    test: () => {
      const result = addValues(NaN, 10);
      const expected = null; // NaN input should return null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should handle string inputs that can be converted to numbers',
    test: () => {
      const result = addValues("10", "20");
      const expected = 30; // "10" + "20" = 30 after normalization
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should return null for string inputs that cannot be converted to numbers',
    test: () => {
      const result = addValues("abc", 10);
      const expected = null; // Invalid string should return null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should handle mixed type inputs',
    test: () => {
      const result = addValues(true, 5);
      const expected = 6; // true = 1, so 1 + 5 = 6
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should handle both inputs as boolean values',
    test: () => {
      const result = addValues(true, false);
      const expected = 1; // true = 1, false = 0, so 1 + 0 = 1
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should return null when both inputs are invalid',
    test: () => {
      const result = addValues(null, undefined);
      const expected = null; // Invalid inputs should return null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'addValues() should handle large numeric inputs',
    test: () => {
      const result = addValues(1e10, 1e10);
      const expected = 2e10; // Large numbers should add correctly
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  }
];
