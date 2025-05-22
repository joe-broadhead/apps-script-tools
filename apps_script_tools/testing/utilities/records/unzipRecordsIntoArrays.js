RECORDS_UNZIP_RECORDS_INTO_ARRAYS_TESTS = [
  {
    description: 'unzipRecordsIntoArrays() should correctly unzip records into arrays',
    test: () => {
      const records = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'London' },
      ];
      const result = unzipRecordsIntoArrays(records);
      const expected = [
        ['name', 'age', 'city'],
        ['John', 25, 'New York'],
        ['Jane', 30, 'London'],
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'unzipRecordsIntoArrays() should handle an empty records array',
    test: () => {
      const records = [];
      const result = unzipRecordsIntoArrays(records);
      const expected = [];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'unzipRecordsIntoArrays() should apply a transformation function to each record',
    test: () => {
      const records = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
      ];
      const capitalizeNames = record => {
        record.name = record.name.toUpperCase();
        return record;
      };
      const result = unzipRecordsIntoArrays(records, [], capitalizeNames);
      const expected = [
        ['name', 'age'],
        ['JOHN', 25],
        ['JANE', 30],
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'unzipRecordsIntoArrays() should pass additional arguments to the transformation function',
    test: () => {
      const records = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
      ];
      const appendSuffix = (record, suffix) => {
        record.name = `${record.name}${suffix}`;
        return record;
      };
      const result = unzipRecordsIntoArrays(records, [], appendSuffix, ' Doe');
      const expected = [
        ['name', 'age'],
        ['John Doe', 25],
        ['Jane Doe', 30],
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'unzipRecordsIntoArrays() should respect headerOrder when provided',
    test: () => {
      const records = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'London' },
      ];
      const headerOrder = ['city', 'name', 'age'];
      const result = unzipRecordsIntoArrays(records, headerOrder);
      const expected = [
        ['city', 'name', 'age'],
        ['New York', 'John', 25],
        ['London', 'Jane', 30],
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'unzipRecordsIntoArrays() should throw an error for a headerOrder with missing keys',
    test: () => {
      const records = [
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'London' },
      ];
      const headerOrder = ['city', 'name', 'missingKey'];

      try {
        unzipRecordsIntoArrays(records, headerOrder);
        throw new Error('Expected an error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('doesn\'t exist in the provided object')) {
          throw new Error(`Unexpected error message: ${error.message}`);
        }
      }
    },
  },
  {
    description: 'unzipRecordsIntoArrays() should handle mixed data types',
    test: () => {
      const records = [
        { name: 'John', age: '25', isActive: true },
        { name: 'Jane', age: '30', isActive: false },
      ];
      const result = unzipRecordsIntoArrays(records);
      const expected = [
        ['name', 'age', 'isActive'],
        ['John', '25', true],
        ['Jane', '30', false],
      ];

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
  {
    description: 'unzipRecordsIntoArrays() should handle an array of empty records',
    test: () => {
      const records = [{}, {}];
      const result = unzipRecordsIntoArrays(records);
      const expected = [[], [], []]; // Empty rows

      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(result)}`);
      }
    },
  },
];
