OBJECT_APPLY_SCHEMA_TO_OBJECT = [
  {
    description: 'applySchemaToObject() should apply schema transformations correctly',
    test: () => {
      const object = { age: '25', isActive: 'true', name: 'John' };
      const schema = { age: 'integer', isActive: 'boolean', name: 'string' };
      const result = applySchemaToObject(object, schema);
      const expected = { age: 25, isActive: true, name: 'John' };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'applySchemaToObject() should throw an error for unexpected keys in schema',
    test: () => {
      const object = { age: 25, isActive: true };
      const schema = { age: 'integer', extraKey: 'string' };

      try {
        applySchemaToObject(object, schema);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Unexpected key: extraKey')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'applySchemaToObject() should coerce values to the specified types in the schema',
    test: () => {
      const object = { age: '30.5', isActive: '1', salary: '5000.75' };
      const schema = { age: 'float', isActive: 'boolean', salary: 'float' };
      const result = applySchemaToObject(object, schema);
      const expected = { age: 30.5, isActive: true, salary: 5000.75 };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'applySchemaToObject() should handle null or undefined values gracefully',
    test: () => {
      const object = { age: null, isActive: undefined, name: 'John' };
      const schema = { age: 'integer', isActive: 'boolean', name: 'string' };
      const result = applySchemaToObject(object, schema);
      const expected = { age: null, isActive: null, name: 'John' };

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'applySchemaToObject() should throw an error for unsupported types in schema',
    test: () => {
      const object = { age: 25 };
      const schema = { age: 'unsupportedType' };

      try {
        applySchemaToObject(object, schema);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Unsupported type: unsupportedType')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'applySchemaToObject() should leave the original object unmodified',
    test: () => {
      const object = { age: '25', isActive: 'true' };
      const schema = { age: 'integer', isActive: 'boolean' };
      const expectedOriginal = { ...object };

      applySchemaToObject(object, schema);

      if (JSON.stringify(object) !== JSON.stringify(expectedOriginal)) {
        throw new Error(`Expected the original object to remain ${JSON.stringify(expectedOriginal)}, but got ${JSON.stringify(object)}`);
      }
    },
  },
  {
    description: 'applySchemaToObject() should handle an empty object and schema',
    test: () => {
      const object = {};
      const schema = {};
      const result = applySchemaToObject(object, schema);
      const expected = {};

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
