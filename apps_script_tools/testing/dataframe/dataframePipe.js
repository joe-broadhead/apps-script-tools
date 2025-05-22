DATAFRAME_PIPE_TESTS = [
    {
        description: 'Basic: DataFrame.pipe() should apply a single function to transform the DataFrame',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'alice' },
                { id: 2, name: 'bob' }
            ]);

            // Simple transformation function
            const capitalize = df => df.assign({
                name: df => df.name.apply(name => name.toUpperCase())
            });

            const result = df.pipe(capitalize);

            // Check transformation applied correctly
            if (result.name.at(0) !== 'ALICE' || result.name.at(1) !== 'BOB') {
                throw new Error(`Expected names ['ALICE', 'BOB'], but got [${result.name.at(0)}, ${result.name.at(1)}]`);
            }

            // Original DataFrame should be unchanged
            if (df.name.at(0) !== 'alice' || df.name.at(1) !== 'bob') {
                throw new Error('Original DataFrame should not be modified');
            }
        }
    },

    {
        description: 'DataFrame.pipe() should chain multiple functions in correct order',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', score: 85 }
            ]);

            // Define transformation functions
            const addPrefix = df => df.assign({
                name: df => df.name.apply(name => `Dr. ${name}`)
            });

            const addSuffix = df => df.assign({
                name: df => df.name.apply(name => `${name}, PhD`)
            });

            const doubleScore = df => df.assign({
                score: df => df.score.apply(score => score * 2)
            });

            // Apply chain of functions
            const result = df.pipe(
                addPrefix,
                addSuffix,
                doubleScore
            );

            // Check transformations applied in correct order
            if (result.name.at(0) !== 'Dr. Alice, PhD') {
                throw new Error(`Expected name 'Dr. Alice, PhD', but got '${result.name.at(0)}'`);
            }

            if (result.score.at(0) !== 170) {
                throw new Error(`Expected doubled score 170, but got ${result.score.at(0)}`);
            }
        }
    },

    {
        description: 'DataFrame.pipe() should throw error if function does not return DataFrame',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            // Function that doesn't return a DataFrame
            const invalidFunc = df => {
                return df.name.array; // Returns array, not DataFrame
            };

            try {
                df.pipe(invalidFunc);
                throw new Error('Expected error for non-DataFrame return, but no error was thrown');
            } catch (error) {
                if (!error.message.includes('should return a DataFrame instance')) {
                    throw new Error(`Expected error about DataFrame instance, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.pipe() should work with empty function list (identity operation)',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            // Pipe with no functions should return the same DataFrame
            const result = df.pipe();

            // Should be the same DataFrame
            if (result !== df) {
                throw new Error('Expected pipe() with no functions to return the original DataFrame');
            }
        }
    },

    {
        description: 'DataFrame.pipe() should preserve column data integrity through transformations',
        test: () => {
            const today = new Date();
            const df = DataFrame.fromRecords([
                {
                    id: 1,
                    name: 'Alice',
                    active: true,
                    date: today,
                    nested: { key: 'value' }
                }
            ]);

            // Function that adds a column but doesn't modify others
            const addColumn = df => df.assign({ score: 100 });

            const result = df.pipe(addColumn);

            // Check all original data types are preserved
            if (typeof result.id.at(0) !== 'number' ||
                typeof result.name.at(0) !== 'string' ||
                typeof result.active.at(0) !== 'boolean' ||
                !(result.date.at(0) instanceof Date) ||
                typeof result.nested.at(0) !== 'object') {
                throw new Error('Data types not preserved through pipe transformation');
            }

            // Check complex object maintained integrity
            if (result.date.at(0).getTime() !== today.getTime()) {
                throw new Error('Date object value not preserved through pipe transformation');
            }

            if (result.nested.at(0).key !== 'value') {
                throw new Error('Nested object properties not preserved through pipe transformation');
            }
        }
    },

    {
        description: 'DataFrame.pipe() should preserve index values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom index
            df.index = [100, 200];

            // Simple transformation
            const addColumn = df => df.assign({ active: true });

            const result = df.pipe(addColumn);

            // Check index was preserved
            if (result.iat(0) !== 100 || result.iat(1) !== 200) {
                throw new Error(`Expected index values [100, 200], but got [${result.iat(0)}, ${result.iat(1)}]`);
            }
        }
    },

    {
        description: 'DataFrame.pipe() should handle functions that perform filtering operations',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', score: 85 },
                { id: 2, name: 'Bob', score: 65 },
                { id: 3, name: 'Charlie', score: 90 }
            ]);

            // Filter function that keeps only high scores
            const filterHighScores = df => {
                const highScores = df.toRecords().filter(record => record.score >= 80);
                return DataFrame.fromRecords(highScores);
            };

            const result = df.pipe(filterHighScores);

            // Check filtering worked correctly
            if (result.len() !== 2) {
                throw new Error(`Expected 2 rows after filtering, but got ${result.len()}`);
            }

            const names = result.name.array.sort();
            if (names[0] !== 'Alice' || names[1] !== 'Charlie') {
                throw new Error(`Expected filtered names ['Alice', 'Charlie'], but got ${names}`);
            }
        }
    },

    {
        description: 'DataFrame.pipe() should work with arrow function expressions',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Use arrow functions in pipe
            const result = df.pipe(
                df => df.assign({ doubled: df => df.id.apply(id => id * 2) }),
                df => df.assign({ name: df => df.name.apply(name => name.toLowerCase()) })
            );

            // Check transformations worked
            if (result.doubled.at(0) !== 2 || result.doubled.at(1) !== 4) {
                throw new Error('First arrow function transformation failed');
            }

            if (result.name.at(0) !== 'alice' || result.name.at(1) !== 'bob') {
                throw new Error('Second arrow function transformation failed');
            }
        }
    },

    {
        description: 'DataFrame.pipe() should allow named functions for better error reporting',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            // Define named functions
            function addPrefix(df) {
                return df.assign({ name: df => df.name.apply(name => `Mrs. ${name}`) });
            }

            // We'll test that this function throws an error with its name in the message
            function returnString(df) {
                return "Not a DataFrame";
            }

            try {
                df.pipe(addPrefix, returnString);
                throw new Error('Expected error from named function, but none was thrown');
            } catch (error) {
                // Error should contain function name
                if (!error.message.includes('returnString')) {
                    throw new Error(`Expected error to include function name, got: ${error.message}`);
                }
            }

            // Test successful case
            const result = df.pipe(addPrefix);
            if (result.name.at(0) !== 'Mrs. Alice') {
                throw new Error('Named function transformation failed');
            }
        }
    }
];