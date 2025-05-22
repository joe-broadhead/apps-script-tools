DATAFRAME_AT_TESTS = [
    {
        description: 'Basic: DataFrame.at() should retrieve a row at a valid index',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', active: true },
                { id: 2, name: 'Bob', active: false },
                { id: 3, name: 'Charlie', active: true }
            ]);

            const result = df.at(1);

            if (result.id !== 2 || result.name !== 'Bob' || result.active !== false) {
                throw new Error(`Expected row { id: 2, name: 'Bob', active: false }, but got ${JSON.stringify(result)}`);
            }
        }
    },

    {
        description: 'DataFrame.at() should throw an error for out-of-bounds index',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            try {
                df.at(1); // Index out of bounds
                throw new Error("Expected error for out-of-bounds index, but no error was thrown");
            } catch (error) {
                if (!error.message.includes('Row index out of bounds')) {
                    throw new Error(`Expected 'Row index out of bounds' error, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.at() should handle first and last rows properly',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'First' },
                { id: 2, name: 'Middle' },
                { id: 3, name: 'Last' }
            ]);

            // Check first row
            const firstRow = df.at(0);
            if (firstRow.id !== 1 || firstRow.name !== 'First') {
                throw new Error(`Expected first row { id: 1, name: 'First' }, but got ${JSON.stringify(firstRow)}`);
            }

            // Check last row
            const lastRow = df.at(2);
            if (lastRow.id !== 3 || lastRow.name !== 'Last') {
                throw new Error(`Expected last row { id: 3, name: 'Last' }, but got ${JSON.stringify(lastRow)}`);
            }
        }
    },

    {
        description: 'DataFrame.at() should work with custom index values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            // Set custom index
            df.index = [100, 200];

            // Index position 1 should still return the second row, regardless of the index value
            const result = df.at(1);

            if (result.id !== 2 || result.name !== 'Bob') {
                throw new Error(`Expected row { id: 2, name: 'Bob' }, but got ${JSON.stringify(result)}`);
            }
        }
    },

    {
        description: 'DataFrame.at() should throw error for empty DataFrame',
        test: () => {
            const df = DataFrame.fromRecords([]);

            try {
                df.at(0);
                throw new Error("Expected error for empty DataFrame, but no error was thrown");
            } catch (error) {
                if (!error.message.includes('Row index out of bounds')) {
                    throw new Error(`Expected 'Row index out of bounds' error, got: ${error.message}`);
                }
            }
        }
    },

    {
        description: 'DataFrame.at() should handle mixed data types',
        test: () => {
            const today = new Date();
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', active: true, score: 95.5, date: today, nested: { key: 'value' } }
            ]);

            const result = df.at(0);

            // Check all data types are preserved
            if (result.id !== 1) {
                throw new Error(`Expected numeric id 1, but got ${result.id}`);
            }

            if (result.name !== 'Alice') {
                throw new Error(`Expected string name 'Alice', but got ${result.name}`);
            }

            if (result.active !== true) {
                throw new Error(`Expected boolean active true, but got ${result.active}`);
            }

            if (result.score !== 95.5) {
                throw new Error(`Expected float score 95.5, but got ${result.score}`);
            }

            if (!(result.date instanceof Date) || result.date.getTime() !== today.getTime()) {
                throw new Error(`Expected Date object to be preserved`);
            }

            if (typeof result.nested !== 'object' || result.nested.key !== 'value') {
                throw new Error(`Expected nested object to be preserved`);
            }
        }
    },

    {
        description: 'DataFrame.at() should handle null values',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: null }
            ]);

            const result = df.at(0);

            if (result.id !== 1) {
                throw new Error(`Expected id 1, but got ${result.id}`);
            }

            if (result.name !== null) {
                throw new Error(`Expected null name, but got ${result.name}`);
            }
        }
    }
];