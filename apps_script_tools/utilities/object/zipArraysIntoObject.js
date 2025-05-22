/**
 * @function zipArraysIntoObject
 * @description Combines two arrays, one containing keys and the other containing corresponding values, into a single object.
 *              The two arrays must have the same length.
 * @param {Array<String>} keysArray - An array of keys for the resulting object.
 * @param {Array<*>} valuesArray - An array of values corresponding to the keys in `keysArray`.
 * @returns {Object} An object where each key from `keysArray` is paired with its corresponding value from `valuesArray`.
 * @throws {Error} If the two arrays do not have the same length.
 * @example
 * // Zipping two arrays into an object
 * const keys = ['a', 'b', 'c'];
 * const values = [1, 2, 3];
 * const result = zipArraysIntoObject(keys, values);
 * console.log(result); // Output: { a: 1, b: 2, c: 3 }
 *
 * // Handling mismatched array lengths
 * try {
 *   zipArraysIntoObject(['x', 'y'], [10]);
 * } catch (error) {
 *   console.error(error.message); // Output: "The two arrays must have the same length"
 * }
 * @note
 * - Time Complexity: O(n), where `n` is the length of the arrays. The function iterates through the `keysArray` once.
 * - Space Complexity: O(n), as a new object of size `n` is created.
 */
function zipArraysIntoObject(keysArray, valuesArray) {
  if (keysArray.length !== valuesArray.length) {
    throw new Error("The two arrays must have the same length");
  };

  return keysArray.reduce((obj, key, index) => {
    obj[key] = valuesArray[index];
    return obj;
  }, {});
};
