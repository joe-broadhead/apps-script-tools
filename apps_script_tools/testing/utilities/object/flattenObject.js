OBJECT_FLATTEN_OBJECT_TESTS = [
  {
    description: "flattenObject() should flatten a simple object with primitive values",
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const expected = [1, 2, 3];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should flatten an object with nested objects",
    test: () => {
      const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
      const expected = [1, 2, 3];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should flatten an object with arrays",
    test: () => {
      const obj = { a: [1, 2], b: [3, 4], c: 5 };
      const expected = [1, 2, 3, 4, 5];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should flatten an object with mixed nested objects and arrays",
    test: () => {
      const obj = { a: [1, 2], b: { c: [3, 4], d: 5 } };
      const expected = [1, 2, 3, 4, 5];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should handle an empty object",
    test: () => {
      const obj = {};
      const expected = [];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should handle an object with null values",
    test: () => {
      const obj = { a: null, b: 2, c: { d: null, e: 4 } };
      const expected = [null, 2, null, 4];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should handle an object with undefined values",
    test: () => {
      const obj = { a: undefined, b: 2, c: { d: undefined, e: 4 } };
      const expected = [undefined, 2, undefined, 4];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should handle an object with deeply nested structures",
    test: () => {
      const obj = { a: { b: { c: { d: 1 } } } };
      const expected = [1];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should handle an object with empty nested arrays and objects",
    test: () => {
      const obj = { a: [], b: {}, c: { d: [] } };
      const expected = [];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: "flattenObject() should handle an object with various data types",
    test: () => {
      const obj = { a: [1, "text"], b: true, c: { d: null, e: [false, 5] } };
      const expected = [1, "text", true, null, false, 5];
      const result = flattenObject(obj);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
