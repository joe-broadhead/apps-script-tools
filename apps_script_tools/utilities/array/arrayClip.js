/**
 * @function arrayClip
 * @description Clips the values of an array to lie within a specified range. Any value below the `lower` bound
 *              is set to `lower`, and any value above the `upper` bound is set to `upper`.
 * @param {Array} array - The array of values to be clipped.
 * @param {Number} [lower = -Infinity] - The lower bound of the range. Defaults to `-Infinity`, meaning no lower limit.
 * @param {Number} [upper = Infinity] - The upper bound of the range. Defaults to `Infinity`, meaning no upper limit.
 * @returns {Array} A new array with the clipped values.
 * @example
 * const array = [1, -5, 10, 15];
 * const clippedArray = arrayClip(array, 0, 10);
 * console.log(clippedArray); // Output: [1, 0, 10, 10]
 * @see arrayApply
 * @see clipValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is visited once.
 * - Space Complexity: O(n), as the output array contains all elements of the input array, transformed.
 */
function arrayClip(array, lower = -Infinity, upper = Infinity) {
  return arrayApply(array, [[clipValues, lower, upper]]);
};
