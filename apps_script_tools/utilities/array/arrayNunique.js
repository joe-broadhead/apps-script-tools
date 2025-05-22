/**
 * @function arrayNunique
 * @description Counts the number of unique elements in an array. This method uses a `Set` to determine uniqueness.
 * @param {Array} array - The input array containing numeric, string, or mixed values.
 * @returns {Number} The number of unique elements in the array.
 * @example
 * const array = [1, 2, 2, 3, "a", "a", true, false];
 * console.log(arrayNunique(array)); // Output: 6 (unique values are [1, 2, 3, "a", true, false])
 *
 * const emptyArray = [];
 * console.log(arrayNunique(emptyArray)); // Output: 0
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is added to the `Set` in linear time.
 * - Space Complexity: O(k), where `k` is the number of unique elements in the array. The `Set` stores each unique value.
 */
function arrayNunique(array) {
  return new Set(array).size;
};
