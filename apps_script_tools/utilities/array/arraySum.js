/**
 * @function arraySum
 * @description Computes the sum of numeric values in an array. Ignores `null`, `undefined`, and non-numeric values.
 *              Non-numeric values are normalized before being included in the sum.
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number} The sum of the valid numeric values in the array.
 * @example
 * const array = [1, 2, "3", null, "invalid"];
 * console.log(arraySum(array)); // Output: 6 (valid numbers are [1, 2, 3])
 *
 * const emptyArray = [];
 * console.log(arraySum(emptyArray)); // Output: 0
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is processed once.
 * - Space Complexity: O(1), as only a single variable is used to accumulate the sum.
 */
function arraySum(array) {
  return array.reduce((sum, value) => {
    const num = normalizeValues(value);
    return num !== null ? sum + num : sum;
  }, 0);
};
