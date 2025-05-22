/**
 * @function arrayMean
 * @description Computes the mean (average) of an array. Handles various types of input values, such as booleans, 
 *              `null`, and `undefined`. Optionally excludes `null` and `undefined` values from the calculation.
 * @param {Array} array - The input array containing numeric, boolean, or mixed values.
 * @param {boolean} [excludeNulls = true] - Whether to exclude `null` and `undefined` values from the calculation. 
 *                                        If `false`, they are treated as zero.
 * @returns {Number|Null} The mean of the valid numeric values in the array, or `null` if no valid numbers are present.
 * @example
 * const array = [1, 2, null, true, "3"];
 * console.log(arrayMean(array)); // Output: 1.75 (null is excluded, true is treated as 1)
 *
 * const arrayWithNulls = [1, null, 3];
 * console.log(arrayMean(arrayWithNulls, false)); // Output: 1.3333 (null is treated as 0)
 *
 * const emptyArray = [];
 * console.log(arrayMean(emptyArray)); // Output: null
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is visited once.
 * - Space Complexity: O(1), as only a single accumulator object is used to track the sum and count.
 */
function arrayMean(array, excludeNulls = true) {
  const { sum, count } = array.reduce(
    (acc, value) => {
      if (value === null || value === undefined) {
        if (excludeNulls) return acc;
        acc.sum += 0;
        acc.count++;
        return acc;
      }

      if (value === true) value = 1;
      if (value === false) value = 0;

      const num = normalizeValues(value);
      if (num !== null) {
        acc.sum += num;
        acc.count++;
      }
      return acc;
    },
    { sum: 0, count: 0 }
  );
  return count > 0 ? sum / count : null;
};
