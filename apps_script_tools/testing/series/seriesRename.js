SERIES_RENAME_TESTS = [
  {
    description: 'Series.rename() should correctly rename the Series with a valid string name and enforce snake_case',
    test: () => {
      const series = new Series([1, 2, 3], 'oldName');
      const result = series.rename('newName');

      const expectedName = 'new_name'; // Converted to snake_case
      if (result.name !== expectedName) {
        throw new Error(`Expected name "${expectedName}", but got "${result.name}"`);
      }
    }
  },
  {
    description: 'Series.rename() should fall back to "series" if an empty string is passed',
    test: () => {
      const series = new Series([1, 2, 3], 'oldName');

      try {
        series.rename('');
        throw new Error('Expected an error for an empty string, but none was thrown');
      } catch (error) {
        if (!error.message.includes('Invalid name')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    }
  },
  {
    description: 'Series.rename() should handle names with spaces and special characters by enforcing snake_case',
    test: () => {
      const series = new Series([1, 2, 3], 'oldName');
      const result = series.rename('My New!@# Name');

      const expectedName = 'my_new_name'; // Enforced snake_case
      if (result.name !== expectedName) {
        throw new Error(`Expected name "${expectedName}", but got "${result.name}"`);
      }
    }
  },
  {
    description: 'Series.rename() should retain the data when renaming',
    test: () => {
      const series = new Series([1, 2, 3], 'oldName');
      const result = series.rename('newName');

      const expectedArray = [1, 2, 3];
      if (JSON.stringify(result.array) !== JSON.stringify(expectedArray)) {
        throw new Error(`Expected array ${JSON.stringify(expectedArray)}, but got ${JSON.stringify(result.array)}`);
      }
    }
  },
  {
    description: 'Series.rename() should handle names that are already in snake_case',
    test: () => {
      const series = new Series([1, 2, 3], 'old_name');
      const result = series.rename('already_snake_case');

      const expectedName = 'already_snake_case'; // No changes needed
      if (result.name !== expectedName) {
        throw new Error(`Expected name "${expectedName}", but got "${result.name}"`);
      }
    }
  },
  {
    description: 'Series.rename() should handle names with leading and trailing whitespace',
    test: () => {
      const series = new Series([1, 2, 3], 'oldName');
      const result = series.rename('   spaced out   ');

      const expectedName = 'spaced_out'; // Trimmed and converted to snake_case
      if (result.name !== expectedName) {
        throw new Error(`Expected name "${expectedName}", but got "${result.name}"`);
      }
    }
  },
];
