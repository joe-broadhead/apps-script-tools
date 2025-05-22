/**
 * @function subtractValues
 * @description Subtracts two numeric values after normalizing them. If either value cannot be normalized to a valid number,
 *              the function returns `null`.
 * @param {*} numA - The first value to subtract (minuend). It will be normalized before subtraction.
 * @param {*} numB - The second value to subtract (subtrahend). It will be normalized before subtraction.
 * @returns {Number|Null} The result of the subtraction (`numA - numB`), or `null` if either input cannot be normalized to a valid number.
 * @example
 * // Valid numeric inputs
 * console.log(subtractValues(10, 5)); // Output: 5
 *
 * // Non-numeric inputs
 * console.log(subtractValues("20", "5")); // Output: 15
 * console.log(subtractValues("abc", 5));  // Output: null
 *
 * // Null or undefined inputs
 * console.log(subtractValues(null, 5));  // Output: null
 * console.log(subtractValues(10, undefined)); // Output: null
 *
 * @see normalizeValues
 * @note
 * - Time Complexity: O(1), as normalization and subtraction are constant-time operations.
 * - Space Complexity: O(1), as no additional data structures are used.
 */
function subtractValues(numA, numB) {
  const normalizedA = normalizeValues(numA);
  const normalizedB = normalizeValues(numB);

  if (normalizedA === null || normalizedB === null) return null;
  return normalizedA - normalizedB;
};
