DATAFRAME_AS_TYPE_TESTS = [
    {
        description: 'Basic: DataFrame.asType() should convert column types as specified',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: '1', price: '29.99', active: 'true' },
                { id: '2', price: '39.99', active: 'false' }
            ]);

            // Convert types
            const converted = df.asType({
                id: 'number',
                price: 'number',
                active: 'boolean'
            });

            // Check that types were changed
            const schema = converted.schema();

            if (schema.id !== 'number') {
                throw new Error(`Expected id column to be type 'number', but got '${schema.id}'`);
            }

            if (schema.price !== 'number') {
                throw new Error(`Expected price column to be type 'number', but got '${schema.price}'`);
            }

            if (schema.active !== 'boolean') {
                throw new Error(`Expected active column to be type 'boolean', but got '${schema.active}'`);
            }

            // Check that values were converted correctly
            if (typeof converted.at(0).id !== 'number' || converted.at(0).id !== 1) {
                throw new Error(`Expected id to be converted to number 1, but got ${converted.at(0).id} (${typeof converted.at(0).id})`);
            }

            if (typeof converted.at(0).price !== 'number' || Math.abs(converted.at(0).price - 29.99) > 0.001) {
                throw new Error(`Expected price to be converted to number 29.99, but got ${converted.at(0).price} (${typeof converted.at(0).price})`);
            }

            if (typeof converted.at(0).active !== 'boolean' || converted.at(0).active !== true) {
                throw new Error(`Expected active to be converted to boolean true, but got ${converted.at(0).active} (${typeof converted.at(0).active})`);
            }
        }
    },

    {
        description: 'DataFrame.asType() should only convert specified columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: '1', name: 'Alice', score: '95' }
            ]);

            // Only convert id to number
            const converted = df.asType({ id: 'number' });

            // Check schema
            const schema = converted.schema();

            if (schema.id !== 'number') {
                throw new Error(`Expected id column to be type 'number', but got '${schema.id}'`);
            }

            if (schema.name !== 'string') {
                throw new Error(`Expected name column to remain type 'string', but got '${schema.name}'`);
            }

            if (schema.score !== 'string') {
                throw new Error(`Expected score column to remain type 'string', but got '${schema.score}'`);
            }

            // Check values
            if (typeof converted.at(0).id !== 'number' || converted.at(0).id !== 1) {
                throw new Error(`Expected id to be number 1, but got ${converted.at(0).id} (${typeof converted.at(0).id})`);
            }

            if (typeof converted.at(0).score !== 'string' || converted.at(0).score !== '95') {
                throw new Error(`Expected score to remain string '95', but got ${converted.at(0).score} (${typeof converted.at(0).score})`);
            }
        }
    },

    {
        description: 'DataFrame.asType() should handle null/undefined values during conversion',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: '1', value: '10' },
                { id: '2', value: null },
                { id: '3', value: undefined }
            ]);

            // Convert value to number
            const converted = df.asType({ value: 'number' });

            // Check schema
            const schema = converted.schema();
            if (schema.value !== 'mixed') {
                throw new Error(`Expected value column to be type 'mixed', but got '${schema.value}'`);
            }

            // Check values
            if (converted.at(0).value !== 10) {
                throw new Error(`Expected first value to be 10, but got ${converted.at(0).value}`);
            }

            if (converted.at(1).value !== null) {
                throw new Error(`Expected null value to remain null after conversion, but got ${converted.at(1).value}`);
            }
        }
    },

    {
        description: 'DataFrame.asType() should convert from number to string',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, score: 95.5 }
            ]);

            // Convert to strings
            const converted = df.asType({ id: 'string', score: 'string' });

            // Check schema
            const schema = converted.schema();
            if (schema.id !== 'string' || schema.score !== 'string') {
                throw new Error(`Expected columns to be type 'string', but got id: '${schema.id}', score: '${schema.score}'`);
            }

            // Check values
            if (typeof converted.at(0).id !== 'string' || converted.at(0).id !== '1') {
                throw new Error(`Expected id to be string '1', but got ${converted.at(0).id} (${typeof converted.at(0).id})`);
            }

            if (typeof converted.at(0).score !== 'string' || converted.at(0).score !== '95.5') {
                throw new Error(`Expected score to be string '95.5', but got ${converted.at(0).score} (${typeof converted.at(0).score})`);
            }
        }
    },

    {
        description: 'DataFrame.asType() should convert to boolean type',
        test: () => {
            const df = DataFrame.fromRecords([
                { a: 1, b: 0, c: 'true', d: 'false', e: true, f: false }
            ]);

            // Convert all to boolean
            const converted = df.asType({
                a: 'boolean',
                b: 'boolean',
                c: 'boolean',
                d: 'boolean',
                e: 'boolean',
                f: 'boolean'
            });

            // Check values
            if (converted.at(0).a !== true) {
                throw new Error(`Expected numeric 1 to convert to boolean true, but got ${converted.at(0).a}`);
            }

            if (converted.at(0).b !== false) {
                throw new Error(`Expected numeric 0 to convert to boolean false, but got ${converted.at(0).b}`);
            }

            if (converted.at(0).c !== true) {
                throw new Error(`Expected string 'true' to convert to boolean true, but got ${converted.at(0).c}`);
            }

            if (converted.at(0).d !== false) {
                throw new Error(`Expected string 'false' to convert to boolean false, but got ${converted.at(0).d}`);
            }

            if (converted.at(0).e !== true || converted.at(0).f !== false) {
                throw new Error(`Expected boolean values to remain the same after conversion`);
            }
        }
    },
    {
        description: 'DataFrame.asType() should throw error for unsupported type conversion',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' }
            ]);

            try {
                df.asType({ id: 'unsupported_type' });
                throw new Error("Expected error for unsupported type, but no error was thrown");
            } catch (error) {
                if (!error.message.includes("unsupported_type")) {
                    throw new Error(`Expected error about unsupported type, got: ${error.message}`);
                }
            }
        }
    }
];