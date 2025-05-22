DATAFRAME_RESET_INDEX_TESTS = [
    {
        description: 'Basic: DataFrame.resetIndex() should reset the index to sequential order',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom index
            df.index = [10, 20];

            // Reset the index
            df.resetIndex();

            const expectedIndex = [0, 1];
            if (JSON.stringify(df.index) !== JSON.stringify(expectedIndex)) {
                throw new Error(`Expected index to be ${JSON.stringify(expectedIndex)}, but got ${JSON.stringify(df.index)}`);
            }
        }
    },

    {
        description: 'DataFrame.resetIndex() should return the DataFrame instance for method chaining',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            const result = df.resetIndex();

            if (result !== df) {
                throw new Error(`Expected resetIndex() to return the DataFrame instance for chaining`);
            }

            // Test chaining multiple operations
            try {
                const chainedResult = df.resetIndex().resetIndex();
                if (chainedResult !== df) {
                    throw new Error(`Expected chained operations to work correctly`);
                }
            } catch (error) {
                throw new Error(`Method chaining failed: ${error.message}`);
            }
        }
    },

    {
        description: 'DataFrame.resetIndex() should not modify the DataFrame data',
        test: () => {
            const records = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ];

            const df = DataFrame.fromRecords(records);

            // Store original values
            const originalId0 = df.at(0).id;
            const originalName1 = df.at(1).name;

            // Reset index
            df.resetIndex();

            // Check data integrity
            if (df.at(0).id !== originalId0 || df.at(1).name !== originalName1) {
                throw new Error(`DataFrame data was modified after resetIndex()`);
            }
        }
    },

    {
        description: 'DataFrame.resetIndex() should work on empty DataFrames',
        test: () => {
            const df = DataFrame.fromRecords([]);

            // This should not throw an error
            try {
                df.resetIndex();
                // If we get here, test passes
            } catch (error) {
                throw new Error(`resetIndex() on empty DataFrame threw error: ${error.message}`);
            }

            // Index should be an empty array
            if (df.index.length !== 0) {
                throw new Error(`Expected empty index array, but got length ${df.index.length}`);
            }
        }
    },

    {
        description: 'DataFrame.resetIndex() should handle very large DataFrames efficiently',
        test: () => {
            // Create a DataFrame with 10,000 rows
            const records = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
            const df = DataFrame.fromRecords(records);

            // Set a custom index
            df.index = Array.from({ length: 10000 }, (_, i) => i * 2);

            // Measure time to reset index
            const start = new Date().getTime();
            df.resetIndex();
            const end = new Date().getTime();

            // Check first and last indices
            if (df.index[0] !== 0 || df.index[9999] !== 9999) {
                throw new Error(`Index not properly reset for large DataFrame`);
            }

            // Performance check (should be well under 1 second)
            const elapsed = end - start;
            if (elapsed > 1000) {
                throw new Error(`resetIndex() took too long: ${elapsed}ms`);
            }
        }
    },

    {
        description: 'DataFrame.resetIndex() should not affect at() and iat() behavior',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom index
            df.index = [100, 200];

            // Record behavior before reset
            const at0Before = df.at(0).id;
            const iat100Before = df.iat(0);

            // Reset index
            df.resetIndex();

            // Check at() still works by position
            if (df.at(0).id !== at0Before) {
                throw new Error(`at() behavior changed after resetIndex()`);
            }

            // Check iat() returns new index
            if (df.iat(0) !== 0) {
                throw new Error(`iat() doesn't return new index after resetIndex()`);
            }
        }
    },

    {
        description: 'DataFrame.resetIndex() should work with non-numeric custom indices',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set string indices
            df.index = ['a', 'b'];

            // Reset index
            df.resetIndex();

            // Check index is numeric sequential
            if (df.index[0] !== 0 || df.index[1] !== 1) {
                throw new Error(`Expected numeric sequential indices, but got ${JSON.stringify(df.index)}`);
            }
        }
    }
];