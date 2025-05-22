/**
 * @function standardizeRecords
 * @description Standardizes an array of records (objects) by ensuring that all records contain the same set of keys. 
 *              Missing keys are added to each record and assigned a default value.
 * @param {Array<Object>} records - An array of objects representing the records to be standardized.
 * @param {*} [defaultValue = null] - The value to assign to missing keys. Defaults to `null`.
 * @param {Boolean} [modifyInPlace = false] - If `true`, modifies the original records in place. Otherwise, creates and returns
 *                                          new standardized records.
 * @returns {Array<Object>} A new array of standardized records or the modified original array if `modifyInPlace` is `true`.
 * @throws {Error} If the input is not an array or if any record is not a non-null object.
 * @example
 * // Example records
 * const records = [
 *   { id: 1, name: "John" },
 *   { id: 2, age: 25 },
 *   { id: 3 }
 * ];
 *
 * // Standardize records with default value `null`
 * const standardized = standardizeRecords(records);
 * console.log(standardized);
 * // Outputs:
 * // [
 * //   { id: 1, name: "John", age: null },
 * //   { id: 2, name: null, age: 25 },
 * //   { id: 3, name: null, age: null }
 * // ]
 *
 * // Standardize records with a default value of `0`
 * const standardizedWithDefault = standardizeRecords(records, 0);
 * console.log(standardizedWithDefault);
 * // Outputs:
 * // [
 * //   { id: 1, name: "John", age: 0 },
 * //   { id: 2, name: 0, age: 25 },
 * //   { id: 3, name: 0, age: 0 }
 * // ]
 *
 * // Modify records in place
 * const recordsToModify = [{ id: 1 }, { name: "Jane" }];
 * standardizeRecords(recordsToModify, "N/A", true);
 * console.log(recordsToModify);
 * // Outputs:
 * // [
 * //   { id: 1, name: "N/A" },
 * //   { id: null, name: "Jane" }
 * // ]
 *
 * @note
 * - Behavior:
 *   - Collects all keys from all records to create a complete set of keys.
 *   - Fills missing keys in each record with the specified default value.
 *   - Maintains key insertion order from the original records.
 *   - Supports both in-place modification and creation of new standardized records.
 * - Time Complexity: O(n * m), where `n` is the number of records and `m` is the average number of keys per record.
 * - Space Complexity: O(k), where `k` is the total number of unique keys across all records.
 */
function standardizeRecords(records, defaultValue = null, modifyInPlace = false) {
  if (!Array.isArray(records)) {
    throw new Error("Input must be an array of objects.");
  }

  const allKeys = [];
  const keySet = new Set();

  for (const record of records) {
    if (typeof record !== 'object' || record === null) {
      throw new Error("All records must be non-null objects.");
    }

    for (const key in record) {
      if (!keySet.has(key)) {
        keySet.add(key);
        allKeys.push(key); // Maintain insertion order
      }
    }
  }

  return records.map(record => {
    const targetRecord = modifyInPlace ? record : {};
    for (const key of allKeys) {
      targetRecord[key] = record[key] !== undefined ? record[key] : defaultValue;
    }
    return targetRecord;
  });
};
