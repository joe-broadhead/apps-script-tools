/**
 * @function multiplyValues
 * @description Multiplies two numeric values after normalizing them. If either value cannot be normalized to a valid number,
 *              the function returns `null`.
 * @param {*} numA - The first value to multiply (multiplicand). It will be normalized before multiplication.
 * @param {*} numB - The second value to multiply (multiplier). It will be normalized before multiplication.
 * @returns {Number|Null} The product of the two values (`numA * numB`), or `null` if either input cannot be normalized to a valid number.
 * @example
 * // Valid numeric inputs
 * console.log(multiplyValues(10, 5)); // Output: 50
 *
 * // Non-numeric inputs
 * console.log(multiplyValues("2", "3")); // Output: 6
 * console.log(multiplyValues("abc", 5)); // Output: null
 *
 * // Null or undefined inputs
 * console.log(multiplyValues(null, 5)); // Output: null
 * console.log(multiplyValues(10, undefined)); // Output: null
 *
 * // Boolean inputs
 * console.log(multiplyValues(true, 5));  // Output: 5 (true normalized to 1)
 * console.log(multiplyValues(false, 5)); // Output: 0 (false normalized to 0)
 *
 * @see normalizeValues
 * @note
 * - Time Complexity: O(1), as normalization and multiplication are constant-time operations.
 * - Space Complexity: O(1), as no additional data structures are used.
 */
function multiplyValues(numA, numB) {
  const normalizedA = normalizeValues(numA);
  const normalizedB = normalizeValues(numB);

  if (normalizedA === null || normalizedB === null) return null;
  return normalizedA * normalizedB;
};
