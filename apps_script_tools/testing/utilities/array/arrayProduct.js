ARRAY_PRODUCT_TESTS = [
  {
    description: 'arrayProduct() should calculate the product of an array of numbers',
    test: () => {
      const array = [1, 2, 3, 4, 5];
      const result = arrayProduct(array);

      const expectedProduct = 120; // 1 * 2 * 3 * 4 * 5
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayProduct() should ignore non-numeric values in the array',
    test: () => {
      const array = [1, "2", "text", null, undefined, 4, NaN, true];
      const result = arrayProduct(array);

      const expectedProduct = 8; // 1 * 2 (from "2") * 4
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayProduct() should return 1 for an empty array',
    test: () => {
      const array = [];
      const result = arrayProduct(array);

      const expectedProduct = 1; // No elements to multiply, returns neutral element
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayProduct() should return 0 if any numeric value in the array is 0',
    test: () => {
      const array = [1, 2, 0, 4, 5];
      const result = arrayProduct(array);

      const expectedProduct = 0; // Multiplication by 0 results in 0
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayProduct() should calculate the product of an array with negative numbers',
    test: () => {
      const array = [-1, 2, -3, 4];
      const result = arrayProduct(array);

      const expectedProduct = 24; // -1 * 2 * -3 * 4
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayProduct() should handle a large array efficiently',
    test: () => {
      const largeArray = Array.from({ length: 20 }, (_, i) => i + 1); // Numbers from 1 to 20
      const result = arrayProduct(largeArray);

      const expectedProduct = 2432902008176640000; // 20!
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    }
  },
  {
    description: 'arrayProduct() should calculate the product of an array with mixed positive and negative numbers',
    test: () => {
      const array = [-1, 2, 3, -4];
      const result = arrayProduct(array);

      const expectedProduct = 24; // -1 * 2 * 3 * -4
      if (result !== expectedProduct) {
        throw new Error(`Expected ${expectedProduct}, but got ${result}`);
      }
    }
  }
];
