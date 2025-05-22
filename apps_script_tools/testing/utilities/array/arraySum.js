ARRAY_SUM_TESTS = [
  {
    description: 'arraySum() should correctly sum an array of numbers',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arraySum(array);
    
      const expectedSum = 15; // 1 + 2 + 3 + 4 + 5
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      }
    }
  },
  {
    description: 'arraySum() should ignore non-numeric values in the array',
    test: () => {
      const array = [1, "2", "three", null, undefined, 4, NaN, true];
      const result = arraySum(array);
    
      const expectedSum = 8; // 1 + 2 (from "2") + 4 + 1 (true)
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      }
    }
  },
  {
    description: 'arraySum() should return 0 for an empty array',
    test: () => {
      const array = [];
      const result = arraySum(array);
    
      const expectedSum = 0; // No elements to sum
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      }
    }
  },
  {
    description: 'arraySum() should return 0 for an array with only non-numeric values',
    test: () => {
      const array = ["text", null, undefined, NaN, false];
      const result = arraySum(array);
    
      const expectedSum = 0; // No numeric values to sum
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      }
    }
  },
  {
    description: 'arraySum() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i + 1);
      const result = arraySum(largeArray);
    
      const expectedSum = (10000 * (10000 + 1)) / 2; // Sum of first 10,000 natural numbers
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      }
    }
  },
  {
    description: 'arraySum() should correctly sum an array of negative numbers',
    test: () => {
      const array = [-1, -2, -3, -4, -5];
      const result = arraySum(array);
    
      const expectedSum = -15; // -1 + -2 + -3 + -4 + -5
      if (result !== expectedSum) {
        throw new Error(`Expected ${expectedSum}, but got ${result}`);
      }
    }
  }
];
