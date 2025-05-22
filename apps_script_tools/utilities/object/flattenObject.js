/**
 * @function flattenObject
 * @description Recursively flattens the values of an object into a single array. Handles nested objects, arrays, and 
 *              primitive values. `null` and `undefined` are included as-is in the flattened array.
 * @param {Object} obj - The object to flatten.
 * @returns {Array<*>} An array containing all values from the object and its nested structures, flattened to a single level.
 * @example
 * // Flattening an object with nested values
 * const data = { a: 1, b: [2, 3], c: { d: 4, e: [5, 6] } };
 * console.log(flattenObject(data)); // Output: [1, 2, 3, 4, 5, 6]
 *
 * // Handling null and undefined values
 * const dataWithNulls = { a: null, b: [undefined, 3], c: { d: null } };
 * console.log(flattenObject(dataWithNulls)); // Output: [null, undefined, 3, null]
 *
 * // Empty object
 * console.log(flattenObject({})); // Output: []
 *
 * @note
 * - Behavior:
 *   - Arrays within the object are flattened into the result.
 *   - Nested objects are recursively flattened.
 *   - Primitive values are directly included in the output array.
 *   - `null` and `undefined` are preserved as-is.
 * - Time Complexity: O(n), where `n` is the total number of nested values in the object.
 * - Space Complexity: O(n), as the resulting array contains all the values.
 */
function flattenObject(obj) {
  return Object.values(obj).reduce((acc, value) => {
    if (value === null || value === undefined) {
      return [...acc, value];
    } else if (Array.isArray(value)) {
      return [...acc, ...value];
    } else if (typeof value === 'object') {
      return [...acc, ...flattenObject(value)];
    } else {
      return [...acc, value];
    }
  }, []);
};
