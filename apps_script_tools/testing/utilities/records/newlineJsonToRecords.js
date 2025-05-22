RECORDS_NEWLINEJSONTORECORDS_TESTS = [
  {
    description: 'newlineJsonToRecords() should convert newline-delimited JSON into an array of records',
    test: () => {
      const jsonNewLineString = `{"id":1,"name":"Alice","age":25}\n{"id":2,"name":"Bob","age":30}`;
      const result = newlineJsonToRecords(jsonNewLineString);
      const expected = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Bob", age: 30 },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'newlineJsonToRecords() should handle a single line of JSON',
    test: () => {
      const jsonNewLineString = `{"id":1,"name":"Alice","age":25}`;
      const result = newlineJsonToRecords(jsonNewLineString);
      const expected = [{ id: 1, name: "Alice", age: 25 }];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'newlineJsonToRecords() should handle an empty string',
    test: () => {
      const jsonNewLineString = '';
      const result = newlineJsonToRecords(jsonNewLineString);
      const expected = [];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'newlineJsonToRecords() should handle a string with extra newlines',
    test: () => {
      const jsonNewLineString = `\n{"id":1,"name":"Alice","age":25}\n\n{"id":2,"name":"Bob","age":30}\n`;
      const result = newlineJsonToRecords(jsonNewLineString);
      const expected = [
        { id: 1, name: "Alice", age: 25 },
        { id: 2, name: "Bob", age: 30 },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'newlineJsonToRecords() should handle invalid JSON in a line',
    test: () => {
      const jsonNewLineString = `{"id":1,"name":"Alice","age":25}\nINVALID_JSON\n{"id":2,"name":"Bob","age":30}`;
      try {
        newlineJsonToRecords(jsonNewLineString);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Unexpected token")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'newlineJsonToRecords() should handle deeply nested JSON records',
    test: () => {
      const jsonNewLineString = `{"id":1,"details":{"name":"Alice","address":{"city":"Wonderland"}}}\n{"id":2,"details":{"name":"Bob","address":{"city":"Builderland"}}}`;
      const result = newlineJsonToRecords(jsonNewLineString);
      const expected = [
        { id: 1, details: { name: "Alice", address: { city: "Wonderland" } } },
        { id: 2, details: { name: "Bob", address: { city: "Builderland" } } },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'newlineJsonToRecords() should handle mixed valid and empty lines',
    test: () => {
      const jsonNewLineString = `{"id":1,"name":"Alice"}\n\n\n{"id":2,"name":"Bob"}`;
      const result = newlineJsonToRecords(jsonNewLineString);
      const expected = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'newlineJsonToRecords() should throw an error for invalid input type',
    test: () => {
      const jsonNewLineString = 12345; // Not a string
      try {
        newlineJsonToRecords(jsonNewLineString);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("jsonNewLineString.split is not a function")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
];
