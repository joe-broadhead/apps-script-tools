STRING_ZFILL_TESTS = [
  {
    description: 'zfill() should pad a string with zeros to the specified width',
    test: () => {
      const result = zfill('123', 5);
      const expected = '00123';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should return the original string if it is already the specified width',
    test: () => {
      const result = zfill('12345', 5);
      const expected = '12345';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should return the original string if it exceeds the specified width',
    test: () => {
      const result = zfill('123456', 5);
      const expected = '123456';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should handle numeric input by converting it to a string',
    test: () => {
      const result = zfill(123, 5);
      const expected = '00123';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should handle a width of 0 by returning the original string',
    test: () => {
      const result = zfill('123', 0);
      const expected = '123';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should handle an empty string input',
    test: () => {
      const result = zfill('', 5);
      const expected = '00000';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should throw an error if width is not a non-negative integer',
    test: () => {
      try {
        zfill('123', -1);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('The width must be a non-negative integer')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'zfill() should handle a string with spaces',
    test: () => {
      const result = zfill(' 123', 6);
      const expected = '00 123';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should handle a string with special characters',
    test: () => {
      const result = zfill('#$%', 5);
      const expected = '00#$%';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
  {
    description: 'zfill() should handle a string with leading zeros',
    test: () => {
      const result = zfill('00123', 7);
      const expected = '0000123';
      if (result !== expected) {
        throw new Error(`Expected "${expected}", but got "${result}"`);
      }
    },
  },
];
