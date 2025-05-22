/**
 * @function arrayRolling
 * @description Computes a rolling operation (e.g., mean, sum, min, max) over an array using a specified window size.
 *              For indices where the window size cannot be fully formed, `null` is returned.
 * @param {Array} array - The input array of numeric or mixed values.
 * @param {Number} windowSize - The size of the rolling window. Must be greater than 0 and less than or equal to the array length.
 * @param {String} [operation = "mean"] - The rolling operation to apply. Options are:
 *   - `'mean'`: Computes the rolling average.
 *   - `'sum'`: Computes the rolling sum.
 *   - `'min'`: Finds the rolling minimum value.
 *   - `'max'`: Finds the rolling maximum value.
 * @returns {Array} An array containing the results of the rolling operation, with `null` for indices where the window size cannot be formed.
 * @throws {Error} If an invalid window size or operation is provided.
 * @example
 * const array = [1, 2, 3, 4, 5];
 *
 * // Rolling mean with a window size of 3
 * console.log(arrayRolling(array, 3, 'mean')); // Output: [null, null, 2, 3, 4]
 *
 * // Rolling sum with a window size of 2
 * console.log(arrayRolling(array, 2, 'sum')); // Output: [null, 3, 5, 7, 9]
 *
 * // Rolling min with a window size of 3
 * console.log(arrayRolling(array, 3, 'min')); // Output: [null, null, 1, 2, 3]
 *
 * @see arrayMean
 * @see arraySum
 * @see arrayMin
 * @see arrayMax
 * @note
 * - Time Complexity: O(n * w), where `n` is the length of the input array, and `w` is the window size. Each window is processed separately.
 * - Space Complexity: O(w), as a slice of size `w` is created for each operation.
 */
function arrayRolling(array, windowSize, operation = "mean") {
  if (array.length === 0) {
    return [];
  };

  if (windowSize <= 0 || windowSize > array.length) {
    throw new Error("Invalid window size");
  };

  const operations = {
    mean: arrayMean,
    sum: arraySum,
    min: arrayMin,
    max: arrayMax,
  };

  if (!operations[operation]) {
    throw new Error("Invalid operation. Choose 'mean', 'sum', 'min', or 'max'.");
  };

  return array.map((_, idx, arr) => {
    if (idx < windowSize - 1) return null; // Not enough elements for a full window
    const window = arr.slice(idx - windowSize + 1, idx + 1);
    return operations[operation](window);
  });
};
