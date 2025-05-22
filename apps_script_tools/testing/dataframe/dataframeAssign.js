DATAFRAME_ASSIGN_TESTS = [
    {
        description: 'Basic: DataFrame.assign() should add a new column with a scalar value',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const result = df.assign({ active: true });

            // Check that the new column exists
            if (!result.columns.includes('active')) {
                throw new Error(`Expected 'active' column to be added`);
            }

            // Check that all values in the new column are set correctly
            if (result.active.array.some(value => value !== true)) {
                throw new Error(`Expected all values in 'active' column to be true`);
            }

            // Original DataFrame should remain unchanged
            if (df.columns.includes('active')) {
                throw new Error(`Original DataFrame should not be modified`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should add a new column using a function',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, score: 85 },
                { id: 2, score: 95 }
            ]);

            const result = df.assign({
                grade: df => df.score.apply(score => score >= 90 ? 'A' : 'B')
            });

            // Check that the new column exists
            if (!result.columns.includes('grade')) {
                throw new Error(`Expected 'grade' column to be added`);
            }

            // Check values in the new column
            if (result.grade.at(0) !== 'B' || result.grade.at(1) !== 'A') {
                throw new Error(`Expected grades ['B', 'A'], but got [${result.grade.at(0)}, ${result.grade.at(1)}]`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should add a new column using a Series',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const ageSeries = new Series([30, 25], 'age_series');
            const result = df.assign({ age: ageSeries });

            // Check that the new column exists with the correct name
            if (!result.columns.includes('age')) {
                throw new Error(`Expected 'age' column to be added`);
            }

            // Check that Series values are correctly assigned
            if (result.age.at(0) !== 30 || result.age.at(1) !== 25) {
                throw new Error(`Expected ages [30, 25], but got [${result.age.at(0)}, ${result.age.at(1)}]`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should throw error if Series length does not match DataFrame length',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const wrongLengthSeries = new Series([30, 25, 40], 'age');

            try {
                df.assign({ age: wrongLengthSeries });
                throw new Error('Expected an error to be thrown for mismatched Series length');
            } catch (error) {
                if (!error.message.includes('same length')) {
                    throw new Error(`Expected error about length mismatch, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.assign() should modify an existing column',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'alice' },
                { id: 2, name: 'bob' }
            ]);

            const result = df.assign({
                name: df => df.name.apply(name => name.toUpperCase())
            });

            // Check that the column was modified
            if (result.name.at(0) !== 'ALICE' || result.name.at(1) !== 'BOB') {
                throw new Error(`Expected names ['ALICE', 'BOB'], but got [${result.name.at(0)}, ${result.name.at(1)}]`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should add multiple columns in one call',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const result = df.assign({
                active: true,
                score: df => new Series([85, 95], 'score'),
                upperName: df => df.name.apply(name => name.toUpperCase())
            });

            // Check that all new columns exist
            if (!result.columns.includes('active') ||
                !result.columns.includes('score') ||
                !result.columns.includes('upperName')) {
                throw new Error(`Not all new columns were added`);
            }

            // Check values in the new columns
            if (result.active.at(0) !== true || result.score.at(1) !== 95 || result.upperName.at(0) !== 'ALICE') {
                throw new Error(`New column values were not set correctly`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should work with empty DataFrame',
        test: () => {
            const emptyDf = DataFrame.fromRecords([]);
            const result = emptyDf.assign({ newCol: 'value' });

            // Check that the column was added
            if (!result.columns.includes('newCol')) {
                throw new Error(`Expected 'newCol' to be added to empty DataFrame`);
            }

            // Length should still be 0
            if (result.len() !== 0) {
                throw new Error(`Expected empty DataFrame to remain empty`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should handle null and undefined values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const result = df.assign({
                nullCol: null,
                undefinedCol: undefined
            });

            // Check that columns were added with correct values
            if (result.nullCol.array.some(val => val !== null) ||
                result.undefinedCol.array.some(val => val !== undefined)) {
                throw new Error(`Null and undefined values not assigned correctly`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should preserve index values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom index
            df.index = [100, 200];

            const result = df.assign({ active: true });

            // Check that index was preserved
            if (result.iat(0) !== 100 || result.iat(1) !== 200) {
                throw new Error(`Expected index [100, 200], but got [${result.iat(0)}, ${result.iat(1)}]`);
            }
        }
    },

    {
        description: 'DataFrame.assign() should handle functions that return scalar values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', score: 85 },
                { id: 2, name: 'Bob', score: 95 }
            ]);

            const result = df.assign({
                avgScore: df => df.score.mean(),
                totalScore: df => df.score.sum()
            });

            // Check scalar function results are broadcast to all rows
            if (result.avgScore.at(0) !== 90 || result.avgScore.at(1) !== 90 ||
                result.totalScore.at(0) !== 180 || result.totalScore.at(1) !== 180) {
                throw new Error('Scalar function results not broadcast correctly to all rows');
            }
        }
    }
];