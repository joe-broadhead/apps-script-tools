/**
 * @function coerceValues
 * @description Converts a value to a specified type. Handles conversion to `integer`, `float`, `number`, `boolean`, and `string`, `date`.
 *              Invalid values (`null`, `undefined`, or `NaN`) are coerced to `null`.
 * @param {*} value - The value to be coerced.
 * @param {String} type - The target type to which the value should be coerced. Supported types are:
 *   - `'integer'`: Converts the value to an integer.
 *   - `'float'`: Converts the value to a floating-point number.
 *   - `'number'`: Converts the value to a number.
 *   - `'boolean'`: Converts the value to a boolean.
 *   - `'string'`: Converts the value to a string.
 *   - `'date'`: Converts the value to a date object.
 * @returns {*} The value converted to the specified type, or `null` if the value cannot be converted.
 * @throws {Error} If an unsupported type is specified.
 * @example
 * // Coercing to integer
 * console.log(coerceValues("42", "integer")); // Output: 42
 * console.log(coerceValues(null, "integer")); // Output: null
 *
 * // Coercing to float
 * console.log(coerceValues("3.14", "float")); // Output: 3.14
 *
 * // Coercing to boolean
 * console.log(coerceValues(0, "boolean")); // Output: false
 * console.log(coerceValues("hello", "boolean")); // Output: true
 *
 * // Coercing to string
 * console.log(coerceValues(123, "string")); // Output: "123"
 *
 * @see normalizeValues
 * @note
 * - Time Complexity: O(1), as each coercion involves a constant number of operations.
 * - Space Complexity: O(1), as no additional data structures are created.
 */
function coerceValues(value, type) {
  switch (type) {
    case 'integer':
      const intVal = parseInt(normalizeValues(value), 10);
      return isNaN(intVal) ? null : intVal;
    case 'float':
      const floatVal = parseFloat(normalizeValues(value));
      return isNaN(floatVal) ? null : floatVal;
    case 'number':
      const numberVal = parseFloat(normalizeValues(value));
      return isNaN(numberVal) ? null : numberVal;
    case 'boolean':
      if (value === null || value === undefined || Number.isNaN(value)) return null;
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
      }
      return !!value;
    case 'string':
      return value === null || value === undefined || Number.isNaN(value) ? null : String(value);
    case 'date':
      if (value === null || value === undefined) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    default:
      throw new Error(`Unsupported type: ${type}`);
  };
};
