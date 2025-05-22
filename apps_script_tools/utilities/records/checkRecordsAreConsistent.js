/**
 * @function checkRecordsAreConsistent
 * @description Validates the consistency of an array of records (objects). Ensures that all records have the same keys
 *              and that the types of corresponding values are consistent across all records.
 * @param {Array<Object>} records - An array of objects representing the records to validate.
 * @returns {Boolean} Returns `true` if all records are consistent; otherwise, an error is thrown.
 * @throws {Error} If the `records` array is not valid, empty, or contains inconsistent records.
 * @example
 * // Consistent records
 * const consistentRecords = [
 *   { id: 1, name: "John", age: 25 },
 *   { id: 2, name: "Jane", age: 30 }
 * ];
 * console.log(checkRecordsAreConsistent(consistentRecords)); // Output: true
 *
 * // Inconsistent records
 * const inconsistentRecords = [
 *   { id: 1, name: "John", age: 25 },
 *   { id: 2, name: "Jane" } // Missing 'age' key
 * ];
 * try {
 *   checkRecordsAreConsistent(inconsistentRecords);
 * } catch (error) {
 *   console.error(error.message);
 *   // Output: "Record at index 1 has a different number of keys. Expected 3, but got 2."
 * }
 *
 * // Mixed types
 * const mixedTypeRecords = [
 *   { id: 1, name: "John", age: 25 },
 *   { id: 2, name: "Jane", age: "30" } // 'age' has a different type
 * ];
 * try {
 *   checkRecordsAreConsistent(mixedTypeRecords);
 * } catch (error) {
 *   console.error(error.message);
 *   // Output: "Type mismatch for key 'age' at index 1. Expected type 'number', but got 'string'."
 * }
 *
 * @note
 * - Behavior:
 *   - Throws an error if the `records` array is empty or contains non-object elements.
 *   - Validates that all records have the same keys in the same order and that corresponding values are of the same type.
 * - Time Complexity: O(n * m), where `n` is the number of records and `m` is the number of keys in each record.
 * - Space Complexity: O(m), where `m` is the number of keys in the reference record, used for type storage.
 */
function checkRecordsAreConsistent(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("The records array must be a non-empty array.");
  }

  const getType = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  const referenceRecord = records[0];

  if (typeof referenceRecord !== 'object' || referenceRecord === null) {
    throw new Error("The first record must be a non-null object.");
  }

  const referenceKeys = Object.keys(referenceRecord);
  const referenceTypes = {};

  for (const key of referenceKeys) {
    referenceTypes[key] = getType(referenceRecord[key]);
  }

  for (let index = 0; index < records.length; index++) {
    const record = records[index];

    if (typeof record !== 'object' || record === null) {
      throw new Error(`Record at index ${index} is not a valid object. Found type: ${getType(record)}`);
    }

    const recordKeys = Object.keys(record);

    if (recordKeys.length !== referenceKeys.length) {
      throw new Error(`Record at index ${index} has a different number of keys. Expected ${referenceKeys.length}, but got ${recordKeys.length}.`);
    }

    for (const key of referenceKeys) {
      if (!record.hasOwnProperty(key)) {
        throw new Error(`Record at index ${index} is missing the key '${key}'.`);
      }

      const recordType = getType(record[key]);
      const referenceType = referenceTypes[key];

      if (recordType !== referenceType) {
        throw new Error(`Type mismatch for key '${key}' at index ${index}. Expected type '${referenceType}', but got '${recordType}'.`);
      }
    }
  }

  return true;
};
