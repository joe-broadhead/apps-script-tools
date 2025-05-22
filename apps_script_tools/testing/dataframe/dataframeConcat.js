DATAFRAME_CONCAT_TESTS = [
    {
        description: 'Basic: DataFrame.concat() should combine two DataFrames with the same columns',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 3, name: 'Charlie' },
                { id: 4, name: 'Dave' }
            ]);

            const result = DataFrame.concat([df1, df2]);

            // Check row count
            if (result.len() !== 4) {
                throw new Error(`Expected 4 rows, but got ${result.len()}`);
            }

            // Check column structure
            if (result.columns.length !== 2 ||
                !result.columns.includes('id') ||
                !result.columns.includes('name')) {
                throw new Error(`Expected columns ['id', 'name'], but got ${result.columns}`);
            }

            // Check values from both DataFrames are present
            const names = result.name.array;
            if (!names.includes('Alice') || !names.includes('Dave')) {
                throw new Error(`Expected values from both DataFrames, but got ${names}`);
            }
        }
    },

    {
        description: 'DataFrame.concat() should handle DataFrames with different columns',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 2, age: 30 }
            ]);

            const result = DataFrame.concat([df1, df2]);

            // Check columns (should have all unique columns)
            if (!result.columns.includes('id') ||
                !result.columns.includes('name') ||
                !result.columns.includes('age')) {
                throw new Error(`Expected columns ['id', 'name', 'age'], but got ${result.columns}`);
            }

            // Check for null values in missing columns
            if (result.at(0).age !== null) {
                throw new Error(`Expected df1 row to have age=null, but got ${result.at(0).age}`);
            }
            if (result.at(1).name !== null) {
                throw new Error(`Expected df2 row to have name=null, but got ${result.at(1).name}`);
            }
        }
    },

    {
        description: 'DataFrame.concat() should return equivalent DataFrame when concatenating single DataFrame',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const result = DataFrame.concat([df]);

            // Check row count
            if (result.len() !== df.len()) {
                throw new Error(`Expected ${df.len()} rows, but got ${result.len()}`);
            }

            // Check column structure
            if (JSON.stringify(result.columns.sort()) !== JSON.stringify(df.columns.sort())) {
                throw new Error(`Expected columns ${df.columns}, but got ${result.columns}`);
            }

            // Check values
            if (JSON.stringify(result.toRecords()) !== JSON.stringify(df.toRecords())) {
                throw new Error(`Result DataFrame differs from original`);
            }
        }
    },

    {
        description: 'DataFrame.concat() should remove duplicates when distinct=true',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 2, name: 'Bob' },   // Duplicate
                { id: 3, name: 'Charlie' }
            ]);

            // Without distinct option
            const resultWithDuplicates = DataFrame.concat([df1, df2]);
            if (resultWithDuplicates.len() !== 4) {
                throw new Error(`Expected 4 rows with duplicates, but got ${resultWithDuplicates.len()}`);
            }

            // With distinct option
            const resultDistinct = DataFrame.concat([df1, df2], true);
            if (resultDistinct.len() !== 3) {
                throw new Error(`Expected 3 rows without duplicates, but got ${resultDistinct.len()}`);
            }

            // Verify distinct records
            const ids = resultDistinct.id.array.sort();
            if (JSON.stringify(ids) !== JSON.stringify([1, 2, 3])) {
                throw new Error(`Expected ids [1,2,3], but got ${ids}`);
            }
        }
    },

    {
        description: 'DataFrame.concat() should handle different data types in the same column',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, value: 'string' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 2, value: 42 }
            ]);

            const result = DataFrame.concat([df1, df2]);

            // Check types are preserved
            if (typeof result.at(0).value !== 'string') {
                throw new Error(`Expected string type, but got ${typeof result.at(0).value}`);
            }
            if (typeof result.at(1).value !== 'number') {
                throw new Error(`Expected number type, but got ${typeof result.at(1).value}`);
            }
        }
    },

    {
        description: 'DataFrame.concat() should concatenate multiple DataFrames (more than 2)',
        test: () => {
            const df1 = DataFrame.fromRecords([{ id: 1 }]);
            const df2 = DataFrame.fromRecords([{ id: 2 }]);
            const df3 = DataFrame.fromRecords([{ id: 3 }]);
            const df4 = DataFrame.fromRecords([{ id: 4 }]);

            const result = DataFrame.concat([df1, df2, df3, df4]);

            if (result.len() !== 4) {
                throw new Error(`Expected 4 rows, but got ${result.len()}`);
            }

            const ids = result.id.array.sort();
            if (JSON.stringify(ids) !== JSON.stringify([1, 2, 3, 4])) {
                throw new Error(`Expected ids [1,2,3,4], but got ${ids}`);
            }
        }
    },

    {
        description: 'DataFrame.concat() should throw error when non-DataFrame objects are provided',
        test: () => {
            const df = DataFrame.fromRecords([{ id: 1 }]);
            const notDf = { id: [2] };

            try {
                const result = DataFrame.concat([df, notDf]);

                // If we get here, the test failed
                throw new Error("Expected error for non-DataFrame object, but no error was thrown");
            } catch (error) {
                // Check that we got the right kind of error
                if (!error.message.includes('DataFrame') && !error.message.includes('instance')) {
                    throw new Error(`Expected error about DataFrame instance, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.concat() should throw error when given an empty array',
        test: () => {
            try {
                const result = DataFrame.concat([]);
                throw new Error("Expected error for empty array, but no error was thrown");
            } catch (error) {
                if (!error.message.includes('non-empty array')) {
                    throw new Error(`Expected error about non-empty array, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.concat() should handle DataFrames with completely different columns',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { a: 1, b: 2 }
            ]);

            const df2 = DataFrame.fromRecords([
                { c: 3, d: 4 }
            ]);

            const result = DataFrame.concat([df1, df2]);

            // Check columns (should have all columns)
            const expectedColumns = ['a', 'b', 'c', 'd'].sort();
            if (JSON.stringify(result.columns.sort()) !== JSON.stringify(expectedColumns)) {
                throw new Error(`Expected columns ${expectedColumns}, but got ${result.columns}`);
            }

            // First row should have null for c and d
            if (result.at(0).c !== null || result.at(0).d !== null) {
                throw new Error(`Expected df1 row to have c=null and d=null`);
            }

            // Second row should have null for a and b
            if (result.at(1).a !== null || result.at(1).b !== null) {
                throw new Error(`Expected df2 row to have a=null and b=null`);
            }
        }
    }
];