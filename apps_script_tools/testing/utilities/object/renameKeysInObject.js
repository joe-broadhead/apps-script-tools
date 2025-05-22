OBJECT_RENAME_KEYS_IN_OBJECT_TESTS = [
  {
    description: 'renameKeysInObject() should rename keys based on keyMap',
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keyMap = { a: 'x', b: 'y' };
      const result = renameKeysInObject(obj, keyMap);
      const expected = { x: 1, y: 2, c: 3 };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInObject() should not modify keys not in keyMap',
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keyMap = { a: 'x' };
      const result = renameKeysInObject(obj, keyMap);
      const expected = { x: 1, b: 2, c: 3 };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInObject() should handle an empty object',
    test: () => {
      const obj = {};
      const keyMap = { a: 'x', b: 'y' };
      const result = renameKeysInObject(obj, keyMap);
      const expected = {};

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInObject() should handle an empty keyMap',
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keyMap = {};
      const result = renameKeysInObject(obj, keyMap);
      const expected = { a: 1, b: 2, c: 3 };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInObject() should handle key collisions in keyMap',
    test: () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keyMap = { a: 'x', b: 'x' }; // Both 'a' and 'b' map to 'x'
      const result = renameKeysInObject(obj, keyMap);
      const expected = { x: 2, c: 3 }; // Last mapping wins

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInObject() should handle non-string keys in the object',
    test: () => {
      const obj = { 1: 'one', true: 'truthy', null: 'nullish' };
      const keyMap = { 1: 'oneKey', true: 'boolKey' };
      const result = renameKeysInObject(obj, keyMap);
      const expected = { oneKey: 'one', boolKey: 'truthy', null: 'nullish' };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'renameKeysInObject() should handle objects with nested keys',
    test: () => {
      const obj = { a: { b: 2 }, c: 3 };
      const keyMap = { a: 'x', c: 'y' };
      const result = renameKeysInObject(obj, keyMap);
      const expected = { x: { b: 2 }, y: 3 }; // Only top-level keys are renamed

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
