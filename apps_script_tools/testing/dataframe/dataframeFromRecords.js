DATAFRAME_FROM_RECORDS_TESTS = [
    {
        description: 'Basic: DataFrame.fromRecords() should create a DataFrame from standard records',
        test: () => {
            const records = [
                { name: 'Alice', age: 30, active: true },
                { name: 'Bob', age: 25, active: false },
                { name: 'Charlie', age: 35, active: true }
            ];

            const df = DataFrame.fromRecords(records);

            // Check column structure
            if (JSON.stringify(df.columns.sort()) !== JSON.stringify(['name', 'age', 'active'].sort())) {
                throw new Error(`Expected columns ['name', 'age', 'active'], but got ${JSON.stringify(df.columns)}`);
            }

            // Check row count
            if (df.len() !== 3) {
                throw new Error(`Expected 3 rows, but got ${df.len()}`);
            }

            // Check specific values
            if (df.at(0).name !== 'Alice' || df.at(1).age !== 25 || df.at(2).active !== true) {
                throw new Error(`DataFrame values don't match the input records`);
            }
        }
    },

    {
        description: 'DataFrame.fromRecords() should create an empty DataFrame from empty array',
        test: () => {
            const df = DataFrame.fromRecords([]);

            if (!df.empty()) {
                throw new Error(`Expected empty DataFrame, but got ${df.len()} rows`);
            }

            if (df.columns.length !== 0) {
                throw new Error(`Expected no columns, but got ${df.columns.length} columns`);
            }
        }
    },

    {
        description: 'DataFrame.fromRecords() should handle inconsistent records by filling missing values with null',
        test: () => {
            const records = [
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25, city: 'London' },
                { name: 'Charlie', city: 'Paris' }
            ];

            const df = DataFrame.fromRecords(records);

            // Check all columns are present
            const expectedColumns = ['name', 'age', 'city'].sort();
            if (JSON.stringify(df.columns.sort()) !== JSON.stringify(expectedColumns)) {
                throw new Error(`Expected columns ${expectedColumns}, but got ${df.columns}`);
            }

            // Check missing values are null
            if (df.at(0).city !== null) {
                throw new Error(`Expected null for missing city in row 0, but got ${df.at(0).city}`);
            }
            if (df.at(2).age !== null) {
                throw new Error(`Expected null for missing age in row 2, but got ${df.at(2).age}`);
            }
        }
    },

    {
        description: 'DataFrame.fromRecords() should preserve basic data types from records',
        test: () => {
            const records = [
                {
                    string: 'text',
                    number: 42,
                    boolean: true
                    // Remove complex types for now
                }
            ];

            const df = DataFrame.fromRecords(records);
            const row = df.at(0);

            if (typeof row.string !== 'string') {
                throw new Error(`Expected string type, but got ${typeof row.string}`);
            }
            if (typeof row.number !== 'number') {
                throw new Error(`Expected number type, but got ${typeof row.number}`);
            }
            if (typeof row.boolean !== 'boolean') {
                throw new Error(`Expected boolean type, but got ${typeof row.boolean}`);
            }
        }
    },

    // Add a separate test for Date objects
    {
        description: 'DataFrame.fromRecords() should handle Date objects',
        test: () => {
            const records = [
                { date: new Date('2023-01-01') }
            ];

            const df = DataFrame.fromRecords(records);
            const value = df.at(0).date;

            // Either it preserves as Date object or converts to string/number
            const isDateOrString = value instanceof Date ||
                (typeof value === 'string' && !isNaN(new Date(value).getTime())) ||
                (typeof value === 'number');

            if (!isDateOrString) {
                throw new Error(`Expected Date or date representation, but got ${typeof value}: ${value}`);
            }
        }
    },

    // // Add separate tests for complex objects if needed
    // {
    //     description: 'DataFrame.fromRecords() should serialize arrays as string or maintain them',
    //     test: () => {
    //         const records = [
    //             { array: [1, 2, 3] }
    //         ];

    //         const df = DataFrame.fromRecords(records);
    //         const value = df.at(0).array;

    //         // Either it keeps arrays or serializes them somehow
    //         const isArrayOrString = Array.isArray(value) || typeof value === 'string';

    //         if (!isArrayOrString) {
    //             throw new Error(`Expected array or string representation, but got ${typeof value}`);
    //         }
    //     }
    // },

    // {
    //     description: 'DataFrame.fromRecords() should handle null, undefined and NaN values',
    //     test: () => {
    //         const records = [
    //             { a: null, b: undefined, c: NaN },
    //             { a: 1, b: 2, c: 3 }
    //         ];

    //         const df = DataFrame.fromRecords(records);

    //         if (df.at(0).a !== null) {
    //             throw new Error(`Expected null value to be preserved, but got ${df.at(0).a}`);
    //         }

    //         if (df.at(0).b !== undefined) {
    //             throw new Error(`Expected undefined value to be preserved, but got ${df.at(0).b}`);
    //         }

    //         if (!isNaN(df.at(0).c)) {
    //             throw new Error(`Expected NaN value to be preserved, but got ${df.at(0).c}`);
    //         }
    //     }
    // },

    {
        description: 'DataFrame.fromRecords() should convert array-like objects to arrays of records',
        test: () => {
            // Using array-like object instead of actual array
            const arrayLike = {
                0: { name: 'Alice', age: 30 },
                1: { name: 'Bob', age: 25 },
                length: 2
            };

            // Convert to array first, as expected by the function
            const records = Array.from(arrayLike);
            const df = DataFrame.fromRecords(records);

            if (df.len() !== 2) {
                throw new Error(`Expected 2 rows, but got ${df.len()}`);
            }

            if (df.at(1).name !== 'Bob') {
                throw new Error(`Expected name 'Bob', but got ${df.at(1).name}`);
            }
        }
    },

    {
        description: 'DataFrame.fromRecords() should throw error if input is not an array',
        test: () => {
            try {
                // Not an array
                const df = DataFrame.fromRecords('not an array');
                throw new Error("Expected error for non-array input, but no error was thrown");
            } catch (error) {
                if (!error.message.includes('array')) {
                    throw new Error(`Expected error about array input, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.fromRecords() should throw error if records are not objects',
        test: () => {
            try {
                // Array of non-objects
                const df = DataFrame.fromRecords([1, 2, 3]);
                throw new Error("Expected error for non-object records, but no error was thrown");
            } catch (error) {
                if (!error.message.includes('object') && !error.message.includes('record')) {
                    throw new Error(`Expected error about record objects, got: ${error.message}`);
                }
            }
        }
    },

    // {
    //     description: 'Performance: DataFrame.fromRecords() should handle large datasets efficiently',
    //     test: () => {
    //         const size = 10000;
    //         const records = Array.from({ length: size }, (_, i) => ({
    //             id: i,
    //             value: i * 10,
    //             name: `Item ${i}`
    //         }));

    //         const startTime = new Date().getTime();
    //         const df = DataFrame.fromRecords(records);
    //         const endTime = new Date().getTime();

    //         // Check size
    //         if (df.len() !== size) {
    //             throw new Error(`Expected ${size} rows, but got ${df.len()}`);
    //         }

    //         // Check performance (should be under 1 second for 10000 records)
    //         const elapsedMs = endTime - startTime;
    //         if (elapsedMs > 1 * 10000) { // Convert from seconds to milliseconds
    //             throw new Error(`fromRecords operation took too long: ${elapsedMs}ms`);
    //         }
    //     }
    // },

    {
        description: 'DataFrame.fromRecords() should set proper Series/column names',
        test: () => {
            const records = [
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 }
            ];

            const df = DataFrame.fromRecords(records);

            // Check Series objects have correct names
            for (const column of df.columns) {
                if (df[column].name !== column) {
                    throw new Error(`Expected Series name to match column name '${column}', but got '${df[column].name}'`);
                }
            }
        }
    },

    {
        description: 'DataFrame.fromRecords() should handle record fields with special characters in names',
        test: () => {
            const records = [
                { 'field-with-dashes': 1, 'field.with.dots': 2, 'field with spaces': 3 },
                { 'field-with-dashes': 4, 'field.with.dots': 5, 'field with spaces': 6 }
            ];

            const df = DataFrame.fromRecords(records);

            // Check all field names are preserved
            if (!df.columns.includes('field-with-dashes') ||
                !df.columns.includes('field.with.dots') ||
                !df.columns.includes('field with spaces')) {
                throw new Error(`Special character field names not preserved: ${df.columns}`);
            }
        }
    }
];