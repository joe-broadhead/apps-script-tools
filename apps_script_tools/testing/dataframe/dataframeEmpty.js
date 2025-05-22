DATAFRAME_EMPTY_TESTS = [
    {
        description: 'Basic: DataFrame.empty() should return true for empty DataFrame with no columns',
        test: () => {
            const df = new DataFrame({});

            const result = df.empty();
            const expected = true;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'Basic: DataFrame.empty() should return true for DataFrame with columns but no rows',
        test: () => {
            const df = new DataFrame({
                'A': new Series([], 'A'),
                'B': new Series([], 'B')
            });

            const result = df.empty();
            const expected = true;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'Basic: DataFrame.empty() should return false for non-empty DataFrame',
        test: () => {
            const df = new DataFrame({
                'A': new Series([1, 2, 3], 'A'),
                'B': new Series(['a', 'b', 'c'], 'B')
            });

            const result = df.empty();
            const expected = false;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'DataFrame.empty() should return true for DataFrame created from empty records',
        test: () => {
            const df = DataFrame.fromRecords([]);

            const result = df.empty();
            const expected = true;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'DataFrame.empty() should return true for DataFrame created from empty arrays',
        test: () => {
            const df = DataFrame.fromArrays([[]]);

            const result = df.empty();
            const expected = true;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'DataFrame.empty() should return false for DataFrame with a single row',
        test: () => {
            const df = DataFrame.fromRecords([{ id: 1, name: 'Alice' }]);

            const result = df.empty();
            const expected = false;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'DataFrame.empty() should return false for DataFrame with null/undefined values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: null, name: undefined },
                { id: 2, name: 'Bob' }
            ]);

            const result = df.empty();
            const expected = false;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'DataFrame.empty() after operations: select() should preserve emptiness',
        test: () => {
            const emptyDf = DataFrame.fromRecords([]);
            const result = emptyDf.select(['id', 'name']).empty();
            const expected = true;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'DataFrame.empty() after operations: drop() should preserve emptiness',
        test: () => {
            const emptyDf = DataFrame.fromRecords([]);
            const result = emptyDf.drop(['id']).empty();
            const expected = true;

            if (result !== expected) {
                throw new Error(`Expected ${expected}, but got ${result}`);
            }
        }
    },

    {
        description: 'DataFrame.empty() should be consistent with len() === 0',
        test: () => {
            // Test with empty DataFrame
            const emptyDf = DataFrame.fromRecords([]);
            if (emptyDf.empty() !== (emptyDf.len() === 0)) {
                throw new Error(`empty() and len() === 0 should be consistent for empty DataFrame`);
            }

            // Test with non-empty DataFrame
            const nonEmptyDf = DataFrame.fromRecords([{ id: 1, name: 'Alice' }]);
            if (nonEmptyDf.empty() !== (nonEmptyDf.len() === 0)) {
                throw new Error(`empty() and len() === 0 should be consistent for non-empty DataFrame`);
            }
        }
    }
];