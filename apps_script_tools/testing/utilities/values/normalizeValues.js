VALUES_NORMALIZE_VALUES_TESTS = [
  {
    description: 'normalizeValues() should normalize boolean true to 1',
    test: () => {
      const result = normalizeValues(true);
      const expected = 1; // true → 1
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should normalize boolean false to 0',
    test: () => {
      const result = normalizeValues(false);
      const expected = 0; // false → 0
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return null for null',
    test: () => {
      const result = normalizeValues(null);
      const expected = null; // null → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return null for undefined',
    test: () => {
      const result = normalizeValues(undefined);
      const expected = null; // undefined → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return null for NaN',
    test: () => {
      const result = normalizeValues(NaN);
      const expected = null; // NaN → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should parse a valid numeric string',
    test: () => {
      const result = normalizeValues("123.45");
      const expected = 123.45; // "123.45" → 123.45
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return null for an invalid string',
    test: () => {
      const result = normalizeValues("not-a-number");
      const expected = null; // Invalid string → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return a number for numeric input',
    test: () => {
      const result = normalizeValues(123.45);
      const expected = 123.45; // 123.45 → 123.45
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should handle large numbers',
    test: () => {
      const result = normalizeValues(1e6);
      const expected = 1e6; // 1,000,000 → 1,000,000
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should handle small numbers',
    test: () => {
      const result = normalizeValues(0.0001);
      const expected = 0.0001; // 0.0001 → 0.0001
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return null for an object',
    test: () => {
      const result = normalizeValues({});
      const expected = null; // Object → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return null for an array',
    test: () => {
      const result = normalizeValues([1, 2, 3]);
      const expected = null; // Array → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should parse a numeric string with spaces',
    test: () => {
      const result = normalizeValues("  123  ");
      const expected = 123; // "  123  " → 123
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'normalizeValues() should return null for a string with mixed characters',
    test: () => {
      const result = normalizeValues("123abc");
      const expected = null; // "123abc" → null
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  }
];
