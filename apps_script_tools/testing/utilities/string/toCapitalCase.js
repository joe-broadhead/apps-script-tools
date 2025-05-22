STRING_TO_CAPITAL_CASE_TESTS = [
  {
    description: "toCapitalCase() should capitalize the first letter of a lowercase word",
    test: () => {
      const result = toCapitalCase('hello');
      const expected = 'Hello';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle an already capitalized word",
    test: () => {
      const result = toCapitalCase('World');
      const expected = 'World';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle an all-uppercase word",
    test: () => {
      const result = toCapitalCase('PYTHON');
      const expected = 'Python';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle an all-lowercase word",
    test: () => {
      const result = toCapitalCase('java');
      const expected = 'Java';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle a single letter word",
    test: () => {
      const result = toCapitalCase('a');
      const expected = 'A';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle an empty string",
    test: () => {
      const result = toCapitalCase('');
      const expected = '';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle a string with special characters",
    test: () => {
      const result = toCapitalCase('!hello');
      const expected = '!hello';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle a string with numbers",
    test: () => {
      const result = toCapitalCase('123abc');
      const expected = '123abc';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle a string with mixed case",
    test: () => {
      const result = toCapitalCase('jAvAScriPT');
      const expected = 'Javascript';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should throw an error for non-string inputs",
    test: () => {
      try {
        toCapitalCase(123);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes("value.charAt is not a function")) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: "toCapitalCase() should handle a string with spaces",
    test: () => {
      const result = toCapitalCase(' hello ');
      const expected = ' hello ';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  },
  {
    description: "toCapitalCase() should handle a string with a single special character",
    test: () => {
      const result = toCapitalCase('!');
      const expected = '!';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    }
  }
];
