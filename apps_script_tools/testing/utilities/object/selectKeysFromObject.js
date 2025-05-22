OBJECT_SELECT_KEYS_FROM_OBJECT_TESTS = [
  {
    description: "selectKeysFromObject() should select specified keys from the object",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToSelect = ["a", "c"];
      const expected = { a: 1, c: 3 };
      const result = selectKeysFromObject(obj, keysToSelect);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "selectKeysFromObject() should return an empty object when no keys match",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToSelect = ["x", "y", "z"];
      const expected = {};
      const result = selectKeysFromObject(obj, keysToSelect);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "selectKeysFromObject() should return an empty object when keysToSelect is empty",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToSelect = [];
      const expected = {};
      const result = selectKeysFromObject(obj, keysToSelect);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "selectKeysFromObject() should handle an empty object",
    test: () => {
      const obj = {};
      const keysToSelect = ["a", "b"];
      const expected = {};
      const result = selectKeysFromObject(obj, keysToSelect);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "selectKeysFromObject() should handle keys not present in the object gracefully",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToSelect = ["a", "x"];
      const expected = { a: 1 };
      const result = selectKeysFromObject(obj, keysToSelect);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "selectKeysFromObject() should handle an object with mixed data types",
    test: () => {
      const obj = { a: 1, b: "text", c: true, d: null };
      const keysToSelect = ["b", "d"];
      const expected = { b: "text", d: null };
      const result = selectKeysFromObject(obj, keysToSelect);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "selectKeysFromObject() should handle a large object efficiently",
    test: () => {
      const largeObj = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`key${i}`, i]));
      const keysToSelect = ["key0", "key500", "key999"];
      const expected = { key0: 0, key500: 500, key999: 999 };
      const result = selectKeysFromObject(largeObj, keysToSelect);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error("Failed Test: Large object key selection");
      }
    },
  },
];
