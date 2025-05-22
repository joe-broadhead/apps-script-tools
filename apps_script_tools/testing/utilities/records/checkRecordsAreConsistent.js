RECORDS_CHECK_RECORDS_ARE_CONSISTENT_TESTS = [
  {
    description: "checkRecordsAreConsistent() should return true for consistent records",
    test: () => {
      const records = [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
        { name: "Jack", age: 40 }
      ];
      const result = checkRecordsAreConsistent(records);
      if (result !== true) {
        throw new Error(`Expected true, but got ${result}`);
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should throw an error for an empty array",
    test: () => {
      const records = [];
      try {
        checkRecordsAreConsistent(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("The records array must be a non-empty array.")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should throw an error for inconsistent number of keys",
    test: () => {
      const records = [
        { name: "John", age: 30 },
        { name: "Jane" }
      ];
      try {
        checkRecordsAreConsistent(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("has a different number of keys")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should throw an error for missing keys",
    test: () => {
      const records = [
        { name: "John", age: 30 },
        { name: "Jane", height: 160 }
      ];
      try {
        checkRecordsAreConsistent(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("is missing the key")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should throw an error for type mismatch",
    test: () => {
      const records = [
        { name: "John", age: 30 },
        { name: "Jane", age: "thirty" }
      ];
      try {
        checkRecordsAreConsistent(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("Type mismatch for key 'age'")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should throw an error for non-object records",
    test: () => {
      const records = [
        { name: "John", age: 30 },
        null
      ];
      try {
        checkRecordsAreConsistent(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("is not a valid object")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should throw an error for invalid input (not an array)",
    test: () => {
      const records = "invalid input";
      try {
        checkRecordsAreConsistent(records);
        throw new Error("Expected an error, but none was thrown");
      } catch (error) {
        if (!error.message.includes("The records array must be a non-empty array.")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should handle deeply nested consistent records",
    test: () => {
      const records = [
        { person: { name: "John", age: 30 }, active: true },
        { person: { name: "Jane", age: 25 }, active: false }
      ];
      const result = checkRecordsAreConsistent(records);
      if (result !== true) {
        throw new Error(`Expected true, but got ${result}`);
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should handle objects with null values",
    test: () => {
      const records = [
        { name: "John", age: null },
        { name: "Jane", age: null }
      ];
      const result = checkRecordsAreConsistent(records);
      if (result !== true) {
        throw new Error(`Expected true, but got ${result}`);
      }
    }
  },
  {
    description: "checkRecordsAreConsistent() should handle empty objects as consistent",
    test: () => {
      const records = [
        {},
        {}
      ];
      const result = checkRecordsAreConsistent(records);
      if (result !== true) {
        throw new Error(`Expected true, but got ${result}`);
      }
    }
  }
];
