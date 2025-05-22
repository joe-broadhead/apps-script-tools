/**
 * @function applySchemaToRecords
 * @description Applies a schema transformation to an array of records (objects). Each record is processed by 
 *              applying the schema to ensure its values conform to the specified types or formats.
 * @param {Array<Object>} records - An array of objects representing the records to transform.
 * @param {Object} schema - An object representing the schema, where keys correspond to record keys and values 
 *                          specify the desired type or transformation for the associated key.
 * @returns {Array<Object>} A new array of transformed records, where each record conforms to the given schema.
 * @example
 * // Example records and schema
 * const records = [
 *   { id: "1", name: "John", age: "25" },
 *   { id: "2", name: "Jane", age: "30" }
 * ];
 * const schema = { id: "integer", age: "float" };
 * 
 * const transformedRecords = applySchemaToRecords(records, schema);
 * console.log(transformedRecords);
 * // Output: [
 * //   { id: 1, name: "John", age: 25 },
 * //   { id: 2, name: "Jane", age: 30 }
 * // ]
 *
 * @see applySchemaToObject
 * @note
 * - Behavior:
 *   - The function uses `applySchemaToObject` to apply the schema to each individual record.
 *   - Records that do not conform to the schema are adjusted, but their structure is preserved.
 * - Time Complexity: O(n * m), where `n` is the number of records and `m` is the number of keys in each record.
 * - Space Complexity: O(n), as a new array of transformed records is created.
 */
function applySchemaToRecords(records, schema) {
  return records.map(record => applySchemaToObject(record, schema));
};
