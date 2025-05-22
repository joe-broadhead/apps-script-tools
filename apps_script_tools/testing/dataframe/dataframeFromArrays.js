DATAFRAME_FROM_ARRAYS_TESTS = [
    {
        description: 'Basic: DataFrame.fromArrays() should create a DataFrame from 2D array with header',
        test: () => {
            const arrays = [
                ['name', 'age', 'active'],
                ['Alice', 30, true],
                ['Bob', 25, false],
                ['Charlie', 35, true]
            ];

            const df = DataFrame.fromArrays(arrays);

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
                throw new Error(`DataFrame values don't match the input arrays`);
            }
        }
    },

    {
        description: 'DataFrame.fromArrays() should support custom header row position',
        test: () => {
            const arrays = [
                ['Extra data row 1'],
                ['Extra data row 2'],
                ['name', 'age', 'active'],  // Header at index 2
                ['Alice', 30, true],
                ['Bob', 25, false]
            ];

            const df = DataFrame.fromArrays(arrays, { headerRow: 2 });

            // Check column structure
            if (JSON.stringify(df.columns.sort()) !== JSON.stringify(['name', 'age', 'active'].sort())) {
                throw new Error(`Expected columns ['name', 'age', 'active'], but got ${JSON.stringify(df.columns)}`);
            }

            // Check row count (should exclude header and rows before header)
            if (df.len() !== 2) {
                throw new Error(`Expected 2 rows, but got ${df.len()}`);
            }

            // Check specific values
            if (df.at(0).name !== 'Alice' || df.at(1).age !== 25) {
                throw new Error(`DataFrame values don't match the expected values`);
            }
        }
    },

    {
        description: 'DataFrame.fromArrays() should create an empty DataFrame from empty arrays',
        test: () => {
            const df = DataFrame.fromArrays([]);

            if (!df.empty()) {
                throw new Error(`Expected empty DataFrame, but got ${df.len()} rows`);
            }

            if (df.columns.length !== 0) {
                throw new Error(`Expected no columns, but got ${df.columns.length} columns`);
            }
        }
    },

    // {
    //     description: 'DataFrame.fromArrays() should handle arrays with only headers and no data',
    //     test: () => {
    //         const arrays = [
    //             ['name', 'age', 'active']
    //         ];

    //         const df = DataFrame.fromArrays(arrays);

    //         // Check column structure
    //         if (JSON.stringify(df.columns.sort()) !== JSON.stringify(['name', 'age', 'active'].sort())) {
    //             throw new Error(`Expected columns ['name', 'age', 'active'], but got ${JSON.stringify(df.columns)}`);
    //         }

    //         // Check row count
    //         if (!df.empty()) {
    //             throw new Error(`Expected 0 rows, but got ${df.len()}`);
    //         }
    //     }
    // },

    {
        description: 'DataFrame.fromArrays() should preserve data types from arrays',
        test: () => {
            const arrays = [
                ['string', 'number', 'boolean'],
                ['text', 42, true]
            ];

            const df = DataFrame.fromArrays(arrays);
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

    // {
    //     description: 'DataFrame.fromArrays() should handle null, undefined and NaN values',
    //     test: () => {
    //         const arrays = [
    //             ['a', 'b', 'c'],
    //             [null, undefined, NaN],
    //             [1, 2, 3]
    //         ];

    //         const df = DataFrame.fromArrays(arrays);

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
        description: 'DataFrame.fromArrays() should throw error if input is not an array',
        test: () => {
            try {
                const df = DataFrame.fromArrays('not an array');
                throw new Error("Expected error for non-array input, but no error was thrown");
            } catch (error) {
                if (!error.message.includes('array')) {
                    throw new Error(`Expected error about array input, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.fromArrays() should handle arrays with inconsistent lengths',
        test: () => {
            const arrays = [
                ['name', 'age', 'city'],
                ['Alice', 30],                // Missing city
                ['Bob', 25, 'London', 'UK']   // Extra element
            ];

            const df = DataFrame.fromArrays(arrays, { standardize: true });

            // Check column structure
            if (JSON.stringify(df.columns.sort()) !== JSON.stringify(['name', 'age', 'city', 'null'].sort())) {
                throw new Error(`Expected columns ['name', 'age', 'city', 'null'], but got ${JSON.stringify(df.columns)}`);
            }

            // Check missing values are null
            if (df.at(0).city !== null) {
                throw new Error(`Expected null for missing city in row 0, but got ${df.at(0).city}`);
            }

            // Check if extra values are ignored
            if ('3' in df.at(1) || df.columns.includes('3')) {
                throw new Error(`Expected extra values to be ignored`);
            }
        }
    },

    {
        description: 'DataFrame.fromArrays() should handle headerRow index out of bounds',
        test: () => {
            const arrays = [
                ['name', 'age'],
                ['Alice', 30]
            ];

            try {
                const df = DataFrame.fromArrays(arrays, 5);  // Out of bounds
                throw new Error("Expected error for out of bounds headerRow, but no error was thrown");
            } catch (error) {
                if (!error.message.includes('header') && !error.message.includes('index') && !error.message.includes('bound')) {
                    throw new Error(`Expected error about header row bounds, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.fromArrays() should handle numeric header names',
        test: () => {
            const arrays = [
                [1, 2, 3],
                ['a', 'b', 'c'],
                ['d', 'e', 'f']
            ];

            const df = DataFrame.fromArrays(arrays);

            // Check if numeric headers are converted to strings
            if (!df.columns.includes('1') || !df.columns.includes('2') || !df.columns.includes('3')) {
                throw new Error(`Expected numeric headers to be converted to strings, but got ${df.columns}`);
            }

            // Check values
            if (df.at(0)['1'] !== 'a' || df.at(1)['3'] !== 'f') {
                throw new Error(`Values not properly associated with numeric column headers`);
            }
        }
    },

    {
        description: 'Performance: DataFrame.fromArrays() should handle large datasets efficiently',
        test: () => {
            const size = 10000;
            const header = ['id', 'value', 'name'];
            const data = Array.from({ length: size }, (_, i) => [i, i * 10, `Item ${i}`]);
            const arrays = [header, ...data];

            const startTime = new Date().getTime();
            const df = DataFrame.fromArrays(arrays);
            const endTime = new Date().getTime();

            // Check size
            if (df.len() !== size) {
                throw new Error(`Expected ${size} rows, but got ${df.len()}`);
            }

            // Check performance (should be under 1 second for 10000 rows)
            const elapsedMs = endTime - startTime;
            if (elapsedMs > 10000) { // 10 seconds is very generous
                throw new Error(`fromArrays operation took too long: ${elapsedMs}ms`);
            }
        }
    },

    {
        description: 'DataFrame.fromArrays() should set proper Series/column names',
        test: () => {
            const arrays = [
                ['name', 'age'],
                ['Alice', 30],
                ['Bob', 25]
            ];

            const df = DataFrame.fromArrays(arrays);

            // Check Series objects have correct names
            for (const column of df.columns) {
                if (df[column].name !== column) {
                    throw new Error(`Expected Series name to match column name '${column}', but got '${df[column].name}'`);
                }
            }
        }
    },

    {
        description: 'DataFrame.fromArrays() should handle special characters in column names',
        test: () => {
            const arrays = [
                ['field-with-dashes', 'field.with.dots', 'field with spaces'],
                [1, 2, 3],
                [4, 5, 6]
            ];

            const df = DataFrame.fromArrays(arrays);

            // Check all field names are preserved
            if (!df.columns.includes('field-with-dashes') ||
                !df.columns.includes('field.with.dots') ||
                !df.columns.includes('field with spaces')) {
                throw new Error(`Special character field names not preserved: ${df.columns}`);
            }
        }
    }
];