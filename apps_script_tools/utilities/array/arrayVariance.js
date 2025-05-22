/**
 * @function arrayVariance
 * @description Computes the variance of numeric values in an array. Uses Welford's online algorithm for numerical stability.
 *              Ignores `null`, `undefined`, and non-numeric values. Variance is calculated as the average squared deviation from the mean.
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number|Null} The variance of the valid numeric values in the array, or `null` if there are fewer than two valid numbers.
 * @example
 * const array = [1, 2, 3, null, "invalid"];
 * console.log(arrayVariance(array)); // Output: 1 (valid numbers are [1, 2, 3], variance is 1)
 *
 * const insufficientData = [null, undefined];
 * console.log(arrayVariance(insufficientData)); // Output: null
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is processed once.
 * - Space Complexity: O(1), as only a few variables are used to track the variance computation.
 */
function arrayVariance(array) {
  let count = 0;
  let mean = 0;
  let m2 = 0;

  for (const value of array) {
    const num = normalizeValues(value);
    if (num !== null) {
      count++;
      const delta = num - mean;
      mean += delta / count;
      const delta2 = num - mean;
      m2 += delta * delta2;
    }
  }

  return count < 2 ? null : m2 / (count - 1);
};
