DATAFRAME_DROP_TESTS = [
    {
        description: 'Basic: DataFrame.drop() should remove specified columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30, city: 'New York' },
                { id: 2, name: 'Bob', age: 25, city: 'Chicago' }
            ]);

            const result = df.drop(['age', 'city']);

            // Check that dropped columns are removed
            if (result.columns.length !== 2) {
                throw new Error(`Expected 2 columns after dropping, but got ${result.columns.length}`);
            }

            if (result.columns.includes('age') || result.columns.includes('city')) {
                throw new Error(`Expected columns 'age' and 'city' to be removed`);
            }

            // Check that kept columns are intact
            if (!result.columns.includes('id') || !result.columns.includes('name')) {
                throw new Error(`Expected columns 'id' and 'name' to be preserved`);
            }

            // Check that data is preserved correctly
            if (result.at(0).id !== 1 || result.at(0).name !== 'Alice' ||
                result.at(1).id !== 2 || result.at(1).name !== 'Bob') {
                throw new Error(`Data values in remaining columns were not preserved correctly`);
            }
        }
    },

    {
        description: 'DataFrame.drop() should silently ignore non-existent columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            // This should not throw an error
            const result = df.drop(['nonexistent']);

            // All original columns should still be there
            if (result.columns.length !== df.columns.length) {
                throw new Error(`Expected all columns to be preserved when dropping non-existent columns`);
            }

            // Check specific columns
            if (!result.columns.includes('id') || !result.columns.includes('name')) {
                throw new Error(`Expected all original columns to be preserved`);
            }
        }
    },

    {
        description: 'DataFrame.drop() should preserve index values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 },
                { id: 2, name: 'Bob', age: 25 }
            ]);

            // Set custom indices
            df.index = [100, 200];

            const result = df.drop(['age']);

            // Check that indices are preserved
            if (result.iat(0) !== 100 || result.iat(1) !== 200) {
                throw new Error(`Expected indices [100, 200] to be preserved, but got [${result.iat(0)}, ${result.iat(1)}]`);
            }
        }
    },

    {
        description: 'DataFrame.drop() should work with an empty array (no columns dropped)',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 }
            ]);

            const result = df.drop([]);

            // Check that no columns are dropped
            if (result.columns.length !== df.columns.length) {
                throw new Error(`Expected no columns to be dropped`);
            }

            // Verify all original columns exist
            for (const col of df.columns) {
                if (!result.columns.includes(col)) {
                    throw new Error(`Expected column '${col}' to be preserved`);
                }
            }
        }
    },

    {
        description: 'DataFrame.drop() should handle dropping all columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            const result = df.drop(['id', 'name']);

            // Check that all columns are dropped
            if (result.columns.length !== 0) {
                throw new Error(`Expected all columns to be dropped, but got ${result.columns.length} columns`);
            }

            // Should still be a valid DataFrame
            if (!(result instanceof DataFrame)) {
                throw new Error(`Result should be a DataFrame instance`);
            }
        }
    },

    {
        description: 'DataFrame.drop() should maintain data integrity for complex types',
        test: () => {
            const date = new Date();
            const df = DataFrame.fromRecords([
                {
                    id: 1,
                    name: 'Alice',
                    date: date,
                    nested: { key: 'value' }
                }
            ]);

            const result = df.drop(['name']);

            // Check data types in remaining columns
            if (typeof result.at(0).id !== 'number') {
                throw new Error(`Expected numeric id to be preserved, but got ${typeof result.at(0).id}`);
            }

            if (!(result.at(0).date instanceof Date) || result.at(0).date.getTime() !== date.getTime()) {
                throw new Error(`Expected Date object to be preserved`);
            }

            if (typeof result.at(0).nested !== 'object' || result.at(0).nested.key !== 'value') {
                throw new Error(`Expected nested object to be preserved`);
            }
        }
    },

    {
        description: 'DataFrame.drop() should handle large DataFrames efficiently',
        test: () => {
            // Create a DataFrame with many columns
            const wideRecords = [{}];
            for (let i = 0; i < 100; i++) {
                wideRecords[0][`col${i}`] = i;
            }

            const df = DataFrame.fromRecords(wideRecords);

            // Drop a subset of columns
            const columnsToDrop = ['col0', 'col50', 'col99'];

            const start = new Date().getTime();
            const result = df.drop(columnsToDrop);
            const end = new Date().getTime();

            // Check correct columns were dropped
            if (result.columns.length !== 97) {
                throw new Error(`Expected 97 columns after dropping 3, but got ${result.columns.length}`);
            }

            for (const col of columnsToDrop) {
                if (result.columns.includes(col)) {
                    throw new Error(`Expected column ${col} to be dropped`);
                }
            }

            // Performance check
            const elapsed = end - start;
            if (elapsed > 50) {  // Allow 50ms for this operation
                throw new Error(`drop() took too long: ${elapsed}ms`);
            }
        }
    },

    {
        description: 'DataFrame.drop() should maintain correct Series names',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 }
            ]);

            const result = df.drop(['age']);

            // Check that Series names match their column names
            for (const colName of result.columns) {
                const series = result[colName];
                if (series.name !== colName) {
                    throw new Error(`Expected Series name to be '${colName}', but got '${series.name}'`);
                }
            }
        }
    },

    {
        description: 'DataFrame.drop() should maintain consistent Series lengths',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 },
                { id: 2, name: 'Bob', age: 25 }
            ]);

            const result = df.drop(['age']);

            // Check that all Series have the same length
            const seriesLengths = result.columns.map(col => result[col].len());
            const allSameLength = seriesLengths.every(len => len === seriesLengths[0]);

            if (!allSameLength) {
                throw new Error(`Expected all Series to have the same length after drop(), but got lengths: ${seriesLengths}`);
            }

            // Check that length matches original DataFrame
            if (result.len() !== df.len()) {
                throw new Error(`Expected DataFrame length ${df.len()} to be preserved, but got ${result.len()}`);
            }
        }
    }
];