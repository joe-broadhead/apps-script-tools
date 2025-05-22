DATAFRAME_IAT_TESTS = [
    {
        description: 'Basic: DataFrame.iat() should retrieve the index value at a given position',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' }
            ]);

            // Default sequential indices
            if (df.iat(0) !== 0) {
                throw new Error(`Expected index 0 at position 0, but got ${df.iat(0)}`);
            }

            if (df.iat(1) !== 1) {
                throw new Error(`Expected index 1 at position 1, but got ${df.iat(1)}`);
            }

            if (df.iat(2) !== 2) {
                throw new Error(`Expected index 2 at position 2, but got ${df.iat(2)}`);
            }
        }
    },

    {
        description: 'DataFrame.iat() should work with custom index values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom indices
            df.index = [100, 200];

            if (df.iat(0) !== 100) {
                throw new Error(`Expected custom index 100 at position 0, but got ${df.iat(0)}`);
            }

            if (df.iat(1) !== 200) {
                throw new Error(`Expected custom index 200 at position 1, but got ${df.iat(1)}`);
            }
        }
    },

    {
        description: 'DataFrame.iat() should return undefined for out-of-bounds indexes',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            // Test negative index
            if (df.iat(-1) !== undefined) {
                throw new Error(`Expected undefined for negative index, but got ${df.iat(-1)}`);
            }

            // Test too large index
            if (df.iat(5) !== undefined) {
                throw new Error(`Expected undefined for too large index, but got ${df.iat(5)}`);
            }
        }
    },

    {
        description: 'DataFrame.iat() should handle empty DataFrame',
        test: () => {
            const df = DataFrame.fromRecords([]);

            if (df.iat(0) !== undefined) {
                throw new Error(`Expected undefined for empty DataFrame, but got ${df.iat(0)}`);
            }
        }
    },

    {
        description: 'DataFrame.iat() should work properly with first and last indices',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'First' },
                { id: 2, name: 'Second' },
                { id: 3, name: 'Third' }
            ]);

            // Set custom indices
            df.index = ['first', 'second', 'third'];

            // First index
            if (df.iat(0) !== 'first') {
                throw new Error(`Expected 'first' at position 0, but got ${df.iat(0)}`);
            }

            // Last index
            if (df.iat(2) !== 'third') {
                throw new Error(`Expected 'third' at position 2, but got ${df.iat(2)}`);
            }

            // Just before out-of-bounds
            if (df.iat(df.len() - 1) !== 'third') {
                throw new Error(`Expected 'third' at last position, but got ${df.iat(df.len() - 1)}`);
            }

            // Just after out-of-bounds
            if (df.iat(df.len()) !== undefined) {
                throw new Error(`Expected undefined at len(), but got ${df.iat(df.len())}`);
            }
        }
    },

    {
        description: 'DataFrame.iat() should support non-primitive index values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom indices with objects and dates
            const date1 = new Date('2023-01-15');
            const date2 = new Date('2023-02-20');
            const obj1 = { key: 'value1' };
            const obj2 = { key: 'value2' };

            df.index = [date1, obj1];

            // Date object index
            if (df.iat(0) !== date1) {
                throw new Error(`Expected Date object at position 0`);
            }

            // Object index
            if (df.iat(1) !== obj1) {
                throw new Error(`Expected custom object at position 1`);
            }

            // Check reference equality
            if (df.iat(0) !== date1 || df.iat(1) !== obj1) {
                throw new Error(`Expected reference equality for complex index values`);
            }
        }
    },

    {
        description: 'DataFrame.iat() should work with large DataFrames efficiently',
        test: () => {
            // Create a DataFrame with 10,000 rows and custom indices
            const records = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
            const df = DataFrame.fromRecords(records);

            // Set custom indices (just offset by 1000 from position)
            df.index = Array.from({ length: 10000 }, (_, i) => i + 1000);

            // Test retrieving an index from the middle
            const start = new Date().getTime();
            const result = df.iat(5000);
            const end = new Date().getTime();

            if (result !== 6000) { // 5000 + 1000
                throw new Error(`Expected index 6000 at position 5000, but got ${result}`);
            }

            // Performance check (should be very fast)
            const elapsed = end - start;
            if (elapsed > 20) {  // Allow 20ms max for this simple operation
                throw new Error(`iat() took too long: ${elapsed}ms`);
            }
        }
    },

    {
        description: 'DataFrame.iat() should work correctly after DataFrame operations',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' }
            ]);

            // Set custom indices
            df.index = [10, 20, 30];

            // After filtering, indices should be preserved
            const filtered = df.pipe(df => {
                // Custom filtering to keep only the first two rows
                const newData = {};
                for (const col of df.columns) {
                    newData[col] = new Series(df[col].array.slice(0, 2), col);
                }
                const result = new DataFrame(newData);
                result.index = df.index.slice(0, 2); // Preserve original indices
                return result;
            });

            if (filtered.iat(0) !== 10) {
                throw new Error(`Expected preserved index 10 at position 0 after filtering, but got ${filtered.iat(0)}`);
            }

            if (filtered.iat(1) !== 20) {
                throw new Error(`Expected preserved index 20 at position 1 after filtering, but got ${filtered.iat(1)}`);
            }
        }
    }
];