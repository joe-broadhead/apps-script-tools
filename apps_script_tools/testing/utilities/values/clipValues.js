VALUES_CLIP_VALUES_TESTS = [
  {
    description: 'clipValues() should clip a value below the lower bound',
    test: () => {
      const result = clipValues(-10, 0, 100);
      const expected = 0; // Clipped to the lower bound
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should clip a value above the upper bound',
    test: () => {
      const result = clipValues(200, 0, 100);
      const expected = 100; // Clipped to the upper bound
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should return the value if it is within bounds',
    test: () => {
      const result = clipValues(50, 0, 100);
      const expected = 50; // Value is within bounds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should handle null inputs gracefully',
    test: () => {
      const result = clipValues(null, 0, 100);
      const expected = 0; // Null input defaults to the lower bound
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should handle undefined inputs gracefully',
    test: () => {
      const result = clipValues(undefined, 0, 100);
      const expected = 0; // Undefined input defaults to the lower bound
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should handle NaN inputs gracefully',
    test: () => {
      const result = clipValues(NaN, 0, 100);
      const expected = 0; // NaN input defaults to the lower bound
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should handle a value with only a lower bound',
    test: () => {
      const result = clipValues(-10, 0);
      const expected = 0; // Clipped to the lower bound
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should handle a value with only an upper bound',
    test: () => {
      const result = clipValues(200, undefined, 100);
      const expected = 100; // Clipped to the upper bound
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should return the value when no bounds are provided',
    test: () => {
      const result = clipValues(50);
      const expected = 50; // No clipping as there are no bounds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should handle mixed data types gracefully',
    test: () => {
      const result = clipValues("50", 0, 100);
      const expected = 50; // String converted to number and within bounds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
  {
    description: 'clipValues() should handle invalid lower and upper bounds gracefully',
    test: () => {
      const result = clipValues(10, NaN, NaN);
      const expected = 10; // No clipping with invalid bounds
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    }
  },
];
