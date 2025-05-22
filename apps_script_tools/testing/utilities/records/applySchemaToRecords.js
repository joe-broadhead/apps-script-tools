RECORDS_APPLY_SCHEMA_TO_RECORDS_TESTS = [
  {
    description: "applySchemaToRecords() should apply schema to a simple array of records",
    test: () => {
      const records = [
        { id: "1", name: "Alice", age: "25" },
        { id: "2", name: "Bob", age: "30" }
      ];
      const schema = { id: "integer", name: "string", age: "integer" };

      const expected = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Bob", age: 30 }
      ];

      const result = applySchemaToRecords(records, schema);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applySchemaToRecords() should handle records with missing keys in the schema",
    test: () => {
      const records = [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }];
      const schema = { id: "integer", name: "string", age: "integer" };

      try {
        applySchemaToRecords(records, schema);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unexpected key")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "applySchemaToRecords() should coerce values to correct types",
    test: () => {
      const records = [{ id: "1", active: "true" }, { id: "2", active: "false" }];
      const schema = { id: "integer", active: "boolean" };

      const expected = [
        { id: 1, active: true },
        { id: 2, active: false }
      ];

      const result = applySchemaToRecords(records, schema);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applySchemaToRecords() should handle an empty records array",
    test: () => {
      const records = [];
      const schema = { id: "integer", name: "string" };

      const expected = [];
      const result = applySchemaToRecords(records, schema);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applySchemaToRecords() should throw an error for invalid schema types",
    test: () => {
      const records = [{ id: "1", name: "Alice" }];
      const schema = { id: "integer", name: "unknownType" };

      try {
        applySchemaToRecords(records, schema);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unsupported type")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "applySchemaToRecords() should handle mixed data types in records",
    test: () => {
      const records = [
        { id: "1", score: "85.5", passed: "true" },
        { id: "2", score: "70", passed: "false" }
      ];
      const schema = { id: "integer", score: "float", passed: "boolean" };

      const expected = [
        { id: 1, score: 85.5, passed: true },
        { id: 2, score: 70.0, passed: false }
      ];

      const result = applySchemaToRecords(records, schema);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applySchemaToRecords() should handle records with null or undefined values",
    test: () => {
      const records = [{ id: null, name: undefined }, { id: "2", name: "Bob" }];
      const schema = { id: "integer", name: "string" };

      const expected = [
        { id: null, name: null },
        { id: 2, name: "Bob" }
      ];

      const result = applySchemaToRecords(records, schema);

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
