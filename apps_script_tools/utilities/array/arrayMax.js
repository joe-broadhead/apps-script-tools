/**
 * @function arrayMax
 * @description Finds the maximum value in an array. The function normalizes values before comparison, ignoring `null`,
 *              `undefined`, and invalid values (normalized to `null`).
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number|Undefined} The maximum value in the array, or `undefined` if no valid numbers are present.
 * @example
 * const array = [1, 2, "3", null, "invalid"];
 * console.log(arrayMax(array)); // Output: 3
 *
 * const emptyArray = [];
 * console.log(arrayMax(emptyArray)); // Output: undefined
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is visited once.
 * - Space Complexity: O(1), as only a single variable is used to track the maximum value.
 */
function arrayMax(array) {
  return array.reduce((max, value) => {
    const num = normalizeValues(value);
    if (num !== null) {
      return max === undefined ? num : Math.max(max, num);
    };
    return max;
  }, undefined);
};
