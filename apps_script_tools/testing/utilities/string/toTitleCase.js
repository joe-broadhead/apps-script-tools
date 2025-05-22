STRING_TO_TITLE_CASE_TESTS = [
  {
    description: "toTitleCase() should convert a lowercase sentence to title case",
    test: () => {
      const result = toTitleCase('hello world');
      const expected = 'Hello World';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle an already title-cased sentence",
    test: () => {
      const result = toTitleCase('Hello World');
      const expected = 'Hello World';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle an uppercase sentence",
    test: () => {
      const result = toTitleCase('HELLO WORLD');
      const expected = 'Hello World';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle a mixed-case sentence",
    test: () => {
      const result = toTitleCase('hElLo WoRlD');
      const expected = 'Hello World';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle a sentence with extra spaces",
    test: () => {
      const result = toTitleCase('   hello   world   ');
      const expected = '   Hello   World   ';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle a sentence with single words",
    test: () => {
      const result = toTitleCase('javascript');
      const expected = 'Javascript';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle a sentence with special characters",
    test: () => {
      const result = toTitleCase('hello! world?');
      const expected = 'Hello! World?';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle a sentence with numbers",
    test: () => {
      const result = toTitleCase('hello 123 world');
      const expected = 'Hello 123 World';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle an empty string",
    test: () => {
      const result = toTitleCase('');
      const expected = '';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle a sentence with only spaces",
    test: () => {
      const result = toTitleCase('     ');
      const expected = '     ';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toTitleCase() should handle a sentence with punctuation and special characters",
    test: () => {
      const result = toTitleCase('hello-world! this_is a test.');
      const expected = 'Hello-World! This_Is A Test.';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  }
];
