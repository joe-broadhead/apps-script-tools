/**
 * @function applySchemaToObject
 * @description Applies a schema to an object by coercing its values to specified types. If a key in the schema 
 *              is not present in the object, an error is thrown. Returns a new object with the coerced values.
 * @param {Object} object - The input object whose values are to be coerced.
 * @param {Object} schema - The schema defining the expected types for each key in the object. The schema should be an object where:
 *   - Keys are the property names in the input object.
 *   - Values are the expected types (e.g., `'integer'`, `'float'`, `'string'`, etc.).
 * @returns {Object} A new object with values coerced according to the schema.
 * @throws {Error} If a key in the schema is not present in the input object.
 * @example
 * // Defining an object and schema
 * const obj = { id: "42", name: 123, active: "true" };
 * const schema = { id: "integer", name: "string", active: "boolean" };
 * 
 * // Applying the schema
 * const result = applySchemaToObject(obj, schema);
 * console.log(result); // Output: { id: 42, name: "123", active: true }
 *
 * // Handling unexpected schema keys
 * const invalidSchema = { id: "integer", extraKey: "string" };
 * try {
 *   applySchemaToObject(obj, invalidSchema);
 * } catch (error) {
 *   console.error(error.message); // Output: "Unexpected key: extraKey. Not present in object."
 * }
 * @see coerceValues
 * @note
 * - Time Complexity: O(n), where `n` is the number of keys in the schema. Each key is checked and processed once.
 * - Space Complexity: O(n), as a new object is created with the coerced values.
 */
function applySchemaToObject(object, schema) {

  const objectKeysSet = new Set(Object.keys(object));
  const schemaKeysSet = new Set(Object.keys(schema));

  const newObject = { ...object };
  for (const key of schemaKeysSet) {
    if (!objectKeysSet.has(key)) {
      throw new Error(`Unexpected key: ${key}. Not present in object.`);
    };
    newObject[key] = coerceValues(object[key], schema[key]);
  };
  return newObject;
};
