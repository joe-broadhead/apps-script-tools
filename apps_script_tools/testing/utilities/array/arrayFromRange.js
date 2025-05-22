ARRAY_FROM_RANGE_TESTS = [
  {
    description: 'arrayFromRange() should generate a range of numbers with default parameters',
    test: () => {
      const result = arrayFromRange();

      const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayFromRange() should generate a range of numbers with a specified start and end',
    test: () => {
      const result = arrayFromRange(5, 15);

      const expected = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayFromRange() should generate a range of numbers with a negative step',
    test: () => {
      const result = arrayFromRange(10, 0, -2);

      const expected = [10, 8, 6, 4, 2, 0];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayFromRange() should throw an error if step is zero',
    test: () => {
      try {
        arrayFromRange(0, 10, 0);
        throw new Error("Expected an error for step = 0, but none was thrown");
      } catch (error) {
        if (error.message !== "Step cannot be zero") {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: 'arrayFromRange() should generate a single value if start equals end',
    test: () => {
      const result = arrayFromRange(5, 5);

      const expected = [5];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'arrayFromRange() should handle a large range efficiently',
    test: () => {
      const result = arrayFromRange(0, 10000, 1000);

      const expected = Array.from({ length: 11 }, (_, idx) => idx * 1000);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected).slice(0, 50)}..., but got ${JSON.stringify(result).slice(0, 50)}...`);
      }
    }
  },
  {
    description: 'arrayFromRange() should handle a range with a fractional step',
    test: () => {
      const result = arrayFromRange(0, 1, 0.2);

      const expected = [0, 0.2, 0.4, 0.6, 0.8, 1];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
