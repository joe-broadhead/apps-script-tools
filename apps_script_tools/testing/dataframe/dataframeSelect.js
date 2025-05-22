DATAFRAME_SELECT_TESTS = [
    {
        description: 'Basic: DataFrame.select() should return a DataFrame with only the specified columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30, city: 'New York' },
                { id: 2, name: 'Bob', age: 25, city: 'Chicago' }
            ]);

            const result = df.select(['id', 'name']);

            // Check that only selected columns exist
            if (result.columns.length !== 2) {
                throw new Error(`Expected 2 columns, but got ${result.columns.length}`);
            }

            if (!result.columns.includes('id') || !result.columns.includes('name')) {
                throw new Error(`Expected columns ['id', 'name'], but got ${result.columns}`);
            }

            // Check that excluded columns are gone
            if (result.columns.includes('age') || result.columns.includes('city')) {
                throw new Error(`Expected 'age' and 'city' columns to be excluded`);
            }

            // Check that data is preserved correctly
            if (result.at(0).id !== 1 || result.at(0).name !== 'Alice' ||
                result.at(1).id !== 2 || result.at(1).name !== 'Bob') {
                throw new Error(`Data values were not preserved correctly`);
            }
        }
    },

    {
        description: 'DataFrame.select() should preserve the order of columns as specified',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 }
            ]);

            // Select columns in different order than original
            const result = df.select(['age', 'id', 'name']);

            // Check that column order matches the specified order
            if (JSON.stringify(result.columns) !== JSON.stringify(['age', 'id', 'name'])) {
                throw new Error(`Expected columns in order ['age', 'id', 'name'], but got ${JSON.stringify(result.columns)}`);
            }
        }
    },

    {
        description: 'DataFrame.select() should handle selecting the same column multiple times',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 }
            ]);

            // This should deduplicate columns
            const result = df.select(['id', 'id', 'name']);

            // Check that duplicate columns are handled correctly
            if (result.columns.length !== 2) {
                throw new Error(`Expected 2 unique columns, but got ${result.columns.length}`);
            }

            if (!result.columns.includes('id') || !result.columns.includes('name')) {
                throw new Error(`Expected columns ['id', 'name'], but got ${result.columns}`);
            }
        }
    },

    {
        description: 'DataFrame.select() should return an empty DataFrame when given an empty array',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 }
            ]);

            const result = df.select([]);

            // Check that result has no columns
            if (result.columns.length !== 0) {
                throw new Error(`Expected 0 columns, but got ${result.columns.length}`);
            }

            // Check that it's still a valid DataFrame
            if (!(result instanceof DataFrame)) {
                throw new Error(`Result should be a DataFrame instance`);
            }

            // Check row count is preserved
            if (result.len() !== 0) {
                throw new Error(`Expected empty DataFrame, but got ${result.len()} rows`);
            }
        }
    },

    {
        description: 'DataFrame.select() should handle selecting all columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 },
                { id: 2, name: 'Bob', age: 25 }
            ]);

            const result = df.select(df.columns);

            // Check that all columns are present
            if (result.columns.length !== df.columns.length) {
                throw new Error(`Expected all columns to be selected`);
            }

            // Check that all data is preserved
            if (result.at(0).id !== 1 || result.at(0).name !== 'Alice' || result.at(0).age !== 30 ||
                result.at(1).id !== 2 || result.at(1).name !== 'Bob' || result.at(1).age !== 25) {
                throw new Error(`Data values were not preserved correctly`);
            }
        }
    },

    {
        description: 'DataFrame.select() should preserve row indices',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom indices
            df.index = [100, 200];

            const result = df.select(['id']);

            // Check indices are preserved
            if (result.iat(0) !== 100 || result.iat(1) !== 200) {
                throw new Error(`Expected indices [100, 200] to be preserved, but got [${result.iat(0)}, ${result.iat(1)}]`);
            }
        }
    },

    {
        description: 'DataFrame.select() should preserve data types',
        test: () => {
            const date = new Date();
            const df = DataFrame.fromRecords([
                {
                    id: 1,
                    name: 'Alice',
                    active: true,
                    score: 95.5,
                    date: date,
                    nested: { key: 'value' }
                }
            ]);

            const result = df.select(['id', 'active', 'date', 'nested']);

            // Check data types
            if (typeof result.at(0).id !== 'number') {
                throw new Error(`Expected numeric id, but got ${typeof result.at(0).id}`);
            }

            if (typeof result.at(0).active !== 'boolean') {
                throw new Error(`Expected boolean active, but got ${typeof result.at(0).active}`);
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
        description: 'DataFrame.select() should handle large DataFrames efficiently',
        test: () => {
            // Create a DataFrame with many columns
            const wideRecords = [{}];
            for (let i = 0; i < 100; i++) {
                wideRecords[0][`col${i}`] = i;
            }

            const df = DataFrame.fromRecords(wideRecords);

            // Select just a few columns
            const columnsToSelect = ['col0', 'col50', 'col99'];

            const start = new Date().getTime();
            const result = df.select(columnsToSelect);
            const end = new Date().getTime();

            // Check correct columns were selected
            if (result.columns.length !== 3) {
                throw new Error(`Expected 3 columns, but got ${result.columns.length}`);
            }

            for (const col of columnsToSelect) {
                if (!result.columns.includes(col)) {
                    throw new Error(`Expected column ${col} to be included`);
                }
            }

            // Performance check
            const elapsed = end - start;
            if (elapsed > 50) {  // Allow 50ms for this operation
                throw new Error(`select() took too long: ${elapsed}ms`);
            }
        }
    }
];