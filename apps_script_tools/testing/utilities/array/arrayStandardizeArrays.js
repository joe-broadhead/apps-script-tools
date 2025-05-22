ARRAY_STANDARDIZE_ARRAYS_TESTS = [
    {
        description: 'Basic: standardizeArrays should make arrays the same length as the longest array',
        test: () => {
            const arrays = [
                [1, 2, 3],
                ['a', 'b'],
                [true]
            ];

            const result = standardizeArrays(arrays, { standardize: true });

            // Check all arrays have the same length
            const allSameLength = result.every(arr => arr.length === 3);
            if (!allSameLength) {
                throw new Error(`Expected all arrays to have length 3, but got lengths: ${result.map(arr => arr.length)}`);
            }

            // Check values are preserved and null is added where needed
            if (result[0][0] !== 1 || result[1][0] !== 'a' || result[2][0] !== true) {
                throw new Error("Original values should be preserved");
            }

            if (result[1][2] !== null || result[2][1] !== null || result[2][2] !== null) {
                throw new Error("Missing values should be filled with null");
            }
        }
    },

    {
        description: 'standardizeArrays should handle custom default value',
        test: () => {
            const arrays = [
                [1, 2],
                ['a', 'b', 'c']
            ];

            const result = standardizeArrays(arrays, { defaultValue: 'N/A' });

            if (result[0][2] !== 'N/A') {
                throw new Error(`Expected 'N/A' as default value, but got ${result[0][2]}`);
            }
        }
    },

    {
        description: 'standardizeArrays should handle custom target length',
        test: () => {
            const arrays = [
                [1, 2, 3],
                ['a', 'b']
            ];

            const result = standardizeArrays(arrays, { targetLength: 5 });

            // Check all arrays have the specified length
            const allCorrectLength = result.every(arr => arr.length === 5);
            if (!allCorrectLength) {
                throw new Error(`Expected all arrays to have length 5, but got lengths: ${result.map(arr => arr.length)}`);
            }

            // Check original values and padding
            if (result[0][2] !== 3 || result[0][3] !== null || result[0][4] !== null) {
                throw new Error("First array not padded correctly");
            }

            if (result[1][1] !== 'b' || result[1][2] !== null || result[1][4] !== null) {
                throw new Error("Second array not padded correctly");
            }
        }
    },

    {
        description: 'standardizeArrays should handle empty arrays in the input',
        test: () => {
            const arrays = [
                [1, 2, 3],
                []
            ];

            const result = standardizeArrays(arrays);

            if (result[1].length !== 3 || result[1][0] !== null || result[1][2] !== null) {
                throw new Error("Empty array not padded correctly");
            }
        }
    },

    {
        description: 'standardizeArrays should return empty array when input is empty',
        test: () => {
            const result = standardizeArrays({ arrays: [] });

            if (!Array.isArray(result) || result.length !== 0) {
                throw new Error(`Expected empty array, but got ${JSON.stringify(result)}`);
            }
        }
    },

    {
        description: 'standardizeArrays should return empty array when input is not an array',
        test: () => {
            const result = standardizeArrays({ arrays: "not an array" });

            if (!Array.isArray(result) || result.length !== 0) {
                throw new Error(`Expected empty array, but got ${JSON.stringify(result)}`);
            }
        }
    },

    {
        description: 'standardizeArrays should not modify original arrays',
        test: () => {
            const original = [
                [1, 2],
                ['a', 'b', 'c']
            ];

            const originalCopy = JSON.stringify(original);

            standardizeArrays({ arrays: original });

            if (JSON.stringify(original) !== originalCopy) {
                throw new Error("Original arrays should not be modified");
            }
        }
    },

    // {
    //     description: 'standardizeArrays should handle arrays with mixed data types',
    //     test: () => {
    //         const arrays = [
    //             [1, "string", true, { key: "value" }],
    //             [null, undefined, 42]
    //         ];

    //         const result = standardizeArrays({ arrays });

    //         if (result[0].length !== 4 || result[1].length !== 4) {
    //             throw new Error("Arrays not standardized to correct length");
    //         }

    //         if (result[0][1] !== "string" || result[0][3].key !== "value" ||
    //             result[1][0] !== null || result[1][1] !== undefined || result[1][3] !== null) {
    //             throw new Error("Values not preserved correctly");
    //         }
    //     }
    // },

    {
        description: 'standardizeArrays should handle target length shorter than longest array',
        test: () => {
            const arrays = [
                [1, 2, 3, 4, 5],
                ['a', 'b']
            ];

            const result = standardizeArrays(arrays, { targetLength: 3 });

            // Should truncate to specified length
            const allCorrectLength = result.every(arr => arr.length === 3);
            if (!allCorrectLength) {
                throw new Error(`Expected all arrays to have length 3, but got lengths: ${result.map(arr => arr.length)}`);
            }

            // First array should be truncated
            if (result[0].length !== 3 || result[0][0] !== 1 || result[0][2] !== 3) {
                throw new Error("Long array not truncated correctly");
            }

            // Second array should be padded
            if (result[1].length !== 3 || result[1][0] !== 'a' || result[1][2] !== null) {
                throw new Error("Short array not padded correctly");
            }
        }
    },

    {
        description: 'standardizeArrays should handle target length of zero',
        test: () => {
            const arrays = [
                [1, 2, 3],
                ['a', 'b']
            ];

            const result = standardizeArrays({
                arrays,
                targetLength: 0
            });

            const allEmpty = result.every(arr => arr.length === 0);
            if (!allEmpty) {
                throw new Error(`Expected all arrays to be empty, but got lengths: ${result.map(arr => arr.length)}`);
            }
        }
    },

    {
        description: 'Performance: standardizeArrays should handle large arrays efficiently',
        test: () => {
            const size = 10000;
            const largeArray = Array.from({ length: size }, (_, i) => i);
            const smallArray = [1, 2, 3];

            const startTime = new Date().getTime();
            const result = standardizeArrays([largeArray, smallArray]);
            const endTime = new Date().getTime();

            if (result[0].length !== size || result[1].length !== size) {
                throw new Error(`Arrays not standardized to correct length: ${result[0].length}, ${result[1].length}`);
            }

            // Check performance (should be under 1 second for 10000 elements)
            const elapsedMs = endTime - startTime;
            if (elapsedMs > 1000) {
                throw new Error(`standardizeArrays operation took too long: ${elapsedMs}ms`);
            }
        }
    }
];