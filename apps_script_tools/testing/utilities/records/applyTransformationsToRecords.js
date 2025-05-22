RECORDS_APPLY_TRANSFORMATIONS_TO_RECORDS_TESTS = [
  {
    description: "applyTransformationsToRecords() should correctly apply transformations to all records",
    test: () => {
      const records = [
        { name: "John", age: 20 },
        { name: "Jane", age: 25 }
      ];
      const transformations = {
        name: obj => obj.name.toUpperCase(),
        age: obj => obj.age + 10
      };
      const expected = [
        { name: "JOHN", age: 30 },
        { name: "JANE", age: 35 }
      ];
      const result = applyTransformationsToRecords(records, transformations);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applyTransformationsToRecords() should handle an empty records array",
    test: () => {
      const records = [];
      const transformations = {
        name: obj => obj.name.toUpperCase(),
        age: obj => obj.age + 10
      };
      const expected = [];
      const result = applyTransformationsToRecords(records, transformations);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applyTransformationsToRecords() should handle records with missing keys in the schema",
    test: () => {
      const records = [
        { name: "John", age: 20 },
        { name: "Jane", city: "London" }
      ];
      const transformations = {
        name: obj => obj.name.toUpperCase()
      };
      const expected = [
        { name: "JOHN", age: 20 },
        { name: "JANE", city: "London" }
      ];
      const result = applyTransformationsToRecords(records, transformations);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applyTransformationsToRecords() should handle an empty transformation schema",
    test: () => {
      const records = [
        { name: "John", age: 20 },
        { name: "Jane", age: 25 }
      ];
      const transformations = {};
      const expected = [
        { name: "John", age: 20 },
        { name: "Jane", age: 25 }
      ];
      const result = applyTransformationsToRecords(records, transformations);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applyTransformationsToRecords() should skip invalid transformation functions and retain original values",
    test: () => {
      const records = [{ name: "John", age: 25 }, { name: "Jane", age: 30 }];
      const transformationSchema = {
        name: obj => obj.name.toUpperCase(),
        age: obj => {
          throw new Error("Invalid transformation");
        }
      };
  
      const expected = [
        { name: "JOHN", age: 25 },
        { name: "JANE", age: 30 }
      ]; // Age values remain unchanged due to the invalid transformation
  
      const result = applyTransformationsToRecords(records, transformationSchema);
  
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applyTransformationsToRecords() should handle deeply nested records with transformations",
    test: () => {
      const records = [
        { person: { name: "John", age: 20 }, active: true },
        { person: { name: "Jane", age: 25 }, active: false }
      ];
      const transformations = {
        person: obj => ({
          name: obj.person.name.toUpperCase(),
          age: obj.person.age + 5
        }),
        active: obj => !obj.active
      };
      const expected = [
        { person: { name: "JOHN", age: 25 }, active: false },
        { person: { name: "JANE", age: 30 }, active: true }
      ];
      const result = applyTransformationsToRecords(records, transformations);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  },
  {
    description: "applyTransformationsToRecords() should handle records with null values",
    test: () => {
      const records = [
        { name: null, age: 20 },
        { name: "Jane", age: null }
      ];
      const transformations = {
        name: obj => (obj.name ? obj.name.toUpperCase() : "UNKNOWN"),
        age: obj => (obj.age !== null ? obj.age + 5 : 0)
      };
      const expected = [
        { name: "UNKNOWN", age: 25 },
        { name: "JANE", age: 0 }
      ];
      const result = applyTransformationsToRecords(records, transformations);
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    }
  }
];
