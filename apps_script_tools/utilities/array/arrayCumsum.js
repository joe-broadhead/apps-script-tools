/**
 * @function arrayCumsum
 * @description Computes the cumulative sum of an array. Each element in the resulting array is the sum
 *              of the current and all previous elements, ignoring `null`, `undefined`, and invalid values (normalized to `null`).
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Array} A new array containing the cumulative sums. Elements corresponding to invalid inputs are excluded.
 * @example
 * const array = [1, 2, "3", null, 4, "invalid"];
 * const result = arrayCumsum(array);
 * console.log(result); // Output: [1, 3, 6, 10]
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is processed once.
 * - Space Complexity: O(n), as the output array has the same length as the valid elements of the input array.
 */
function arrayCumsum(array) {
  return array.reduce((acc, value) => {
    const num = normalizeValues(value);
    if (num !== null) {
      const lastSum = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(lastSum + num);
    };
    return acc;
  }, []);
};
