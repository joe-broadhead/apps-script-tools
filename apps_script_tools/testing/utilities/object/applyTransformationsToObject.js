OBJECT_APPLY_TRANSFORMATIONS_TO_OBJECT_TESTS = [
  {
    description: 'applyTransformationsToObject() should apply simple transformations correctly',
    test: () => {
      const object = { name: 'Alice', age: 25 };
      const schema = {
        name: obj => obj.name.toUpperCase(),
        age: obj => obj.age + 1,
      };
      const result = applyTransformationsToObject(object, schema);
      const expected = { name: 'ALICE', age: 26 };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'applyTransformationsToObject() should assign static values from schema',
    test: () => {
      const object = { name: 'Alice', age: 25 };
      const schema = {
        city: 'Wonderland',
        age: 30, // Overwrite age with a static value
      };
      const result = applyTransformationsToObject(object, schema);
      const expected = { name: 'Alice', age: 30, city: 'Wonderland' };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'applyTransformationsToObject() should handle schema with non-function and non-static values',
    test: () => {
      const object = { name: 'Alice', age: 25 };
      const schema = {
        invalidKey: null, // Invalid transformation
      };
      const result = applyTransformationsToObject(object, schema);
      const expected = { name: 'Alice', age: 25, invalidKey: null };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'applyTransformationsToObject() should skip transformations that throw errors and retain original values',
    test: () => {
      const object = { name: 'Alice', age: 25 };
      const schema = {
        name: obj => obj.name.toUpperCase(),
        age: obj => { throw new Error('Test error'); },
      };
      const result = applyTransformationsToObject(object, schema);
      const expected = { name: 'ALICE', age: 25 };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'applyTransformationsToObject() should handle an empty object and schema',
    test: () => {
      const object = {};
      const schema = {};
      const result = applyTransformationsToObject(object, schema);
      const expected = {};

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'applyTransformationsToObject() should handle transformations on an empty object with schema keys',
    test: () => {
      const object = {};
      const schema = {
        key1: 'value1',
        key2: () => 'value2',
      };
      const result = applyTransformationsToObject(object, schema);
      const expected = { key1: 'value1', key2: 'value2' };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: 'applyTransformationsToObject() should leave the original object unmodified',
    test: () => {
      const object = { name: 'Alice', age: 25 };
      const schema = {
        name: obj => obj.name.toUpperCase(),
      };
      const result = applyTransformationsToObject(object, schema);
      const expectedOriginal = { name: 'Alice', age: 25 };

      if (JSON.stringify(object) !== JSON.stringify(expectedOriginal)) {
        throw new Error(`Expected the original object to remain ${JSON.stringify(expectedOriginal)}, but got ${JSON.stringify(object)}`);
      }
    }
  },
];
