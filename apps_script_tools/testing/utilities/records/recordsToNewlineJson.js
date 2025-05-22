RECORDS_RECORDSTONEWLINEJSON_TESTS = [
  {
    description: 'recordsToNewlineJson() should convert a simple array of records to newline-delimited JSON',
    test: () => {
      const records = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Bob", age: 30 },
      ];
      const result = recordsToNewlineJson(records);
      const expected = `{"id":1,"name":"Alice","age":25}\n{"id":2,"name":"Bob","age":30}`;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: 'recordsToNewlineJson() should handle records with missing fields by filling them with null',
    test: () => {
      const records = [
        { id: 1, name: "Alice" },
        { id: 2, age: 30 },
      ];
      const result = recordsToNewlineJson(records);
      const expected = `{"id":1,"name":"Alice","age":null}\n{"id":2,"name":null,"age":30}`;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: 'recordsToNewlineJson() should handle an empty array of records',
    test: () => {
      const records = [];
      const result = recordsToNewlineJson(records);
      const expected = '';
      if (result !== expected) {
        throw new Error(`Expected an empty string, but got ${result}`);
      }
    },
  },
  {
    description: 'recordsToNewlineJson() should handle an array with a single record',
    test: () => {
      const records = [{ id: 1, name: "Alice", age: 25 }];
      const result = recordsToNewlineJson(records);
      const expected = `{"id":1,"name":"Alice","age":25}`;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: 'recordsToNewlineJson() should handle records with mixed data types',
    test: () => {
      const records = [
        { id: 1, name: "Alice", age: 25, active: true },
        { id: 2, name: "Bob", age: null, active: false },
      ];
      const result = recordsToNewlineJson(records);
      const expected = `{"id":1,"name":"Alice","age":25,"active":true}\n{"id":2,"name":"Bob","age":null,"active":false}`;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: 'recordsToNewlineJson() should handle deeply nested objects in records',
    test: () => {
      const records = [
        { id: 1, name: "Alice", details: { age: 25, city: "Wonderland" } },
        { id: 2, name: "Bob", details: { age: 30, city: "Builderland" } },
      ];
      const result = recordsToNewlineJson(records);
      const expected = `{"id":1,"name":"Alice","details":{"age":25,"city":"Wonderland"}}\n{"id":2,"name":"Bob","details":{"age":30,"city":"Builderland"}}`;
      if (result !== expected) {
        throw new Error(`Expected ${expected}, but got ${result}`);
      }
    },
  },
  {
    description: 'recordsToNewlineJson() should throw an error for non-array input',
    test: () => {
      const records = "not an array";
      try {
        recordsToNewlineJson(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Input must be an array of objects")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'recordsToNewlineJson() should throw an error for invalid record types',
    test: () => {
      const records = [{ id: 1, name: "Alice" }, null];
      try {
        recordsToNewlineJson(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("All records must be non-null objects")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
];
