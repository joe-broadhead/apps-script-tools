OBJECT_REMOVE_KEYS_FROM_OBJECT_TESTS = [
  {
    description: "removeKeysFromObject() should remove specified keys from the object",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToRemove = ["a", "c"];
      const expected = { b: 2 };
      const result = removeKeysFromObject(obj, keysToRemove);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "removeKeysFromObject() should return the original object if no keys match",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToRemove = ["x", "y", "z"];
      const expected = obj;
      const result = removeKeysFromObject(obj, keysToRemove);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "removeKeysFromObject() should return the original object if keysToRemove is empty",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToRemove = [];
      const expected = obj;
      const result = removeKeysFromObject(obj, keysToRemove);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "removeKeysFromObject() should handle an empty object",
    test: () => {
      const obj = {};
      const keysToRemove = ["a", "b"];
      const expected = {};
      const result = removeKeysFromObject(obj, keysToRemove);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "removeKeysFromObject() should handle removing all keys",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keysToRemove = ["a", "b", "c"];
      const expected = {};
      const result = removeKeysFromObject(obj, keysToRemove);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "removeKeysFromObject() should handle an object with mixed data types",
    test: () => {
      const obj = { a: 1, b: "text", c: true, d: null };
      const keysToRemove = ["b", "d"];
      const expected = { a: 1, c: true };
      const result = removeKeysFromObject(obj, keysToRemove);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "removeKeysFromObject() should handle a large object efficiently",
    test: () => {
      const largeObj = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`key${i}`, i]));
      const keysToRemove = ["key0", "key500", "key999"];
      const expected = Object.fromEntries(
        Array.from({ length: 1000 }, (_, i) => [`key${i}`, i]).filter(([key]) => !keysToRemove.includes(key))
      );
      const result = removeKeysFromObject(largeObj, keysToRemove);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error("Failed Test: Large object key removal");
      }
    },
  },
];
