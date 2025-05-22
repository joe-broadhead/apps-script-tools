/**
 * @function arrayStandardDeviation
 * @description Computes the standard deviation of numeric values in an array. Standard deviation is the square root 
 *              of the variance, representing the average amount by which values deviate from the mean. Ignores `null`, 
 *              `undefined`, and non-numeric values.
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number|Null} The standard deviation of the valid numeric values in the array, or `null` if there are fewer than two valid numbers.
 * @example
 * const array = [1, 2, 3, null, "invalid"];
 * console.log(arrayStandardDeviation(array)); // Output: 1 (valid numbers are [1, 2, 3])
 *
 * const insufficientData = [null, undefined];
 * console.log(arrayStandardDeviation(insufficientData)); // Output: null
 * @see arrayVariance
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Relies on `arrayVariance`, which processes each element once.
 * - Space Complexity: O(1), as only a single value (variance) is used in the computation.
 */
function arrayStandardDeviation(array) {
  const variance = arrayVariance(array);
  return variance === null ? null : Math.sqrt(variance);
};
