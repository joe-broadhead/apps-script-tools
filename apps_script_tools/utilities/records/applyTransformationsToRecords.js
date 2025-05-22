/**
 * @function applyTransformationsToRecords
 * @description Applies a set of transformations to an array of records (objects) based on a provided transformation schema.
 *              Each record is processed to modify its values according to the specified transformations.
 * @param {Array<Object>} records - An array of objects representing the records to transform.
 * @param {Object} transformationSchema - An object where keys correspond to record keys and values are either functions 
 *                                        (to transform the value) or direct replacements.
 * @returns {Array<Object>} A new array of transformed records, with each record updated based on the transformation schema.
 * @example
 * // Example records and transformation schema
 * const records = [
 *   { id: 1, name: "John", age: 25 },
 *   { id: 2, name: "Jane", age: 30 }
 * ];
 * const transformationSchema = {
 *   age: (record) => record.age + 1,
 *   name: "Anonymous"
 * };
 * 
 * const transformedRecords = applyTransformationsToRecords(records, transformationSchema);
 * console.log(transformedRecords);
 * // Output: [
 * //   { id: 1, name: "Anonymous", age: 26 },
 * //   { id: 2, name: "Anonymous", age: 31 }
 * // ]
 *
 * @see applyTransformationsToObject
 * @note
 * - Behavior:
 *   - The function uses `applyTransformationsToObject` to process each individual record based on the transformation schema.
 *   - Transformations can be functions (applied to the entire record) or direct value replacements.
 * - Time Complexity: O(n * m), where `n` is the number of records and `m` is the number of keys in each record's schema.
 * - Space Complexity: O(n), as a new array of transformed records is created.
 */
function applyTransformationsToRecords(records, transformationSchema) {
  return records.map(record => applyTransformationsToObject(record, transformationSchema));
};
