OBJECT_GET_VALUE_AT_PATH = [
  {
    description: "getValueAtPath() should return the value at a valid nested path",
    test: () => {
      const obj = { a: { b: { c: 42 } } };
      const path = ["a", "b", "c"];
      const expected = 42;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should return null for a non-existent path",
    test: () => {
      const obj = { a: { b: { c: 42 } } };
      const path = ["a", "x", "c"];
      const expected = null;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should return the value for a shallow path",
    test: () => {
      const obj = { a: 10, b: 20 };
      const path = ["b"];
      const expected = 20;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should return null for an empty path",
    test: () => {
      const obj = { a: { b: { c: 42 } } };
      const path = [];
      const expected = null;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should handle paths with non-object intermediate values",
    test: () => {
      const obj = { a: { b: 42 } };
      const path = ["a", "b", "c"];
      const expected = null;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should return null for an undefined object",
    test: () => {
      const obj = undefined;
      const path = ["a", "b"];
      const expected = null;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should handle objects with mixed data types",
    test: () => {
      const obj = { a: { b: [1, 2, { c: "value" }] } };
      const path = ["a", "b", 2, "c"];
      const expected = "value";
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should return null for a path that goes beyond the object structure",
    test: () => {
      const obj = { a: { b: { c: 42 } } };
      const path = ["a", "b", "c", "d"];
      const expected = null;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should return null for a null object",
    test: () => {
      const obj = null;
      const path = ["a", "b"];
      const expected = null;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: "getValueAtPath() should handle a numeric path accessing an array",
    test: () => {
      const obj = { a: [10, 20, 30] };
      const path = ["a", 1];
      const expected = 20;
      const result = getValueAtPath(obj, path);

      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
];
