OBJECT_ZIP_ARRAYS_INTO_OBJECT_TESTS = [
  {
    description: "zipArraysIntoObject() should correctly map keys to values for arrays of the same length",
    test: () => {
      const keys = ["a", "b", "c"];
      const values = [1, 2, 3];
      const expected = { a: 1, b: 2, c: 3 };
      const result = zipArraysIntoObject(keys, values);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "zipArraysIntoObject() should throw an error if the arrays have different lengths",
    test: () => {
      const keys = ["a", "b"];
      const values = [1, 2, 3];
      let errorThrown = false;

      try {
        zipArraysIntoObject(keys, values);
      } catch (error) {
        errorThrown = true;
        if (!error.message.includes("The two arrays must have the same length")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }

      if (!errorThrown) {
        throw new Error("Expected an error, but none was thrown");
      }
    },
  },
  {
    description: "zipArraysIntoObject() should return an empty object for two empty arrays",
    test: () => {
      const keys = [];
      const values = [];
      const expected = {};
      const result = zipArraysIntoObject(keys, values);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "zipArraysIntoObject() should handle keys as numbers and values as strings",
    test: () => {
      const keys = [1, 2, 3];
      const values = ["a", "b", "c"];
      const expected = { 1: "a", 2: "b", 3: "c" };
      const result = zipArraysIntoObject(keys, values);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "zipArraysIntoObject() should handle special characters in keys",
    test: () => {
      const keys = ["@", "#", "$"];
      const values = [10, 20, 30];
      const expected = { "@": 10, "#": 20, "$": 30 };
      const result = zipArraysIntoObject(keys, values);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "zipArraysIntoObject() should handle mixed data types in keys and values",
    test: () => {
      const keys = ["a", 1, true];
      const values = [null, "value", 42];
      const expected = { a: null, 1: "value", true: 42 };
      const result = zipArraysIntoObject(keys, values);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "zipArraysIntoObject() should handle large arrays",
    test: () => {
      const keys = Array.from({ length: 1000 }, (_, i) => `key${i}`);
      const values = Array.from({ length: 1000 }, (_, i) => i);
      const expected = keys.reduce((obj, key, index) => {
        obj[key] = values[index];
        return obj;
      }, {});
      const result = zipArraysIntoObject(keys, values);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error("Failed Test: Large arrays");
      }
    },
  },
];
