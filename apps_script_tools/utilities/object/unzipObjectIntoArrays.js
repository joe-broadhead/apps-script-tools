/**
 * @function unzipObjectIntoArrays
 * @description Converts an object into separate arrays for its keys and values. Optionally includes a header with the keys 
 *              and allows for custom key ordering using `headerOrder`.
 * @param {Object} object - The input object to be unzipped into arrays.
 * @param {Boolean} [header=true] - Whether to include the keys as a header array in the output. Defaults to `true`.
 * @param {Array<String>} [headerOrder = []] - An optional array specifying the order of keys. If provided, the keys must exist in the object.
 * @returns {Array<Array>} An array containing either:
 *   - Both the header (keys) and values if `header` is `true`.
 *   - Only the values if `header` is `false`.
 * @throws {Error} If any key in `headerOrder` does not exist in the object.
 * @example
 * // Unzipping with default key order and header
 * const obj = { a: 1, b: 2, c: 3 };
 * console.log(unzipObjectIntoArrays(obj));
 * // Output: [['a', 'b', 'c'], [1, 2, 3]]
 *
 * // Unzipping without a header
 * console.log(unzipObjectIntoArrays(obj, false));
 * // Output: [[1, 2, 3]]
 *
 * // Unzipping with custom key order
 * console.log(unzipObjectIntoArrays(obj, true, ['c', 'a']));
 * // Output: [['c', 'a'], [3, 1]]
 *
 * // Handling missing keys in headerOrder
 * try {
 *   console.log(unzipObjectIntoArrays(obj, true, ['x', 'y']));
 * } catch (error) {
 *   console.error(error.message); // Output: 'Key "x" in headerOrder doesn't exist in the provided object.'
 * }
 * @note
 * - Time Complexity: O(n), where `n` is the number of keys in the object. The function iterates through the keys once.
 * - Space Complexity: O(n), as new arrays are created for the keys and values.
 */
function unzipObjectIntoArrays(object, header = true, headerOrder = []) {

  const keys = headerOrder.length ? headerOrder : Object.keys(object);

  keys.forEach(key => {
    if (!(key in object)) {
      throw new Error(`Key "${key}" in headerOrder doesn't exist in the provided object.`);
    };
  });

  const values = keys.map(key => object[key]);

  return header ? [keys, values] : [values];
};
