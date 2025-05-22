DATAFRAME_UNION_TESTS = [
  {
    description: 'Basic: DataFrame.union() should combine two DataFrames with all rows preserved',
    test: () => {
        const df1 = DataFrame.fromRecords([
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
        ]);

        const df2 = DataFrame.fromRecords([
            { id: 3, name: 'Charlie' },
            { id: 4, name: 'Dave' }
        ]);

        const result = df1.union(df2);

        // Check row count
        if (result.len() !== 4) {
            throw new Error(`Expected 4 rows, but got ${result.len()}`);
        }

        // Check columns
        if (result.columns.length !== 2 ||
            !result.columns.includes('id') ||
            !result.columns.includes('name')) {
            throw new Error(`Expected columns ['id', 'name'], but got ${result.columns}`);
        }

        // Check values from both DataFrames are present
        const ids = result.id.array.sort();
        if (JSON.stringify(ids) !== JSON.stringify([1, 2, 3, 4])) {
            throw new Error(`Expected ids [1, 2, 3, 4], but got ${ids}`);
        }
    }
  },

    {
        description: 'DataFrame.union() should preserve duplicate rows by default',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 2, name: 'Bob' },    // Duplicate
                { id: 3, name: 'Charlie' }
            ]);

            const result = df1.union(df2);

            // Check row count - should have all rows including duplicates
            if (result.len() !== 4) {
                throw new Error(`Expected 4 rows (with duplicates), but got ${result.len()}`);
            }

            // Verify duplicates are preserved
            const bobCount = result.id.array.filter(id => id === 2).length;
            if (bobCount !== 2) {
                throw new Error(`Expected duplicate record to appear twice, but found ${bobCount} occurrences`);
            }
        }
    },

    {
        description: 'DataFrame.union(distinct=true) should remove duplicate rows',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 2, name: 'Bob' },    // Duplicate
                { id: 3, name: 'Charlie' }
            ]);

            const result = df1.union(df2, true);

            // Check row count - should have unique rows only
            if (result.len() !== 3) {
                throw new Error(`Expected 3 unique rows, but got ${result.len()}`);
            }

            // Verify duplicates are removed
            const ids = result.id.array.sort();
            if (JSON.stringify(ids) !== JSON.stringify([1, 2, 3])) {
                throw new Error(`Expected unique ids [1, 2, 3], but got ${ids}`);
            }
        }
    },

    {
        description: 'DataFrame.union() should handle DataFrames with different column subsets',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 2, name: 'Bob', age: 30 }
            ]);

            const result = df1.union(df2);

            // Check all columns from both frames are present
            if (result.columns.length !== 3 ||
                !result.columns.includes('id') ||
                !result.columns.includes('name') ||
                !result.columns.includes('age')) {
                throw new Error(`Expected columns ['id', 'name', 'age'], but got ${result.columns}`);
            }

            // Check values and nulls for missing data
            if (result.at(0).age !== null) {
                throw new Error(`Expected null for missing age in first row, but got ${result.at(0).age}`);
            }

            if (result.at(1).age !== 30) {
                throw new Error(`Expected age 30 in second row, but got ${result.at(1).age}`);
            }
        }
    },

    {
        description: 'DataFrame.union() should handle empty DataFrames',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            const emptyDf = DataFrame.fromRecords([{}]);

            // Union with empty DataFrame should return original data
            const result1 = df1.union(emptyDf);
            if (result1.len() !== 1) {
                throw new Error(`Expected 1 row, but got ${result1.len()}`);
            }

            // Empty DataFrame union with data should return data
            const result2 = emptyDf.union(df1);
            if (result2.len() !== 1) {
                throw new Error(`Expected 1 row, but got ${result2.len()}`);
            }

            // Two empty DataFrames should give empty result
            const result3 = emptyDf.union(DataFrame.fromRecords([]));
            if (!result3.empty()) {
                throw new Error(`Expected empty DataFrame, but got ${result3.len()} rows`);
            }
        }
    },

    {
        description: 'DataFrame.union() should handle complex data types and maintain data integrity',
        test: () => {
            const date1 = new Date('2023-01-15');
            const date2 = new Date('2023-02-20');

            const df1 = DataFrame.fromRecords([
                { id: 1, date: date1, nested: { key: 'value' } }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 2, date: date2, nested: { key: 'other' } }
            ]);

            const result = df1.union(df2);

            // Check data types are preserved
            if (!(result.at(0).date instanceof Date)) {
                throw new Error(`Expected Date object in first row, but got ${typeof result.at(0).date}`);
            }

            if (!(result.at(1).date instanceof Date)) {
                throw new Error(`Expected Date object in second row, but got ${typeof result.at(1).date}`);
            }

            // Check complex structures are preserved
            if (result.at(0).nested.key !== 'value' || result.at(1).nested.key !== 'other') {
                throw new Error('Nested object structures not preserved');
            }
        }
    },

    {
        description: 'DataFrame.union(distinct=true) should identify duplicates based on all fields',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice', city: 'New York' },
                { id: 2, name: 'Bob', city: 'Chicago' }
            ]);

            const df2 = DataFrame.fromRecords([
                { id: 1, name: 'Alice', city: 'New York' },   // Exact duplicate
                { id: 1, name: 'Alice', city: 'Boston' }      // Partial duplicate (different city)
            ]);

            const result = df1.union(df2, true);

            // Should have 3 rows (one duplicate removed)
            if (result.len() !== 3) {
                throw new Error(`Expected 3 unique rows, but got ${result.len()}`);
            }

            // Count occurrences of id=1
            const id1Count = result.id.array.filter(id => id === 1).length;
            if (id1Count !== 2) {
                throw new Error(`Expected 2 rows with id=1 (different cities), but got ${id1Count}`);
            }

            // Check cities for id=1 includes both New York and Boston
            const cities = result.toRecords()
                .filter(r => r.id === 1)
                .map(r => r.city)
                .sort();

            if (JSON.stringify(cities) !== JSON.stringify(['Boston', 'New York'])) {
                throw new Error(`Expected cities ['Boston', 'New York'] for id=1, but got ${JSON.stringify(cities)}`);
            }
        }
    },

    {
        description: 'DataFrame.union() should handle specially when index is provided',
        test: () => {
            const df1 = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);
            df1.index = [100];  // Custom index

            const df2 = DataFrame.fromRecords([
                { id: 2, name: 'Bob' }
            ]);
            df2.index = [200];  // Custom index

            const result = df1.union(df2);

            // Result should have default sequential index
            if (JSON.stringify(result.index) !== JSON.stringify([0, 1])) {
                throw new Error(`Expected default indexes [0, 1], but got ${JSON.stringify(result.index)}`);
            }
        }
    }
];