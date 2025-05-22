DATAFRAME_SORT_TESTS = [
    {
        description: 'DataFrame.sort() should correctly sort by a single column in ascending order',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 3, name: 'Charlie' },
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const result = df.sort('id');

            // Check order is preserved
            if (result.at(0).id !== 1 || result.at(1).id !== 2 || result.at(2).id !== 3) {
                throw new Error(`Expected sorted ids [1, 2, 3], but got [${result.id.array}]`);
            }
        }
    },

    {
        description: 'DataFrame.sort() should sort by a single column in descending order',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 3, name: 'Charlie' },
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const result = df.sort('id', false);

            // Check order is preserved
            if (result.at(0).id !== 3 || result.at(1).id !== 2 || result.at(2).id !== 1) {
                throw new Error(`Expected sorted ids [3, 2, 1], but got [${result.id.array}]`);
            }
        }
    },

    {
        description: 'DataFrame.sort() should sort by multiple columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { group: 'A', score: 10 },
                { group: 'B', score: 5 },
                { group: 'A', score: 5 },
                { group: 'B', score: 10 }
            ]);

            const result = df.sort(['group', 'score']);

            // Check group order is A, A, B, B
            if (result.group.array[0] !== 'A' || result.group.array[1] !== 'A' ||
                result.group.array[2] !== 'B' || result.group.array[3] !== 'B') {
                throw new Error(`Expected groups ['A', 'A', 'B', 'B'], but got ${result.group.array}`);
            }

            // Within each group, scores should be ascending
            if (result.at(0).score !== 5 || result.at(1).score !== 10 ||
                result.at(2).score !== 5 || result.at(3).score !== 10) {
                throw new Error(`Expected scores [5, 10, 5, 10], but got [${result.score.array}]`);
            }
        }
    },

    {
        description: 'DataFrame.sort() should support mixed ascending/descending sort order',
        test: () => {
            const df = DataFrame.fromRecords([
                { group: 'A', score: 10 },
                { group: 'B', score: 5 },
                { group: 'A', score: 5 },
                { group: 'B', score: 10 }
            ]);

            const result = df.sort(['group', 'score'], [true, false]);

            // Group A first (ascending), then B
            if (result.group.array[0] !== 'A' || result.group.array[1] !== 'A' ||
                result.group.array[2] !== 'B' || result.group.array[3] !== 'B') {
                throw new Error(`Expected groups ['A', 'A', 'B', 'B'], but got ${result.group.array}`);
            }

            // Within each group, scores should be descending
            if (result.at(0).score !== 10 || result.at(1).score !== 5 ||
                result.at(2).score !== 10 || result.at(3).score !== 5) {
                throw new Error(`Expected scores [10, 5, 10, 5], but got [${result.score.array}]`);
            }
        }
    },

    {
        description: 'DataFrame.sort() should handle null values correctly',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 3, name: 'Charlie' },
                { id: null, name: 'David' },
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Ascending - nulls last
            const resultAsc = df.sort('id');
            if (resultAsc.at(0).id !== 1 || resultAsc.at(1).id !== 2 ||
                resultAsc.at(2).id !== 3 || resultAsc.at(3).id !== null) {
                throw new Error(`Expected sorted ids with null last [1, 2, 3, null], but got [${resultAsc.id.array}]`);
            }

            // Descending - nulls first
            const resultDesc = df.sort('id', false);
            if (resultDesc.at(0).id !== null || resultDesc.at(1).id !== 3 ||
                resultDesc.at(2).id !== 2 || resultDesc.at(3).id !== 1) {
                throw new Error(`Expected sorted ids with null first [null, 3, 2, 1], but got [${resultDesc.id.array}]`);
            }
        }
    },

    {
        description: 'DataFrame.sort() should use custom comparator function',
        test: () => {
            const df = DataFrame.fromRecords([
                { name: 'Alice' },
                { name: 'Bob' },
                { name: 'Charlie' },
                { name: 'Dave' }
            ]);

            // Sort by name length
            const result = df.sort('name', true, (a, b) => a.length - b.length);

            if (result.at(0).name !== 'Bob' || result.at(1).name !== 'Dave' ||
                result.at(2).name !== 'Alice' || result.at(3).name !== 'Charlie') {
                throw new Error(`Expected names sorted by length ['Bob', 'Dave', 'Alice', 'Charlie'], but got [${result.name.array}]`);
            }
        }
    },

    {
        description: 'DataFrame.sort() should handle empty DataFrame',
        test: () => {
            const df = DataFrame.fromRecords([]);
            const result = df.sort('id');

            if (!result.empty()) {
                throw new Error(`Expected empty DataFrame after sorting empty DataFrame`);
            }
        }
    },

    {
        description: 'DataFrame.sort() should throw error when column not found',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            try {
                df.sort('nonexistent');
                throw new Error("Expected error for nonexistent column, but no error was thrown");
            } catch (error) {
                if (!error.message.includes("Column 'nonexistent' not found")) {
                    throw new Error(`Expected error about column not found, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.sort() should throw error when ascending array length mismatch',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            try {
                df.sort(['id', 'name'], [true]);
                throw new Error("Expected error for ascending array length mismatch, but no error was thrown");
            } catch (error) {
                if (!error.message.includes("'ascending' parameter length")) {
                    throw new Error(`Expected error about ascending parameter length, got: ${error.message}`);
                }
            }
        }
    }
];