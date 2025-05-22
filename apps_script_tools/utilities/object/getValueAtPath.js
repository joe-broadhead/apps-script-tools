/**
 * @function getValueAtPath
 * @description Retrieves the value at a specified path within a nested object. The path is represented as an array of keys.
 *              If any key in the path does not exist, the function returns `null`.
 * @param {Object} obj - The object to retrieve the value from.
 * @param {Array<String>} path - An array of strings representing the path to the desired value within the object.
 * @returns {*} The value at the specified path, or `null` if the path does not exist or is invalid.
 * @example
 * // Simple object lookup
 * const data = { a: { b: { c: 42 } } };
 * console.log(getValueAtPath(data, ['a', 'b', 'c'])); // Output: 42
 *
 * // Handling non-existent paths
 * console.log(getValueAtPath(data, ['a', 'b', 'd'])); // Output: null
 *
 * // Empty path
 * console.log(getValueAtPath(data, [])); // Output: null
 *
 * // Handling null or undefined inputs
 * console.log(getValueAtPath(null, ['a', 'b'])); // Output: null
 * console.log(getValueAtPath(data, ['a', 'x'])); // Output: null
 *
 * @note
 * - Behavior:
 *   - If the path is empty, the function immediately returns `null`.
 *   - The function gracefully handles cases where the input object or path does not exist.
 * - Time Complexity: O(p), where `p` is the length of the path. Each key is accessed sequentially.
 * - Space Complexity: O(1), as no additional data structures are created.
 */
function getValueAtPath(obj, path) {
  if (path.length === 0) {
    return null;
  }
  return path.reduce((current, key) => {
    if (current && current.hasOwnProperty(key)) {
      return current[key];
    } else {
      return null;
    }
  }, obj);
};
