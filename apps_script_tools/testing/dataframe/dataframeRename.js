DATAFRAME_RENAME_TESTS = [
    {
        description: 'Basic: DataFrame.rename() should correctly rename columns based on mapping',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ]);

            const renamed = df.rename({ id: 'user_id', name: 'user_name' });

            // Check column names were updated
            if (!renamed.columns.includes('user_id') ||
                !renamed.columns.includes('user_name') ||
                renamed.columns.includes('id') ||
                renamed.columns.includes('name')) {
                throw new Error(`Expected columns ['user_id', 'user_name'], but got ${JSON.stringify(renamed.columns)}`);
            }

            // Check data integrity
            if (renamed.at(0).user_id !== 1 || renamed.at(1).user_name !== 'Bob') {
                throw new Error('Data values not preserved after renaming');
            }
        }
    },

    {
        description: 'DataFrame.rename() should only rename columns in the mapping',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: 30 }
            ]);

            const renamed = df.rename({ id: 'user_id', name: 'user_name' });

            // Check that 'age' was preserved
            if (!renamed.columns.includes('age')) {
                throw new Error(`Expected 'age' column to be preserved, but got columns ${JSON.stringify(renamed.columns)}`);
            }

            // Check all expected columns
            const expectedColumns = ['user_id', 'user_name', 'age'];
            if (renamed.columns.length !== expectedColumns.length) {
                throw new Error(`Expected ${expectedColumns.length} columns, but got ${renamed.columns.length}`);
            }

            // Check data for unchanged column
            if (renamed.at(0).age !== 30) {
                throw new Error('Data for unaffected columns should be preserved');
            }
        }
    },

    {
        description: 'DataFrame.rename() should handle empty mapping object',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            const renamed = df.rename({});

            // No changes should occur
            if (JSON.stringify(df.columns.sort()) !== JSON.stringify(renamed.columns.sort())) {
                throw new Error(`Expected columns to remain unchanged, but got ${JSON.stringify(renamed.columns)}`);
            }

            // Check data integrity
            if (renamed.at(0).id !== 1 || renamed.at(0).name !== 'Alice') {
                throw new Error('Data values not preserved with empty mapping');
            }
        }
    },

    {
        description: 'DataFrame.rename() should work on an empty DataFrame',
        test: () => {
            const df = DataFrame.fromRecords([]);

            const renamed = df.rename({ id: 'user_id', name: 'user_name' });

            if (!renamed.empty()) {
                throw new Error(`Expected empty DataFrame to remain empty after renaming`);
            }
        }
    },

    {
        description: 'DataFrame.rename() should handle column names with special characters',
        test: () => {
            const df = DataFrame.fromRecords([
                { 'field-with-dashes': 1, 'field.with.dots': 2 }
            ]);

            const renamed = df.rename({
                'field-with-dashes': 'renamed_field',
                'field.with.dots': 'new_field_name'
            });

            // Check column names were updated
            if (!renamed.columns.includes('renamed_field') ||
                !renamed.columns.includes('new_field_name')) {
                throw new Error(`Expected columns with special chars to be renamed, but got ${JSON.stringify(renamed.columns)}`);
            }

            // Check data integrity
            if (renamed.at(0).renamed_field !== 1 || renamed.at(0).new_field_name !== 2) {
                throw new Error('Data values not preserved when renaming columns with special characters');
            }
        }
    },

    {
        description: 'DataFrame.rename() should handle mapping non-existent columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            const renamed = df.rename({ id: 'user_id', nonexistent: 'new_column' });

            // Only existing column should be renamed
            if (!renamed.columns.includes('user_id') ||
                !renamed.columns.includes('name') ||
                renamed.columns.includes('nonexistent') ||
                renamed.columns.includes('new_column')) {
                throw new Error(`Expected columns ['user_id', 'name'], but got ${JSON.stringify(renamed.columns)}`);
            }
        }
    }
];