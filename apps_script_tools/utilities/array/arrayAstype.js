/**
 * @function arrayAstype
 * @description Converts the elements of an array to a specified type by applying a coercion function. 
 *              This method leverages `arrayApply` to transform each element of the input array.
 * @param {Array} array - The input array whose elements will be converted.
 * @param {Function} type - A constructor function representing the target type (e.g., `float`, `string`).
 * @returns {Array} A new array with elements converted to the specified type.
 * @example
 * const array = [1, 2, 3];
 * const result = arrayAstype(array, 'string');
 * console.log(result); // Output: ["1", "2", "3"]
 * @see arrayApply
 * @see coerceValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array.
 * - Space Complexity: O(n), where `n` is the size of the input array (the output array occupies the same space).
 */
function arrayAstype(array, type) {
  return arrayApply(array, [[coerceValues, type]]);
};
