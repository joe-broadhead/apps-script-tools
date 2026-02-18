const RECORDS_CONVERT_RECORDS_TO_CSV_FORMAT_TESTS = [
  {
    description: 'convertRecordsToCsvFormat() should preserve falsy values',
    test: () => {
      const records = [
        { id: 0, active: false, name: '' }
      ];

      const result = convertRecordsToCsvFormat(records);

      if (!result.includes('0')) {
        throw new Error(`Expected numeric zero in CSV output: ${result}`);
      }

      if (!result.includes('false')) {
        throw new Error(`Expected boolean false in CSV output: ${result}`);
      }

      if (!result.includes('""')) {
        throw new Error(`Expected empty string marker in CSV output: ${result}`);
      }
    },
  },
];
