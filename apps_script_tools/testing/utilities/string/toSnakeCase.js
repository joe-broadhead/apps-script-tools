STRING_TO_SNAKE_CASE_TESTS = [
  {
    description: "toSnakeCase() should convert camelCase to snake_case",
    test: () => {
      const result = toSnakeCase('camelCaseExample');
      const expected = 'camel_case_example';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should convert PascalCase to snake_case",
    test: () => {
      const result = toSnakeCase('PascalCaseExample');
      const expected = 'pascal_case_example';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should replace spaces with underscores",
    test: () => {
      const result = toSnakeCase('this is a test');
      const expected = 'this_is_a_test';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with leading and trailing spaces",
    test: () => {
      const result = toSnakeCase('  snake case test  ');
      const expected = 'snake_case_test';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with special characters",
    test: () => {
      const result = toSnakeCase('hello@world! How#are$you?');
      const expected = 'hello_world_how_are_you';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with multiple consecutive spaces",
    test: () => {
      const result = toSnakeCase('this   has   multiple   spaces');
      const expected = 'this_has_multiple_spaces';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with multiple consecutive special characters",
    test: () => {
      const result = toSnakeCase('this---is***a$$test');
      const expected = 'this_is_a_test';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with underscores and normalize them",
    test: () => {
      const result = toSnakeCase('this_is__already_snake_case');
      const expected = 'this_is_already_snake_case';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with numbers",
    test: () => {
      const result = toSnakeCase('thisIsATest123');
      const expected = 'this_is_a_test123';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle an empty string",
    test: () => {
      const result = toSnakeCase('');
      const expected = '';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with only special characters",
    test: () => {
      const result = toSnakeCase('!@#$%^&*()');
      const expected = '';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should remove leading and trailing underscores",
    test: () => {
      const result = toSnakeCase('_this_is_a_test_');
      const expected = 'this_is_a_test';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle strings with mixed cases and spaces",
    test: () => {
      const result = toSnakeCase('This is a MIXED case Test');
      const expected = 'this_is_a_mixed_case_test';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toSnakeCase() should handle a large string efficiently",
    test: () => {
      const largeString = 'thisIsA'.repeat(1000);
      const result = toSnakeCase(largeString);
      const expected = 'this_is_a'.repeat(1000);
      if (result !== expected) {
        throw new Error('Failed Test: Large String Conversion');
      }
    }
  },  
];
