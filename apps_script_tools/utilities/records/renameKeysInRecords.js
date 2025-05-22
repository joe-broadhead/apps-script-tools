/**
 * @function removeDuplicatesFromRecords
 * @description Removes duplicate records from an array of objects based on specified keys. If no keys are specified, all keys 
 *              in each record are used to determine uniqueness.
 * @param {Array<Object>} records - An array of objects (records) to process for duplicates.
 * @param {Array<String>} [keys = []] - An optional array of keys to use for determining uniqueness. If empty, all keys 
 *                                    in the records are considered, sorted for consistency.
 * @returns {Array<Object>} A new array containing only unique records based on the specified keys or all keys if none are specified.
 * @example
 * // Example input records
 * const records = [
 *   { id: 1, name: "John", age: 30 },
 *   { id: 2, name: "Jane", age: 25 },
 *   { id: 1, name: "John", age: 30 }, // Duplicate of the first record
 *   { id: 3, name: "Jane", age: 25 }  // Different id but duplicate name and age
 * ];
 *
 * // Remove duplicates using all keys
 * const uniqueRecords = removeDuplicatesFromRecords(records);
 * console.log(uniqueRecords);
 * // Outputs:
 * // [
 * //   { id: 1, name: "John", age: 30 },
 * //   { id: 2, name: "Jane", age: 25 },
 * //   { id: 3, name: "Jane", age: 25 }
 * // ]
 *
 * // Remove duplicates using specific keys
 * const uniqueByName = removeDuplicatesFromRecords(records, ["name", "age"]);
 * console.log(uniqueByName);
 * // Outputs:
 * // [
 * //   { id: 1, name: "John", age: 30 },
 * //   { id: 2, name: "Jane", age: 25 }
 * // ]
 *
 * @see recordsToNewlineJson - For another method of deduplication during serialization.
 * @note
 * - Behavior:
 *   - If `keys` is empty, all keys are used, sorted for consistent composite key generation.
 *   - Uses a `Set` to efficiently track and filter duplicates.
 * - Time Complexity: O(n * m), where `n` is the number of records and `m` is the number of keys used for uniqueness.
 * - Space Complexity: O(n), as a `Set` is used to store composite keys for deduplication.
 */
function renameKeysInRecords(records, keyMapping) {
  return records.map(record => renameKeysInObject(record, keyMapping));
};
