/**
 * @function arrayMin
 * @description Finds the minimum value in an array. The function normalizes values before comparison, ignoring `null`,
 *              `undefined`, and invalid values (normalized to `null`).
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number|Undefined} The minimum value in the array, or `undefined` if no valid numbers are present.
 * @example
 * const array = [3, "1", null, undefined, "invalid"];
 * console.log(arrayMin(array)); // Output: 1 (valid numbers are [3, 1])
 *
 * const emptyArray = [];
 * console.log(arrayMin(emptyArray)); // Output: undefined
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is processed once.
 * - Space Complexity: O(1), as only a single variable is used to track the minimum value.
 */
function arrayMin(array) {
  return array.reduce((min, value) => {
    const num = normalizeValues(value);
    if (num !== null) {
      return min === undefined ? num : Math.min(min, num);
    };
    return min;
  }, undefined);
};
