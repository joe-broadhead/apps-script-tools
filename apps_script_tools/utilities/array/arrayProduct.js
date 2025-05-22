/**
 * @function arrayProduct
 * @description Computes the product of all numeric values in an array. The function normalizes values, ignoring
 *              `null`, `undefined`, and invalid values (normalized to `null`). Non-numeric values are skipped.
 * @param {Array} array - The input array containing numeric or mixed values.
 * @returns {Number} The product of all valid numeric values in the array. If no valid numbers are present, the result is `1`.
 * @example
 * const array = [1, 2, "3", null, "invalid"];
 * console.log(arrayProduct(array)); // Output: 6 (valid numbers are [1, 2, 3])
 *
 * const emptyArray = [];
 * console.log(arrayProduct(emptyArray)); // Output: 1
 * @see normalizeValues
 * @note
 * - Time Complexity: O(n), where `n` is the length of the input array. Each element is processed once.
 * - Space Complexity: O(1), as only a single variable is used to accumulate the product.
 */
function arrayProduct(array) {
  return array.reduce((product, value) => {
    const num = normalizeValues(value);
    if (num !== null) {
      return product * num;
    };
    return product;
  }, 1); // Initial value is 1 (neutral element for multiplication)
};
