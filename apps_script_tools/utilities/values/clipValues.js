/**
 * @function clipValues
 * @description Restricts a numeric value within a specified range defined by lower and upper bounds. If the value cannot 
 *              be normalized to a valid number, the function defaults to the lower bound. If the bounds are invalid, 
 *              they default to `-Infinity` (lower) and `Infinity` (upper).
 * @param {*} value - The input value to clip. It will be normalized before applying the bounds.
 * @param {Number} [lower = -Infinity] - The lower bound for the clipping. Defaults to `-Infinity` if not provided or invalid.
 * @param {Number} [upper = Infinity] - The upper bound for the clipping. Defaults to `Infinity` if not provided or invalid.
 * @returns {Number} The clipped value within the range `[lower, upper]`, or the lower bound if the input is not a valid number.
 * @example
 * // Clipping within a range
 * console.log(clipValues(10, 0, 5)); // Output: 5
 * console.log(clipValues(-5, 0, 5)); // Output: 0
 *
 * // Handling invalid bounds
 * console.log(clipValues(10, "invalid", 5));  // Output: 5 (lower defaults to -Infinity)
 * console.log(clipValues(10, 0, "invalid"));  // Output: 10 (upper defaults to Infinity)
 *
 * // Non-numeric or null-like inputs
 * console.log(clipValues(null, 0, 5));        // Output: 0
 * console.log(clipValues("abc", 0, 5));       // Output: 0
 *
 * // Edge cases with Infinity
 * console.log(clipValues(100, -Infinity, Infinity)); // Output: 100
 * console.log(clipValues(100, Infinity, -Infinity)); // Output: -Infinity (invalid bounds reset to defaults)
 *
 * @see normalizeValues
 * @note
 * - Time Complexity: O(1), as normalization and range checks are constant-time operations.
 * - Space Complexity: O(1), as no additional data structures are used.
 */
function clipValues(value, lower = -Infinity, upper = Infinity) {
  const num = normalizeValues(value);
  
  // Ensure lower and upper are valid numbers or set them to -Infinity/Infinity
  lower = typeof lower === 'number' && !isNaN(lower) ? lower : -Infinity;
  upper = typeof upper === 'number' && !isNaN(upper) ? upper : Infinity;

  return num !== null ? Math.min(Math.max(num, lower), upper) : lower;
};
