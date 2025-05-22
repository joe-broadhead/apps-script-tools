/**
 * @function addValues
 * @description Adds two numeric values after normalizing them. If either value cannot be normalized to a valid number,
 *              the function returns `null`.
 * @param {*} numA - The first value to add (augend). It will be normalized before addition.
 * @param {*} numB - The second value to add (addend). It will be normalized before addition.
 * @returns {Number|Null} The sum of the two values (`numA + numB`), or `null` if either input cannot be normalized to a valid number.
 * @example
 * // Valid numeric inputs
 * console.log(addValues(10, 5)); // Output: 15
 *
 * // Non-numeric inputs
 * console.log(addValues("10", "5"));  // Output: 15
 * console.log(addValues("abc", 5));   // Output: null
 *
 * // Null or undefined inputs
 * console.log(addValues(null, 5));    // Output: null
 * console.log(addValues(10, undefined)); // Output: null
 *
 * // Boolean inputs
 * console.log(addValues(true, 2));  // Output: 3 (true normalized to 1)
 * console.log(addValues(false, 2)); // Output: 2 (false normalized to 0)
 *
 * @see normalizeValues
 * @note
 * - Time Complexity: O(1), as normalization and addition are constant-time operations.
 * - Space Complexity: O(1), as no additional data structures are used.
 */
function addValues(numA, numB) {
  const normalizedA = normalizeValues(numA);
  const normalizedB = normalizeValues(numB);

  if (normalizedA === null || normalizedB === null) return null;
  return normalizedA + normalizedB;
};
