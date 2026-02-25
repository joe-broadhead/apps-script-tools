/**
 * @function renameKeysInRecords
 * @description Renames keys on each record using the provided key mapping.
 * @param {Array<Object>} records - Input records.
 * @param {Object} keyMapping - Mapping object where keys are original names and values are new names.
 * @returns {Array<Object>} Records with renamed keys.
 * @example
 * const records = [{ first_name: "John", last_name: "Doe" }];
 * const renamed = renameKeysInRecords(records, { first_name: "firstName", last_name: "lastName" });
 * // Output: [{ firstName: "John", lastName: "Doe" }]
 * @see renameKeysInObject
 */
function renameKeysInRecords(records, keyMapping) {
  return records.map(record => renameKeysInObject(record, keyMapping));
};
