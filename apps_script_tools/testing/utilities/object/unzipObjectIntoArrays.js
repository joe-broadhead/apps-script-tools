OBJECT_UNZIP_OBJECT_INTO_ARRAYS_TESTS = [
  {
    description: "unzipObjectIntoArrays() should correctly unzip an object with default headers",
    test: () => {
      const object = { a: 1, b: 2, c: 3 };
      const expected = [["a", "b", "c"], [1, 2, 3]];
      const result = unzipObjectIntoArrays(object);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "unzipObjectIntoArrays() should correctly unzip an object without headers",
    test: () => {
      const object = { a: 1, b: 2, c: 3 };
      const expected = [[1, 2, 3]];
      const result = unzipObjectIntoArrays(object, false);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "unzipObjectIntoArrays() should follow the provided header order",
    test: () => {
      const object = { a: 1, b: 2, c: 3 };
      const headerOrder = ["c", "a", "b"];
      const expected = [["c", "a", "b"], [3, 1, 2]];
      const result = unzipObjectIntoArrays(object, true, headerOrder);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "unzipObjectIntoArrays() should throw an error if a key in headerOrder doesn't exist",
    test: () => {
      const object = { a: 1, b: 2, c: 3 };
      const headerOrder = ["a", "x"];

      let errorThrown = false;
      try {
        unzipObjectIntoArrays(object, true, headerOrder);
      } catch (error) {
        errorThrown = true;
        if (!error.message.includes('Key "x" in headerOrder doesn\'t exist in the provided object.')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }

      if (!errorThrown) {
        throw new Error("Expected an error, but none was thrown");
      }
    },
  },
  {
    description: "unzipObjectIntoArrays() should handle an empty object",
    test: () => {
      const object = {};
      const expected = [[], []];
      const result = unzipObjectIntoArrays(object);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "unzipObjectIntoArrays() should handle an object with mixed data types",
    test: () => {
      const object = { a: 1, b: "text", c: true };
      const expected = [["a", "b", "c"], [1, "text", true]];
      const result = unzipObjectIntoArrays(object);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "unzipObjectIntoArrays() should handle large objects efficiently",
    test: () => {
      const largeObject = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`key${i}`, i]));
      const keys = Object.keys(largeObject);
      const values = Object.values(largeObject);
      const expected = [keys, values];
      const result = unzipObjectIntoArrays(largeObject);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error("Failed Test: Large object unzipping");
      }
    },
  },
];
