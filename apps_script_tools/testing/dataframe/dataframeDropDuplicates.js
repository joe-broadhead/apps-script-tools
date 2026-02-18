DATAFRAME_DROP_DUPLICATES_TESTS = [
    {
        description: 'Basic: DataFrame.dropDuplicates() should remove exact duplicate rows',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 1, name: 'Alice' },  // Duplicate
                { id: 3, name: 'Charlie' }
            ]);

            const result = df.dropDuplicates();

            // Check row count
            if (result.len() !== 3) {
                throw new Error(`Expected 3 rows after removing duplicates, but got ${result.len()}`);
            }

            // Check preserved values - first occurrence should be kept
            const ids = result.id.array;
            if (ids[0] !== 1 || ids[1] !== 2 || ids[2] !== 3) {
                throw new Error(`Expected ids [1, 2, 3], but got ${ids}`);
            }
        }
    },

    {
        description: 'DataFrame.dropDuplicates() with subset should remove duplicates based only on specified columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', city: 'New York' },
                { id: 2, name: 'Bob', city: 'Chicago' },
                { id: 3, name: 'Alice', city: 'Boston' },  // Duplicate name only
                { id: 4, name: 'Charlie', city: 'Chicago' }  // Duplicate city only
            ]);

            // Deduplicate based on name column only
            const resultByName = df.dropDuplicates(['name']);

            if (resultByName.len() !== 3) {
                throw new Error(`Expected 3 rows after deduplicating by name, but got ${resultByName.len()}`);
            }

            // First occurrence of each name should be kept
            const nameIds = resultByName.id.array;
            if (!nameIds.includes(1) || !nameIds.includes(2) || !nameIds.includes(4)) {
                throw new Error(`Deduplication by name failed, got ids: ${nameIds}`);
            }

            // Deduplicate based on city column only
            const resultByCity = df.dropDuplicates(['city']);

            if (resultByCity.len() !== 3) {
                throw new Error(`Expected 3 rows after deduplicating by city, but got ${resultByCity.len()}`);
            }

            // Check cities
            const cities = resultByCity.city.array;
            if (cities.filter(c => c === 'Chicago').length !== 1) {
                throw new Error(`Expected 'Chicago' to appear once after deduplication, but appeared ${cities.filter(c => c === 'Chicago').length} times`);
            }
        }
    },

    {
        description: 'DataFrame.dropDuplicates() with multiple subset columns',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', city: 'New York', age: 30 },
                { id: 2, name: 'Bob', city: 'Chicago', age: 25 },
                { id: 3, name: 'Alice', city: 'New York', age: 35 },  // Duplicate name+city
                { id: 4, name: 'Charlie', city: 'Boston', age: 30 }   // Duplicate age only
            ]);

            // Deduplicate based on name and city columns
            const result = df.dropDuplicates(['name', 'city']);

            if (result.len() !== 3) {
                throw new Error(`Expected 3 rows after deduplicating by name+city, but got ${result.len()}`);
            }

            // Should keep id 1, 2, 4
            const ids = result.id.array;
            if (!ids.includes(1) || !ids.includes(2) || !ids.includes(4)) {
                throw new Error(`Expected ids 1, 2, 4 after deduplicating by name+city, but got ${ids}`);
            }

            // Should remove id 3
            if (ids.includes(3)) {
                throw new Error(`Expected id 3 to be removed as duplicate, but it was kept`);
            }
        }
    },

    {
        description: 'DataFrame.dropDuplicates() should handle DataFrame with no duplicates',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' }
            ]);

            const result = df.dropDuplicates();

            if (result.len() !== df.len()) {
                throw new Error(`Expected DataFrame with no duplicates to remain unchanged`);
            }

            // Check all values preserved
            const resultIds = result.id.array;
            const originalIds = df.id.array;

            for (let i = 0; i < originalIds.length; i++) {
                if (resultIds[i] !== originalIds[i]) {
                    throw new Error(`Expected values to be preserved at same positions`);
                }
            }
        }
    },

    {
        description: 'DataFrame.dropDuplicates() should handle null/undefined values correctly',
        test: () => {
            const df = DataFrame.fromRecords([
                { id: 1, name: 'Alice', age: null },
                { id: 2, name: 'Bob', age: 25 },
                { id: 3, name: null, age: 30 },
                { id: 4, name: null, age: 30 },  // Duplicate null+30
                { id: 5, name: 'Alice', age: null }  // Duplicate Alice+null
            ]);

            // Deduplicate considering all columns
            const result = df.dropDuplicates();

            if (result.len() !== 5) {
                throw new Error(`Expected 5 rows after removing duplicates with null values, but got ${result.len()}`);
            }

            // Deduplicate with subset including column with nulls
            const resultByNameAge = df.dropDuplicates(['name', 'age']);

            if (resultByNameAge.len() !== 3) {
                throw new Error(`Expected 3 rows after deduplicating by name+age, but got ${resultByNameAge.len()}`);
            }

            // Should treat null values as equal for deduplication purposes
            const nullCount = resultByNameAge.name.array.filter(n => n === null).length;
            if (nullCount !== 1) {
                throw new Error(`Expected exactly 1 null name after deduplication, but got ${nullCount}`);
            }

            // Should treat null values as equal for non-subset columns too
            const aliceCount = resultByNameAge.name.array.filter(n => n === 'Alice').length;
            if (aliceCount !== 1) {
                throw new Error(`Expected exactly 1 'Alice' after deduplication, but got ${aliceCount}`);
            }
        }
    },

    {
        description: 'DataFrame.dropDuplicates() should preserve column order',
        test: () => {
            const df = DataFrame.fromRecords([
                { c: 3, a: 'x', b: true },
                { c: 1, a: 'y', b: false },
                { c: 1, a: 'y', b: false }  // Duplicate
            ]);

            const result = df.dropDuplicates();

            // Check columns are in original order
            if (JSON.stringify(result.columns) !== JSON.stringify(['c', 'a', 'b'])) {
                throw new Error(`Expected columns to remain in order ['c', 'a', 'b'], but got ${JSON.stringify(result.columns)}`);
            }
        }
    },

    {
        description: 'DataFrame.dropDuplicates() should handle complex data types',
        test: () => {
            const date1 = new Date('2023-01-15');
            const date2 = new Date('2023-02-20');

            const df = DataFrame.fromRecords([
                { id: 1, date: date1, nested: { key: 'value' } },
                { id: 2, date: date2, nested: { key: 'other' } },
                { id: 3, date: new Date('2023-01-15'), nested: { key: 'value' } }  // Similar but not reference equal
            ]);

            const result = df.dropDuplicates();

            // Should match by value, not by reference
            if (result.len() !== 3) {
                throw new Error(`Expected 3 rows after removing duplicate date/object (by value), but got ${result.len()}`);
            }
        }
    }
];
