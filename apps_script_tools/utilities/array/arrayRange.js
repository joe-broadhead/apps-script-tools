/**
 * @function arrayRange
 * @description Calculates the range (difference between the maximum and minimum values) of an array. 
 *              Normalizes values before comparison and ignores `null`, `undefined`, or invalid values.
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number|Null} The range of valid numeric values in the array, or `null` if there are no valid numbers.
 * @example
 * const array = [3, 1, "5", null, "invalid"];
 * console.log(arrayRange(array)); // Output: 4 (valid numbers are [1, 3, 5], range is 5 - 1)
 *
 * const emptyArray = [];
 * console.log(arrayRange(emptyArray)); // Output: null
 *
 * const singleValueArray = [10];
 * console.log(arrayRange(singleValueArray)); // Output: 0 (range is 10 - 10)
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is processed once.
 * - Space Complexity: O(1), as only a single object is used to track the min and max values.
 */
function arrayRange(array) {
  const { min, max } = array.reduce(
    (acc, value) => {
      const num = normalizeValues(value);
      if (num !== null) {
        acc.min = Math.min(acc.min, num);
        acc.max = Math.max(acc.max, num);
      }
      return acc;
    },
    { min: Infinity, max: -Infinity }
  );
  return min === Infinity || max === -Infinity ? null : max - min;
};
