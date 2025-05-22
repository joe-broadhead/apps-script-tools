/**
 * @function divideValues
 * @description Divides two numeric values after normalizing them. If either value cannot be normalized to a valid number,
 *              the function returns `null`. If the divisor is `0`, the function returns `Infinity`.
 * @param {*} numA - The numerator (dividend). It will be normalized before division.
 * @param {*} numB - The denominator (divisor). It will be normalized before division.
 * @returns {Number|Null} The result of the division (`numA / numB`), `Infinity` if `numB` is `0`, or `null` if either input cannot be normalized to a valid number.
 * @example
 * // Valid numeric inputs
 * console.log(divideValues(10, 5)); // Output: 2
 *
 * // Division by zero
 * console.log(divideValues(10, 0)); // Output: Infinity
 *
 * // Non-numeric inputs
 * console.log(divideValues("20", "4"));  // Output: 5
 * console.log(divideValues("abc", 5));   // Output: null
 *
 * // Null or undefined inputs
 * console.log(divideValues(null, 5));    // Output: null
 * console.log(divideValues(10, undefined)); // Output: null
 *
 * // Boolean inputs
 * console.log(divideValues(true, 2));  // Output: 0.5 (true normalized to 1)
 * console.log(divideValues(false, 2)); // Output: 0 (false normalized to 0)
 *
 * @see normalizeValues
 * @note
 * - Time Complexity: O(1), as normalization and division are constant-time operations.
 * - Space Complexity: O(1), as no additional data structures are used.
 */
function divideValues(numA, numB) {
  const normalizedA = normalizeValues(numA);
  const normalizedB = normalizeValues(numB);

  if (normalizedA === null || normalizedB === null) return null;
  return normalizedB === 0 ? Infinity : normalizedA / normalizedB;
};
